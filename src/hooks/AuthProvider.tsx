import { useEffect, useState, type ReactNode } from 'react';
import liff from '@line/liff';
import { AuthContext, MOCK_USER_DISPLAY_NAME } from '../lib/authContext';
import type { AuthState } from '../types/auth';

interface AuthProviderProps {
  children: ReactNode;
}

const LIFF_ID = import.meta.env.VITE_LIFF_ID as string | undefined;

/**
 * Bootstraps auth on mount.
 *
 * Mock mode (no VITE_LIFF_ID): immediately resolves a fake "คุณกอล์ฟ"
 * user so the app is fully usable in a plain browser — this is the
 * default dev experience.
 *
 * LIFF mode: calls `liff.init`, requires login (redirects to LINE login
 * if not already logged in), then exposes the profile + id_token.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    user: null,
    idToken: null,
    isMock: !LIFF_ID,
    isLoading: true,
    error: null,
  });

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
            error: null,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setState({
            user: null,
            idToken: null,
            isMock: false,
            isLoading: false,
            error: err instanceof Error ? err.message : 'LIFF initialization failed',
          });
        }
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}
