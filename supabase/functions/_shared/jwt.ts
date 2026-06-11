// Minimal dependency-free HS256 JWT signer using Deno's built-in Web Crypto
// (SubtleCrypto). We avoid third-party JWT libs (e.g. deno.land/x/djwt) so
// this function has zero external imports and nothing to break on a
// registry outage.
//
// This mints a Supabase-compatible access token: HS256, signed with the
// project's SUPABASE_JWT_SECRET, `sub` = our app_users.id (uuid),
// `role: "authenticated"`. supabase-js / PostgREST verify this signature
// and expose `auth.uid()` = sub inside RLS policies.

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function encodeJson(obj: unknown): string {
  return base64UrlEncode(new TextEncoder().encode(JSON.stringify(obj)));
}

export interface SupabaseJwtClaims {
  sub: string;
  role: "authenticated";
  aud?: string;
  /** LINE user id, exposed for convenience (e.g. debugging). Not security-sensitive. */
  line_user_id?: string;
  [key: string]: unknown;
}

/**
 * Sign a Supabase-compatible HS256 access token.
 *
 * @param claims  must include `sub` (app_users.id) and `role`.
 * @param secret  SUPABASE_JWT_SECRET from the project's API settings.
 * @param expiresInSeconds  token lifetime, default 1 hour.
 */
export async function signSupabaseJwt(
  claims: SupabaseJwtClaims,
  secret: string,
  expiresInSeconds = 60 * 60,
): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: "authenticated",
    iat: now,
    exp: now + expiresInSeconds,
    ...claims,
  };

  const encodedHeader = encodeJson(header);
  const encodedPayload = encodeJson(payload);
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(signingInput),
  );

  const encodedSignature = base64UrlEncode(new Uint8Array(signature));
  return `${signingInput}.${encodedSignature}`;
}
