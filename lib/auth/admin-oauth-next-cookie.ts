import { cookies } from "next/headers";
import { safeNextPath } from "@/lib/auth/safe-next-path";

/** Short-lived cookie holding post-login path (not sent to Supabase redirectTo). */
export const ADMIN_OAUTH_NEXT_COOKIE = "admin_oauth_next";

const MAX_AGE_SECONDS = 600;

export async function setAdminOAuthNextCookie(nextPath: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_OAUTH_NEXT_COOKIE, safeNextPath(nextPath), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function consumeAdminOAuthNextCookie(
  fallback: string | null,
): Promise<string> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(ADMIN_OAUTH_NEXT_COOKIE)?.value ?? fallback;
  try {
    cookieStore.delete(ADMIN_OAUTH_NEXT_COOKIE);
  } catch {
    /* ignore when cookies cannot be mutated */
  }
  return safeNextPath(raw);
}
