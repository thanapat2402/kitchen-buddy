import { useMemo, type ReactNode } from 'react';
import { useAuth } from './useAuth';
import { RepoContext, defaultRepo } from '../lib/repoContext';
import { hasSupabaseConfig } from '../lib/supabaseClient';
import { SupabasePantryRepo } from '../repo/SupabasePantryRepo';
import type { PantryRepo } from '../repo/PantryRepo';

interface RepoProviderProps {
  children: ReactNode;
}

/**
 * Selects the active {@link PantryRepo} implementation:
 *
 * - `MockPantryRepo` (the shared `defaultRepo` singleton) when running in
 *   mock mode OR when `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` are not
 *   configured. This keeps mock mode byte-for-byte the default zero-env dev
 *   experience (same in-memory state across re-renders).
 * - `SupabasePantryRepo` when real LIFF auth has produced a Supabase
 *   session AND Supabase env vars are set. Recreated whenever the access
 *   token changes (e.g. after `refreshSession()`).
 *
 * Must be rendered inside `AuthProvider`.
 */
export function RepoProvider({ children }: RepoProviderProps) {
  const { isMock, session, refreshSession } = useAuth();

  const repo = useMemo<PantryRepo>(() => {
    if (isMock || !hasSupabaseConfig || !session) {
      return defaultRepo;
    }
    return new SupabasePantryRepo(session, refreshSession);
    // Recreate only when the token itself changes — refreshSession is a
    // stable useCallback from AuthProvider.
  }, [isMock, session, refreshSession]);

  return <RepoContext.Provider value={repo}>{children}</RepoContext.Provider>;
}
