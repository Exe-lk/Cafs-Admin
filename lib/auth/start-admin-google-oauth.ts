import type { NextRequest } from "next/server";
import { getAdminOAuthCallbackUrl } from "@/lib/auth/admin-oauth-urls";
import { setAdminOAuthNextCookie } from "@/lib/auth/admin-oauth-next-cookie";
import { getSiteUrl } from "@/lib/auth/request-origin";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/route-handler";

export type StartAdminGoogleOAuthResult =
  | { ok: true; url: string; callbackUrl: string }
  | { ok: false; error: string };

/**
 * Starts admin Google OAuth. Stores `nextPath` in a cookie; Supabase `redirectTo`
 * is the callback URL only (no query) so it matches the Supabase allowlist.
 */
export async function startAdminGoogleOAuth(
  request: NextRequest,
  nextPath: string,
): Promise<StartAdminGoogleOAuthResult> {
  const origin = getSiteUrl(request);
  const callbackUrl = getAdminOAuthCallbackUrl(origin);

  await setAdminOAuthNextCookie(nextPath);

  const supabase = await createSupabaseRouteHandlerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callbackUrl,
      scopes: "email profile openid",
    },
  });

  if (error) {
    return { ok: false, error: error.message };
  }
  if (!data.url) {
    return {
      ok: false,
      error: "Provider did not return an authorization URL",
    };
  }

  return { ok: true, url: data.url, callbackUrl };
}
