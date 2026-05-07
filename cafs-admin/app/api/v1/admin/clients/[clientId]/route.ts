import type { NextRequest } from "next/server";
import { ok, err } from "@/lib/api/envelope";
import { getAuthContext, requireRoleService } from "@/lib/api/auth";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

type Body = {
  fullName?: string;
  phone?: string;
  note?: string;
};

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> },
) {
  const { clientId } = await params;
  const auth = await getAuthContext(request);
  if (!auth.ok) return err("Unauthorized", 401);
  const roleCheck = await requireRoleService(auth.ctx.user.id, [
    "admin",
    "front_office",
  ]);
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

  const { error } = await adminSupabase
    .from("profiles")
    .update(payload)
    .eq("user_id", clientId)
    .eq("role", "client");
  if (error) return err(error.message, 400);

  const res = ok(null, "Client record updated successfully");
  res.headers.set("Cache-Control", "no-store");
  return res;
}

