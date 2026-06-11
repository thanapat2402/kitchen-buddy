// Kitchen Buddy: line-auth edge function
//
// The auth bridge (highest-risk component per the board's decision record).
// Flow:
//   1. Frontend (LIFF) calls liff.getIDToken() and POSTs { id_token } here.
//   2. We verify the id_token with LINE's /oauth2/v2.1/verify endpoint,
//      which confirms it was issued by *our* LINE Login channel (client_id
//      check) and gives us the LINE user id (`sub`) + profile fields.
//   3. We upsert app_users (line_user_id -> stable uuid) using the
//      service-role client. service-role is required here because this
//      table has no INSERT policy for `authenticated` (app_users rows must
//      only ever be created by this trusted bridge, never directly by a
//      client) — see migration 20260611120000.
//   4. On first login we auto-provision a household + owner membership
//      (product rule: zero-friction onboarding, multi-member households
//      supported from day 1 but invite flow is deferred).
//   5. We mint an HS256 Supabase access token with `sub` = our app_users.id
//      and `role: authenticated`, and return it. The frontend then creates
//      a supabase-js client with this token so `auth.uid()` = app_users.id
//      inside RLS policies.
//
// NOTE on "third-party JWT" alternatives: newer Supabase projects support
// configuring a third-party OIDC provider (e.g. "Custom" / generic OIDC) so
// Supabase Auth itself verifies tokens from an external issuer without you
// minting HS256 tokens by hand. That path is cleaner long-term but requires
// dashboard configuration that varies by Supabase project generation and
// isn't guaranteed available on every plan/region as of writing. We use the
// HS256-minting approach below because it works on any Supabase project
// today. See SETUP.md for notes on migrating to third-party JWT later.

import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders, handleOptions } from "../_shared/cors.ts";
import { signSupabaseJwt } from "../_shared/jwt.ts";

const LINE_VERIFY_URL = "https://api.line.me/oauth2/v2.1/verify";

interface LineVerifyResponse {
  iss: string;
  sub: string; // LINE user id
  aud: string; // our channel id
  exp: number;
  iat: number;
  name?: string;
  picture?: string;
}

Deno.serve(async (req: Request) => {
  const optionsResponse = handleOptions(req);
  if (optionsResponse) return optionsResponse;

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  let body: { id_token?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const idToken = body.id_token;
  if (!idToken || typeof idToken !== "string") {
    return jsonResponse({ error: "Missing id_token" }, 400);
  }

  const lineChannelId = Deno.env.get("LINE_CHANNEL_ID");
  // SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are auto-injected by the
  // Supabase platform (and by `supabase functions serve`) for every edge
  // function -- do not set these yourself via `supabase secrets set`. The
  // JWT signing secret, however, is NOT auto-injected and must be set
  // manually as SB_JWT_SECRET (the "SUPABASE_" prefix is reserved by the
  // platform and `supabase secrets set` rejects it). See SETUP.md.
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const jwtSecret = Deno.env.get("SB_JWT_SECRET");

  if (!lineChannelId || !supabaseUrl || !serviceRoleKey || !jwtSecret) {
    console.error("line-auth: missing required environment variables");
    return jsonResponse({ error: "Server misconfigured" }, 500);
  }

  // 1. Verify the id_token with LINE.
  let lineProfile: LineVerifyResponse;
  try {
    const verifyResp = await fetch(LINE_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        id_token: idToken,
        client_id: lineChannelId,
      }),
    });

    if (!verifyResp.ok) {
      // LINE returns 400 with { error, error_description } for bad/expired
      // tokens. Don't leak that body to the client.
      console.error(
        "line-auth: LINE verify failed",
        verifyResp.status,
        await verifyResp.text(),
      );
      return jsonResponse({ error: "Invalid LINE id_token" }, 401);
    }

    lineProfile = await verifyResp.json();
  } catch (err) {
    console.error("line-auth: error calling LINE verify", err);
    return jsonResponse({ error: "Could not verify id_token" }, 502);
  }

  if (!lineProfile.sub) {
    return jsonResponse({ error: "Invalid LINE id_token" }, 401);
  }

  // service-role client: bypasses RLS. Required for the app_users upsert
  // (no client-writable insert policy exists on purpose) and for
  // auto-provisioning households/memberships on first login.
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 2. Upsert app_users by line_user_id.
  const { data: existingUser, error: selectError } = await admin
    .from("app_users")
    .select("id")
    .eq("line_user_id", lineProfile.sub)
    .maybeSingle();

  if (selectError) {
    console.error("line-auth: app_users lookup failed", selectError);
    return jsonResponse({ error: "Internal error" }, 500);
  }

  let appUserId: string;
  let isNewUser = false;

  if (existingUser) {
    appUserId = existingUser.id;

    // Keep profile fields fresh (display name / picture can change in LINE).
    const { error: updateError } = await admin
      .from("app_users")
      .update({
        display_name: lineProfile.name ?? null,
        picture_url: lineProfile.picture ?? null,
      })
      .eq("id", appUserId);

    if (updateError) {
      // Non-fatal: profile refresh failing shouldn't block login.
      console.error("line-auth: app_users profile refresh failed", updateError);
    }
  } else {
    isNewUser = true;

    const { data: insertedUser, error: insertError } = await admin
      .from("app_users")
      .insert({
        line_user_id: lineProfile.sub,
        display_name: lineProfile.name ?? null,
        picture_url: lineProfile.picture ?? null,
      })
      .select("id")
      .single();

    if (insertError || !insertedUser) {
      console.error("line-auth: app_users insert failed", insertError);
      return jsonResponse({ error: "Internal error" }, 500);
    }

    appUserId = insertedUser.id;
  }

  // 3. Auto-provision a household + owner membership for brand-new users.
  if (isNewUser) {
    const { data: household, error: householdError } = await admin
      .from("households")
      .insert({
        name: "บ้านของฉัน",
        created_by: appUserId,
      })
      .select("id")
      .single();

    if (householdError || !household) {
      console.error("line-auth: household creation failed", householdError);
      return jsonResponse({ error: "Internal error" }, 500);
    }

    const { error: memberError } = await admin
      .from("household_members")
      .insert({
        household_id: household.id,
        user_id: appUserId,
        role: "owner",
      });

    if (memberError) {
      console.error("line-auth: household_members insert failed", memberError);
      return jsonResponse({ error: "Internal error" }, 500);
    }
  }

  // 4. Mint a Supabase-compatible access token.
  const accessToken = await signSupabaseJwt(
    {
      sub: appUserId,
      role: "authenticated",
      line_user_id: lineProfile.sub,
    },
    jwtSecret,
    60 * 60, // 1 hour; frontend should re-call line-auth (cheap: liff.getIDToken() is local) to refresh
  );

  return jsonResponse({
    access_token: accessToken,
    token_type: "bearer",
    expires_in: 60 * 60,
    user: {
      id: appUserId,
      line_user_id: lineProfile.sub,
      display_name: lineProfile.name ?? null,
      picture_url: lineProfile.picture ?? null,
      is_new_user: isNewUser,
    },
  });
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
