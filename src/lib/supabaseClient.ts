import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** True iff both Supabase env vars are configured (real-backend mode is possible). */
export const hasSupabaseConfig = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/**
 * Create a supabase-js client authenticated as a specific app user.
 *
 * - `apikey` is always the project's anon key (required by PostgREST/Edge
 *   Functions routing even when the request is otherwise authenticated).
 * - `Authorization: Bearer <accessToken>` is the HS256 JWT minted by the
 *   `line-auth` edge function (see `src/services/authService.ts`) — this is
 *   what `auth.uid()` resolves to inside RLS policies.
 *
 * Session persistence/auto-refresh are disabled: token lifecycle is owned
 * by `AuthProvider.refreshSession()` (re-exchanging the LINE id_token),
 * not by supabase-js's own auth client.
 */
export function createAuthedClient(accessToken: string): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase env vars are not configured');
  }

  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}
