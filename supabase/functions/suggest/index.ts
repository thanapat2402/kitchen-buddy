// Kitchen Buddy: suggest edge function
//
// "คืนนี้ทำอะไรดี" — returns 2-3 AI-generated recipe suggestions for the
// caller's household, prioritizing soonest-to-expire ingredients.
//
// POST { force_refresh?: boolean }
// Auth: Authorization: Bearer <JWT minted by line-auth>
//
// Flow:
//   1. Verify the HS256 JWT ourselves (SB_JWT_SECRET) -> claims.sub =
//      app_users.id. We do NOT rely on the platform's gateway JWT
//      verification (the project's anon/service keys are signed with a
//      *different* secret than our hand-minted user tokens), so this
//      function must be deployed with --no-verify-jwt and do its own check.
//   2. Resolve the caller's household via household_members (service-role
//      client, since RLS would otherwise require an authenticated
//      supabase-js client built from the same JWT -- service-role is
//      simpler here and this function already trusts its own JWT check).
//   3. Load active pantry_items, compute pantry_hash, check ai_suggestions
//      cache (fresh < 24h), else call Gemini once (shared with the
//      nightly precompute in daily-digest via _shared/suggestionEngine.ts).

import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders, handleOptions } from "../_shared/cors.ts";
import { verifySupabaseJwt } from "../_shared/jwt.ts";
import {
  getLlmConfig,
  getOrGenerateSuggestions,
  SuggestionEngineError,
  todayDateString,
} from "../_shared/suggestionEngine.ts";

Deno.serve(async (req: Request) => {
  const optionsResponse = handleOptions(req);
  if (optionsResponse) return optionsResponse;

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const jwtSecret = Deno.env.get("SB_JWT_SECRET");

  if (!supabaseUrl || !serviceRoleKey || !jwtSecret) {
    console.error("suggest: missing required environment variables");
    return jsonResponse({ error: "Server misconfigured" }, 500);
  }

  // 1. Verify the caller's JWT ourselves.
  const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization");
  const token = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];

  if (!token) {
    return jsonResponse({ error: "Missing or invalid Authorization header" }, 401);
  }

  const claims = await verifySupabaseJwt(token, jwtSecret);
  if (!claims) {
    return jsonResponse({ error: "Invalid or expired token" }, 401);
  }

  const appUserId = claims.sub;

  // 2. Parse body (optional).
  let forceRefresh = false;
  if (req.headers.get("Content-Length") !== "0") {
    try {
      const text = await req.text();
      if (text.trim().length > 0) {
        const body = JSON.parse(text);
        if (typeof body?.force_refresh === "boolean") {
          forceRefresh = body.force_refresh;
        }
      }
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 3. Resolve household for this user. Personal-scale assumption: a user
  // belongs to exactly one household (auto-provisioned by line-auth); if
  // somehow a member of multiple, use the first (oldest) membership.
  const { data: membership, error: membershipError } = await admin
    .from("household_members")
    .select("household_id")
    .eq("user_id", appUserId)
    .order("joined_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    console.error("suggest: household_members lookup failed", membershipError);
    return jsonResponse({ error: "Internal error" }, 500);
  }

  if (!membership) {
    // Authenticated but not (yet) a member of any household. Treat as an
    // empty pantry rather than an error.
    return jsonResponse({
      suggestions: [],
      cached: false,
      generated_at: new Date().toISOString(),
    });
  }

  const householdId = membership.household_id as string;

  // 4. Get-or-generate suggestions.
  try {
    const result = await getOrGenerateSuggestions(admin, householdId, todayDateString(), {
      forceRefresh,
      llm: getLlmConfig(),
    });

    return jsonResponse(result);
  } catch (err) {
    if (err instanceof SuggestionEngineError) {
      console.error("suggest: suggestion engine error", err.message, err.cause);
      return jsonResponse({ error: "Could not generate suggestions" }, 502);
    }

    console.error("suggest: unexpected error", err);
    return jsonResponse({ error: "Internal error" }, 500);
  }
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
