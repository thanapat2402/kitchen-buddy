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

function base64UrlDecode(input: string): Uint8Array {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const binary = atob(padded + padding);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
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

/**
 * Verify an HS256 Supabase-compatible access token minted by
 * {@link signSupabaseJwt} (or by Supabase Auth itself, which also uses
 * HS256 + the project JWT secret).
 *
 * Checks the header alg, the HMAC-SHA256 signature, and the `exp` claim.
 * Returns the decoded claims on success, or `null` if the token is
 * malformed, has a bad signature, or is expired. Never throws on untrusted
 * input — callers should treat `null` as "401 Unauthorized".
 *
 * @param token   the raw `Authorization: Bearer <token>` value (no "Bearer " prefix)
 * @param secret  the project's JWT secret (SB_JWT_SECRET)
 */
export async function verifySupabaseJwt(
  token: string,
  secret: string,
): Promise<SupabaseJwtClaims | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [encodedHeader, encodedPayload, encodedSignature] = parts;

  let header: { alg?: string };
  let payload: SupabaseJwtClaims & { exp?: number };
  try {
    header = JSON.parse(new TextDecoder().decode(base64UrlDecode(encodedHeader)));
    payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(encodedPayload)));
  } catch {
    return null;
  }

  if (header.alg !== "HS256") return null;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );

  let signatureValid: boolean;
  try {
    signatureValid = await crypto.subtle.verify(
      "HMAC",
      key,
      base64UrlDecode(encodedSignature),
      new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`),
    );
  } catch {
    return null;
  }

  if (!signatureValid) return null;

  if (typeof payload.exp === "number") {
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) return null;
  }

  if (!payload.sub || typeof payload.sub !== "string") return null;

  return payload;
}
