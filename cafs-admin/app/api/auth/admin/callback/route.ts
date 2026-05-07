import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/route-handler";
import { getRequestOrigin } from "@/lib/auth/request-origin";
import { safeNextPath } from "@/lib/auth/safe-next-path";
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
  const origin = getRequestOrigin(request);
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const nextPath = safeNextPath(url.searchParams.get("next"));

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
      const { profileError } = await ensureAdminProfile(
        adminSupabase,
        user.id,
        {
          fullName: displayNameFromUser(user),
          email: user.email ?? null,
          phone: null,
        },
      );
      if (profileError) {
        console.error("ensureAdminProfile failed", {
          userId: user.id,
          profileError,
        });
        const dest = new URL(nextPath, origin);
        dest.searchParams.set("profile_error", "1");
        return NextResponse.redirect(dest);
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

