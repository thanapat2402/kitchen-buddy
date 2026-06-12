/**
 * Service layer for the LINE id_token -> Supabase JWT exchange.
 *
 * Hits the `line-auth` edge function (see `supabase/functions/line-auth`).
 * The frontend never talks to LINE's verify endpoint directly — this is
 * the only client of that contract.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;

export interface LineAuthUser {
  id: string;
  line_user_id: string;
  display_name: string | null;
  picture_url: string | null;
  is_new_user: boolean;
}

export interface LineAuthResponse {
  access_token: string;
  token_type: string;
  /** Seconds until expiry (currently always 3600 = 1 hour). */
  expires_in: number;
  user: LineAuthUser;
}

export class AuthExchangeError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'AuthExchangeError';
    this.status = status;
  }
}

/**
 * Exchange a LINE LIFF `id_token` for a Supabase-compatible access token.
 *
 * Cheap to call repeatedly: `liff.getIDToken()` is local, so callers should
 * re-exchange whenever the cached access token is missing/expired or a
 * request comes back 401.
 */
export async function exchangeLineIdToken(idToken: string): Promise<LineAuthResponse> {
  if (!SUPABASE_URL) {
    throw new AuthExchangeError('VITE_SUPABASE_URL is not configured');
  }

  let res: Response;
  try {
    res = await fetch(`${SUPABASE_URL}/functions/v1/line-auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_token: idToken }),
    });
  } catch {
    throw new AuthExchangeError('เชื่อมต่อระบบยืนยันตัวตนไม่สำเร็จ');
  }

  if (!res.ok) {
    let message = `Auth exchange failed (${res.status})`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // ignore — keep generic message
    }
    throw new AuthExchangeError(message, res.status);
  }

  return (await res.json()) as LineAuthResponse;
}
