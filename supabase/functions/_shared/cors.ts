// Shared CORS headers for edge functions called directly from the LIFF
// frontend (browser fetch). Adjust ALLOWED_ORIGIN via env if you need to
// lock this down to a specific deployed origin; defaults to "*" since this
// is a personal-use project with no sensitive data exposed pre-auth.
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function handleOptions(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  return null;
}
