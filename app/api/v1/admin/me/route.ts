import type { NextRequest } from "next/server";
import { ok, err } from "@/lib/api/envelope";
import { getAuthContext, requireRole } from "@/lib/api/auth";
import { displayNameFromUser } from "@/lib/auth/ensure-admin-profile";

export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request);
  if (!auth.ok) return err("Unauthorized", 401);
  const roleCheck = await requireRole(auth.supabase, auth.ctx.user.id, [
    "admin",
    "front_office",
  ]);
  if (!roleCheck.ok) return err("Forbidden", 403);

  const { data, error } = await auth.supabase
    .from("profiles")
    .select("full_name,email")
    .eq("user_id", auth.ctx.user.id)
    .maybeSingle<{ full_name: string | null; email: string | null }>();

  if (error) return err(error.message, 400);

  const fullName =
    (typeof data?.full_name === "string" && data.full_name.trim()) ||
    displayNameFromUser(auth.ctx.user);

  const res = ok(
    {
      fullName,
      email: data?.email ?? auth.ctx.user.email ?? null,
    },
    "Profile retrieved successfully",
  );
  res.headers.set("Cache-Control", "no-store");
  return res;
}
