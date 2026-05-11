
import type { NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";

import {
  createSupabaseBearerClient,
  createSupabaseCookieClient,
  createSupabaseServiceRoleClient,
} from "@/lib/supabase/server";

export type AuthContext = {
  user: User;
  accessTokenSource: "cookie" | "bearer";
};

export type UserRole =
  | "admin"
  | "therapist"
  | "front_office"
  | "client";

export async function getAuthContext(
  request: NextRequest,
): Promise<
  | {
      ok: true;
      ctx: AuthContext;
      supabase: Awaited<ReturnType<typeof createSupabaseCookieClient>>;
    }
  | { ok: false; reason: "unauthorized" }
> {
  const auth = request.headers.get("authorization");

  // Bearer token auth
  if (auth?.toLowerCase().startsWith("bearer ")) {
    const token = auth.slice(7).trim();

    if (!token) {
      return { ok: false, reason: "unauthorized" };
    }

    const supabase = createSupabaseBearerClient(token);

    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      return { ok: false, reason: "unauthorized" };
    }

    return {
      ok: true,
      ctx: {
        user: data.user,
        accessTokenSource: "bearer",
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase: supabase as any,
    };
  }

  // Cookie auth
  const supabase = await createSupabaseCookieClient();

  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return { ok: false, reason: "unauthorized" };
  }

  return {
    ok: true,
    ctx: {
      user: data.user,
      accessTokenSource: "cookie",
    },
    supabase,
  };
}

/**
 * Get role using service-role client.
 * This bypasses RLS safely.
 */
export async function getRoleForUserId(
  userId: string,
): Promise<UserRole | null> {
  const service = createSupabaseServiceRoleClient();

  const { data, error } = await service
    .from("profiles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data?.role) {
    return null;
  }

  return data.role as UserRole;
}

/**
 * Main role checker used by routes.
 * Keeps compatibility with existing imports/usages.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function requireRole(
  _supabase: any,
  userId: string,
  allowed: UserRole[],
): Promise<{ ok: true; role: UserRole } | { ok: false }> {
  const role = await getRoleForUserId(userId);

  if (!role) {
    return { ok: false };
  }

  if (!allowed.includes(role)) {
    return { ok: false };
  }

  return {
    ok: true,
    role,
  };
}

/**
 * Explicit service-role checker.
 * Optional helper if you want direct usage.
 */
export async function requireRoleService(
  userId: string,
  allowed: UserRole[],
): Promise<{ ok: true; role: UserRole } | { ok: false }> {
  return requireRole(null, userId, allowed);
}

