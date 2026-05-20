import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/route-handler";
import { consumeAdminOAuthNextCookie } from "@/lib/auth/admin-oauth-next-cookie";
import { getSiteUrl } from "@/lib/auth/request-origin";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import {
  displayNameFromUser,
  ensureAdminProfile,
} from "@/lib/auth/ensure-admin-profile";

/**
 * OAuth redirect target for admin Google sign-in.
 * Exchanges `code` for a session and sets Supabase auth cookies.
 * Then ensures an `admin` profile row exists (service-role write).
 */
export async function GET(request: NextRequest) {
  const origin = getSiteUrl(request);
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const nextPath = await consumeAdminOAuthNextCookie(
    url.searchParams.get("next"),
  );

  if (!code) {
    return NextResponse.redirect(
      new URL(`/?auth_error=${encodeURIComponent("missing_code")}`, origin),
    );
  }

  try {
    const supabase = await createSupabaseRouteHandlerClient();
    const { data: exchanged, error } = await supabase.auth.exchangeCodeForSession(
      code,
    );

    if (error) {
      return NextResponse.redirect(
        new URL(`/?auth_error=${encodeURIComponent(error.message)}`, origin),
      );
    }

    const authedSupabase = await createSupabaseRouteHandlerClient();
    const user =
      exchanged?.user ??
      (await authedSupabase.auth.getUser()).data.user ??
      null;

    if (user) {
      const adminSupabase = createSupabaseServiceRoleClient();
      const { data: existing, error: profileReadError } = await adminSupabase
        .from("profiles")
        .select("role,is_active")
        .eq("user_id", user.id)
        .maybeSingle<{ role: string; is_active: boolean }>();

      if (
        profileReadError ||
        !existing ||
        existing.role !== "admin" ||
        !existing.is_active
      ) {
        // Ensure non-admin users cannot keep a valid admin session cookie.
        await authedSupabase.auth.signOut();
        return NextResponse.redirect(
          new URL("/login?auth_error=admin_access_denied", origin),
        );
      }

      const { profileError } = await ensureAdminProfile(adminSupabase, user.id, {
        fullName: displayNameFromUser(user),
        email: user.email ?? null,
        phone: null,
      });
      if (profileError) {
        console.error("ensureAdminProfile failed", {
          userId: user.id,
          profileError,
        });
        await authedSupabase.auth.signOut();
        return NextResponse.redirect(
          new URL("/login?auth_error=admin_profile_sync_failed", origin),
        );
      }
    }

    return NextResponse.redirect(new URL(nextPath, origin));
  } catch (e) {
    const message = e instanceof Error ? e.message : "exchange_failed";
    return NextResponse.redirect(
      new URL(`/?auth_error=${encodeURIComponent(message)}`, origin),
    );
  }
}

