import type { NextRequest } from "next/server";

function trimTrailingSlash(url: string): string {
  return url.replace(/\/$/, "");
}

function parseRedirectAllowlist(): string[] {
  const raw = process.env.AUTH_REDIRECT_ALLOWLIST?.trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((entry) => trimTrailingSlash(entry.trim()))
    .filter(Boolean);
}

function assertOriginAllowed(origin: string): void {
  const allowlist = parseRedirectAllowlist();
  if (allowlist.length === 0) return;

  const normalized = trimTrailingSlash(origin);
  if (!allowlist.includes(normalized)) {
    throw new Error(
      `NEXT_PUBLIC_SITE_URL (${normalized}) is not listed in AUTH_REDIRECT_ALLOWLIST`,
    );
  }
}

/**
 * Public site origin for OAuth redirects. Uses NEXT_PUBLIC_SITE_URL from .env.
 */
export function getSiteUrl(request: NextRequest): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) {
    const origin = trimTrailingSlash(fromEnv);
    assertOriginAllowed(origin);
    return origin;
  }

  if (process.env.NODE_ENV === "development") {
    return request.nextUrl.origin;
  }

  throw new Error(
    "NEXT_PUBLIC_SITE_URL is required in production. Set it in your environment and restart the server.",
  );
}

/** @deprecated Prefer getSiteUrl — kept for existing imports. */
export function getRequestOrigin(request: NextRequest): string {
  return getSiteUrl(request);
}
