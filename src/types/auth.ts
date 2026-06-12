import type { UserProfile } from './pantry';

/**
 * A minted Supabase access token + bookkeeping needed to refresh it.
 * Produced by exchanging the LINE `id_token` with the `line-auth` edge
 * function. Null in mock mode.
 */
export interface SupabaseSession {
  /** Supabase-compatible JWT (HS256, `sub` = app_users.id). */
  accessToken: string;
  /** Epoch ms when this token should be considered stale and re-exchanged. */
  expiresAt: number;
  /** app_users.id == auth.uid() inside RLS policies. */
  appUserId: string;
}

/** Shape returned by `useAuth()`. */
export interface AuthState {
  /** Resolved user profile — present once loading completes successfully. */
  user: UserProfile | null;
  /** LINE id_token, used by the backend to mint a Supabase JWT. Null in mock mode. */
  idToken: string | null;
  /** True when no VITE_LIFF_ID is configured — app runs with a fake user, no LIFF calls. */
  isMock: boolean;
  /** True while liff.init()/login is in progress. */
  isLoading: boolean;
  /** Set if LIFF init or login failed. */
  error: string | null;
  /**
   * Current Supabase session (access token from the line-auth exchange).
   * Null in mock mode or if the exchange hasn't completed/failed.
   */
  session: SupabaseSession | null;
  /**
   * Re-runs the LINE id_token -> Supabase JWT exchange (e.g. on 401 or
   * expiry) and returns the fresh access token. No-op (resolves null) in
   * mock mode. `liff.getIDToken()` is local/cheap, so this is safe to call
   * whenever a request needs a fresh token.
   */
  refreshSession: () => Promise<SupabaseSession | null>;
}
