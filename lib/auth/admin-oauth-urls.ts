const ADMIN_OAUTH_CALLBACK_PATH = "/api/auth/admin/callback";

/**
 * Absolute callback URL for Supabase `redirectTo`.
 * Must match Supabase Redirect URLs exactly — no query string (use cookie for `next`).
 */
export function getAdminOAuthCallbackUrl(origin: string): string {
  return new URL(ADMIN_OAUTH_CALLBACK_PATH, origin).toString();
}
