// Kitchen Buddy: daily-digest edge function
//
// Runs once per day (~17:00 Asia/Bangkok, see migration
// 20260611120400_daily_digest_schedule.sql / SETUP.md for the pg_cron job).
//
// For each household with pantry items expiring within 3 days, send ONE
// LINE push per member listing those items in Thai. Households with nothing
// expiring get no message at all (CLAUDE.md: "ONE digest per user per day,
// sent only on days something is near expiry. Never per-item pushes." —
// this is what keeps the LINE OA free quota at ฿0).
//
// Dedupe: notification_log has a unique (user_id, kind, sent_date)
// constraint (migration 20260611120300). We check-then-insert per user; the
// unique constraint is the final backstop if this function is ever invoked
// twice in one day.

import { createClient } from "jsr:@supabase/supabase-js@2";

const LINE_PUSH_URL = "https://api.line.me/v2/bot/message/push";

interface PantryItemRow {
  id: string;
  household_id: string;
  expiry_date: string;
  qty_state: "full" | "half" | "out";
  catalog_item_id: string | null;
  free_text_name: string | null;
  catalog_items: { name_th: string } | null;
}

interface MemberRow {
  household_id: string;
  user_id: string;
  app_users: { line_user_id: string } | null;
}

const QTY_LABEL: Record<PantryItemRow["qty_state"], string> = {
  full: "เหลือเยอะ",
  half: "เหลือครึ่ง",
  out: "ใกล้หมด",
};

Deno.serve(async (req: Request) => {
  // Allow manual invocation (e.g. for testing) but cron calls POST with no
  // body, so don't require any particular method/body shape.
  if (req.method !== "POST" && req.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const lineAccessToken = Deno.env.get("LINE_MESSAGING_ACCESS_TOKEN");

  if (!supabaseUrl || !serviceRoleKey || !lineAccessToken) {
    console.error("daily-digest: missing required environment variables");
    return jsonResponse({ error: "Server misconfigured" }, 500);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const today = new Date();
  const todayStr = formatDate(today);
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() + 3);
  const cutoffStr = formatDate(cutoff);

  // 1. Active pantry items expiring within the next 3 days (inclusive),
  // including already-overdue items that haven't been marked expired yet.
  const { data: pantryItems, error: pantryError } = await admin
    .from("pantry_items")
    .select(
      "id, household_id, expiry_date, qty_state, catalog_item_id, free_text_name, catalog_items(name_th)",
    )
    .eq("status", "active")
    .not("expiry_date", "is", null)
    .lte("expiry_date", cutoffStr)
    .order("expiry_date", { ascending: true });

  if (pantryError) {
    console.error("daily-digest: failed to load pantry_items", pantryError);
    return jsonResponse({ error: "Internal error" }, 500);
  }

  const items = (pantryItems ?? []) as unknown as PantryItemRow[];

  if (items.length === 0) {
    return jsonResponse({ sent: 0, reason: "nothing expiring" });
  }

  // 2. Group by household.
  const byHousehold = new Map<string, PantryItemRow[]>();
  for (const item of items) {
    const list = byHousehold.get(item.household_id) ?? [];
    list.push(item);
    byHousehold.set(item.household_id, list);
  }

  const householdIds = [...byHousehold.keys()];

  // 3. Members of those households (with their LINE user ids).
  const { data: members, error: membersError } = await admin
    .from("household_members")
    .select("household_id, user_id, app_users(line_user_id)")
    .in("household_id", householdIds);

  if (membersError) {
    console.error("daily-digest: failed to load household_members", membersError);
    return jsonResponse({ error: "Internal error" }, 500);
  }

  let sent = 0;
  let failed = 0;
  let skippedDuplicate = 0;

  for (const member of (members ?? []) as unknown as MemberRow[]) {
    const householdItems = byHousehold.get(member.household_id);
    if (!householdItems || householdItems.length === 0) continue;

    const lineUserId = member.app_users?.line_user_id;
    if (!lineUserId) {
      console.error(
        "daily-digest: member has no app_users.line_user_id",
        member,
      );
      continue;
    }

    // Dedupe check: has this user already received today's digest?
    const { data: existingLog, error: logCheckError } = await admin
      .from("notification_log")
      .select("id")
      .eq("user_id", member.user_id)
      .eq("kind", "daily_digest")
      .eq("sent_date", todayStr)
      .maybeSingle();

    if (logCheckError) {
      console.error("daily-digest: notification_log check failed", logCheckError);
      continue;
    }

    if (existingLog) {
      skippedDuplicate++;
      continue;
    }

    const message = buildDigestMessage(householdItems, todayStr);

    try {
      const pushResp = await fetch(LINE_PUSH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${lineAccessToken}`,
        },
        body: JSON.stringify({
          to: lineUserId,
          messages: [{ type: "text", text: message }],
        }),
      });

      if (pushResp.ok) {
        sent++;
        await admin.from("notification_log").insert({
          household_id: member.household_id,
          user_id: member.user_id,
          kind: "daily_digest",
          sent_date: todayStr,
          status: "sent",
          item_count: householdItems.length,
        });
      } else {
        failed++;
        const errBody = await pushResp.text();
        console.error("daily-digest: LINE push failed", pushResp.status, errBody);
        await admin.from("notification_log").insert({
          household_id: member.household_id,
          user_id: member.user_id,
          kind: "daily_digest",
          sent_date: todayStr,
          status: "failed",
          item_count: householdItems.length,
          error_message: `LINE push ${pushResp.status}: ${errBody.slice(0, 500)}`,
        });
      }
    } catch (err) {
      failed++;
      console.error("daily-digest: error sending LINE push", err);
      await admin.from("notification_log").insert({
        household_id: member.household_id,
        user_id: member.user_id,
        kind: "daily_digest",
        sent_date: todayStr,
        status: "failed",
        item_count: householdItems.length,
        error_message: String(err).slice(0, 500),
      });
    }
  }

  return jsonResponse({ sent, failed, skippedDuplicate, households: householdIds.length });
});

function buildDigestMessage(items: PantryItemRow[], todayStr: string): string {
  const lines: string[] = ["วัตถุดิบใกล้หมดอายุ 🍳"];

  for (const item of items) {
    const name = item.catalog_items?.name_th ?? item.free_text_name ?? "ไม่ทราบชื่อ";
    const qtyLabel = QTY_LABEL[item.qty_state];
    const dayLabel = expiryLabel(item.expiry_date, todayStr);
    lines.push(`• ${name} (${qtyLabel}) — ${dayLabel}`);
  }

  lines.push("");
  lines.push("เปิดแอปเพื่อดูเมนูแนะนำจากของที่ใกล้หมดอายุ");

  return lines.join("\n");
}

function expiryLabel(expiryDate: string, todayStr: string): string {
  const diffDays = Math.round(
    (Date.parse(expiryDate) - Date.parse(todayStr)) / (1000 * 60 * 60 * 24),
  );

  if (diffDays < 0) return `หมดอายุแล้ว ${Math.abs(diffDays)} วัน`;
  if (diffDays === 0) return "หมดอายุวันนี้";
  if (diffDays === 1) return "หมดอายุพรุ่งนี้";
  return `เหลืออีก ${diffDays} วัน`;
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
