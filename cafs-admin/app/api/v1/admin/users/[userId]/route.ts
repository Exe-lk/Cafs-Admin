import type { NextRequest } from "next/server";
import { ok, err } from "@/lib/api/envelope";
import { getAuthContext, requireRoleService } from "@/lib/api/auth";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

type Body = {
  fullName?: string;
  phone?: string;
  role?: "admin" | "therapist" | "front_office" | "client";
  isActive?: boolean;
};

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;
  const auth = await getAuthContext(request);
  if (!auth.ok) return err("Unauthorized", 401);
  const roleCheck = await requireRoleService(auth.ctx.user.id, ["admin"]);
  if (!roleCheck.ok) return err("Forbidden", 403);

  const adminSupabase = createSupabaseServiceRoleClient();
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return err("Invalid JSON body", 400);
  }

  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.fullName === "string") payload.full_name = body.fullName;
  if (typeof body.phone === "string") payload.phone = body.phone;
  if (typeof body.isActive === "boolean") payload.is_active = body.isActive;
  if (
    body.role === "admin" ||
    body.role === "therapist" ||
    body.role === "front_office" ||
    body.role === "client"
  ) {
    payload.role = body.role;
  }

  const { error } = await adminSupabase
    .from("profiles")
    .update(payload)
    .eq("user_id", userId);
  if (error) return err(error.message, 400);

  const res = ok(null, "User account updated successfully");
  res.headers.set("Cache-Control", "no-store");
  return res;
}

