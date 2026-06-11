import type { UserProfile } from './pantry';

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
}
