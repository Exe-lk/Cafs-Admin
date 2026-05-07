import type { NextRequest } from "next/server";

/**
 * Public site origin for OAuth redirects. Prefer env when the app is behind a proxy.
 */
export function getRequestOrigin(request: NextRequest): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  return request.nextUrl.origin;
}
