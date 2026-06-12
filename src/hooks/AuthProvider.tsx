import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import liff from '@line/liff';
import { AuthContext, MOCK_USER_DISPLAY_NAME } from '../lib/authContext';
import { exchangeLineIdToken } from '../services/authService';
import type { AuthState, SupabaseSession } from '../types/auth';

interface AuthProviderProps {
  children: ReactNode;
}

const LIFF_ID = import.meta.env.VITE_LIFF_ID as string | undefined;

/** Re-exchange a bit before the 1h token actually expires. */
const SESSION_REFRESH_SLACK_MS = 60_000;

/**
 * Bootstraps auth on mount.
 *
 * Mock mode (no VITE_LIFF_ID): immediately resolves a fake "คุณกอล์ฟ"
 * user so the app is fully usable in a plain browser — this is the
 * default dev experience. `session` stays null and `refreshSession` is a
 * no-op.
 *
 * LIFF mode: calls `liff.init`, requires login (redirects to LINE login
 * if not already logged in), exposes the profile + id_token, and exchanges
 * the id_token for a Supabase-compatible access token via the `line-auth`
 * edge function (see `src/services/authService.ts`). `refreshSession` lets
 * `SupabasePantryRepo` re-exchange on expiry / 401 — `liff.getIDToken()` is
 * local/cheap so this is safe to call often.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    user: null,
    idToken: null,
    isMock: !LIFF_ID,
    isLoading: true,
    error: null,
    session: null,
    refreshSession: async () => null,
  });

  // Avoid overlapping exchanges if multiple repo calls 401 around the same time.
  const exchangeInFlight = useRef<Promise<SupabaseSession | null> | null>(null);

  const refreshSession = useCallback(async (): Promise<SupabaseSession | null> => {
    if (!LIFF_ID) return null;

    if (exchangeInFlight.current) {
      return exchangeInFlight.current;
    }

    const run = (async (): Promise<SupabaseSession | null> => {
      try {
        const idToken = liff.getIDToken();
        if (!idToken) {
          throw new Error('ไม่พบ LINE id_token');
        }
        const result = await exchangeLineIdToken(idToken);
        const session: SupabaseSession = {
          accessToken: result.access_token,
          expiresAt: Date.now() + result.expires_in * 1000 - SESSION_REFRESH_SLACK_MS,
          appUserId: result.user.id,
        };
        setState((prev) => ({ ...prev, idToken, session, error: null }));
        return session;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'แลกเปลี่ยนโทเคนไม่สำเร็จ';
        setState((prev) => ({ ...prev, session: null, error: message }));
        return null;
      } finally {
        exchangeInFlight.current = null;
      }
    })();

    exchangeInFlight.current = run;
    return run;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      if (!LIFF_ID) {
        // Mock mode — fake user, no LIFF calls, instant resolve.
        if (!cancelled) {
          setState({
            user: {
              userId: 'mock-user-golf',
              displayName: MOCK_USER_DISPLAY_NAME,
              pictureUrl: undefined,
            },
            idToken: null,
            isMock: true,
            isLoading: false,
            error: null,
            session: null,
            refreshSession: async () => null,
          });
        }
        return;
      }

      try {
        await liff.init({ liffId: LIFF_ID });

        if (!liff.isLoggedIn()) {
          liff.login();
          return; // login() redirects away; nothing more to do here.
        }

        const profile = await liff.getProfile();
        const idToken = liff.getIDToken();

        if (cancelled) return;

        // Exchange the id_token for a Supabase access token up front so the
        // repo has a valid session as soon as the app shell renders.
        let session: SupabaseSession | null = null;
        let exchangeError: string | null = null;
        if (idToken) {
          try {
            const result = await exchangeLineIdToken(idToken);
            session = {
              accessToken: result.access_token,
              expiresAt: Date.now() + result.expires_in * 1000 - SESSION_REFRESH_SLACK_MS,
              appUserId: result.user.id,
            };
          } catch (err) {
            exchangeError = err instanceof Error ? err.message : 'แลกเปลี่ยนโทเคนไม่สำเร็จ';
          }
        }

        if (!cancelled) {
          setState({
            user: {
              userId: profile.userId,
              displayName: profile.displayName,
              pictureUrl: profile.pictureUrl,
            },
            idToken: idToken ?? null,
            isMock: false,
            isLoading: false,
            // Don't block the whole app shell on the auth-exchange error —
            // surface it via `error` only if login itself is unusable
            // (no idToken at all). Otherwise the repo will retry via
            // `refreshSession` and surface its own friendly error states.
            error: idToken ? null : exchangeError,
            session,
            refreshSession,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            user: null,
            idToken: null,
            isMock: false,
            isLoading: false,
            error: err instanceof Error ? err.message : 'LIFF initialization failed',
            session: null,
          }));
        }
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [refreshSession]);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}
