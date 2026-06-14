import { createContext } from 'react';
import type { AuthState } from '../types/auth';

// Bare nickname — the header greeting composes "สวัสดี คุณ{displayName}",
// matching real LINE display names which carry no honorific.
export const MOCK_USER_DISPLAY_NAME = 'กอล์ฟ';

export const initialAuthState: AuthState = {
  user: null,
  idToken: null,
  isMock: !import.meta.env.VITE_LIFF_ID,
  isLoading: true,
  error: null,
  session: null,
  refreshSession: async () => null,
};

export const AuthContext = createContext<AuthState>(initialAuthState);
