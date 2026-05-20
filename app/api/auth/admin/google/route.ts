import { NextResponse, type NextRequest } from "next/server";
import { startAdminGoogleOAuth } from "@/lib/auth/start-admin-google-oauth";
import { getSiteUrl } from "@/lib/auth/request-origin";
import { safeNextPath } from "@/lib/auth/safe-next-path";

type GoogleBody = {
  /** Path to send the user to after OAuth (stored in cookie, not on redirectTo). */
  next?: string;
};

function resolveNextPath(
  request: NextRequest,
  bodyNext: string | null,
): string {
  const fromQuery = request.nextUrl.searchParams.get("next");
  return safeNextPath(bodyNext ?? fromQuery);
}

/**
 * Starts Google OAuth for admins (GET: browser redirect, POST: JSON for legacy clients).
 * After Google + Supabase, the user lands on `/api/auth/admin/callback`.
 */
export async function GET(request: NextRequest) {
  const nextPath = resolveNextPath(request, null);

  try {
    const result = await startAdminGoogleOAuth(request, nextPath);

    if (!result.ok) {
      const origin = getSiteUrl(request);
      return NextResponse.redirect(
        new URL(
          `/login?auth_error=${encodeURIComponent(result.error)}`,
          origin,
        ),
      );
    }

    if (process.env.NODE_ENV === "development") {
      console.info("[admin-oauth] redirectTo:", result.callbackUrl);
    }

    return NextResponse.redirect(result.url);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server configuration error";
    try {
      const origin = getSiteUrl(request);
      return NextResponse.redirect(
        new URL(`/login?auth_error=${encodeURIComponent(message)}`, origin),
      );
    } catch {
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }
}

export async function POST(request: NextRequest) {
  let body: GoogleBody = {};
  try {
    const text = await request.text();
    if (text) body = JSON.parse(text) as GoogleBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const nextPath = resolveNextPath(
    request,
    typeof body.next === "string" ? body.next : null,
  );

  try {
    const result = await startAdminGoogleOAuth(request, nextPath);

    if (!result.ok) {
      const status = result.error.includes("authorization URL") ? 502 : 400;
      return NextResponse.json({ error: result.error }, { status });
    }

    if (process.env.NODE_ENV === "development") {
      console.info("[admin-oauth] redirectTo:", result.callbackUrl);
    }

    return NextResponse.json({ url: result.url });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server configuration error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
