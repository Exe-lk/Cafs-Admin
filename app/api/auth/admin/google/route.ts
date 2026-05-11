import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/route-handler";
import { getRequestOrigin } from "@/lib/auth/request-origin";
import { safeNextPath } from "@/lib/auth/safe-next-path";

type GoogleBody = {
  /** Path to send the user to after OAuth (query `next` on callback). */
  next?: string;
};

/**
 * Starts Google OAuth for admins. After Google + Supabase, the user lands on
 * `/api/auth/admin/callback` which exchanges the code, sets cookies, and ensures
 * an `admin` profile row exists.
 */
export async function POST(request: NextRequest) {
  let body: GoogleBody = {};
  try {
    const text = await request.text();
    if (text) body = JSON.parse(text) as GoogleBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const nextPath = safeNextPath(typeof body.next === "string" ? body.next : null);

  try {
    const supabase = await createSupabaseRouteHandlerClient();
    const origin = getRequestOrigin(request);
    const callbackUrl = new URL("/api/auth/admin/callback", origin);
    callbackUrl.searchParams.set("next", nextPath);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callbackUrl.toString(),
        scopes: "email profile openid",
      },
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    if (!data.url) {
      return NextResponse.json(
        { error: "Provider did not return an authorization URL" },
        { status: 502 },
      );
    }

    return NextResponse.json({ url: data.url });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server configuration error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

