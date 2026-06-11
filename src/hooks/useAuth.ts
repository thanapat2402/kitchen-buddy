import { useContext } from 'react';
import { AuthContext } from '../lib/authContext';
import type { AuthState } from '../types/auth';

/**
 * Access the current auth state.
 *
 * - In mock mode (`VITE_LIFF_ID` unset): returns a fake "คุณกอล์ฟ" user,
 *   `idToken: null`, `isMock: true`. No LIFF SDK calls are made.
 * - In LIFF mode: `liff.init()` runs, login is required, and the
 *   resolved profile + id_token are exposed once ready.
 */
export function useAuth(): AuthState {
  return useContext(AuthContext);
}
