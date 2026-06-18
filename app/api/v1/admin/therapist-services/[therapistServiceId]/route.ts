import type { NextRequest } from "next/server";
import { ok, err } from "@/lib/api/envelope";
import { getAuthContext, requireRoleService } from "@/lib/api/auth";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

const SELECT_COLUMNS =
  "therapist_service_id,therapist_id,service_id,price_lkr,duration_minutes,is_active,created_at";

type PatchBody = {
  therapistId?: string;
  serviceId?: string;
  priceLkr?: number | null;
  durationMinutes?: number | null;
  isActive?: boolean;
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ therapistServiceId: string }> },
) {
  const { therapistServiceId } = await params;
  const auth = await getAuthContext(_request);
  if (!auth.ok) return err("Unauthorized", 401);
  const roleCheck = await requireRoleService(auth.ctx.user.id, ["admin"]);
  if (!roleCheck.ok) return err("Forbidden", 403);

  const adminSupabase = createSupabaseServiceRoleClient();
  const { data, error } = await adminSupabase
    .from("therapist_services")
    .select(SELECT_COLUMNS)
    .eq("therapist_service_id", therapistServiceId)
    .maybeSingle();
  if (error) return err(error.message, 400);
  if (!data) return err("Therapist service not found", 404);

  const res = ok(data, "Therapist service retrieved successfully");
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ therapistServiceId: string }> },
) {
  const { therapistServiceId } = await params;
  const auth = await getAuthContext(request);
  if (!auth.ok) return err("Unauthorized", 401);
  const roleCheck = await requireRoleService(auth.ctx.user.id, ["admin"]);
  if (!roleCheck.ok) return err("Forbidden", 403);

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return err("Invalid JSON body", 400);
  }

  const payload: Record<string, unknown> = {};
  if (typeof body.therapistId === "string") payload.therapist_id = body.therapistId.trim();
  if (typeof body.serviceId === "string") payload.service_id = body.serviceId.trim();
  if (body.priceLkr === null || typeof body.priceLkr === "number") payload.price_lkr = body.priceLkr;
  if (body.durationMinutes === null || typeof body.durationMinutes === "number") {
    payload.duration_minutes =
      body.durationMinutes === null ? null : Math.max(5, Math.floor(body.durationMinutes));
  }
  if (typeof body.isActive === "boolean") payload.is_active = body.isActive;

  if (Object.keys(payload).length === 0) {
    return err("Validation error", 400, [{ field: "body", message: "No fields to update" }]);
  }

  const adminSupabase = createSupabaseServiceRoleClient();
  const { data, error } = await adminSupabase
    .from("therapist_services")
    .update(payload)
    .eq("therapist_service_id", therapistServiceId)
    .select(SELECT_COLUMNS)
    .maybeSingle();
  if (error) return err(error.message, 400);
  if (!data) return err("Therapist service not found", 404);

  const res = ok(data, "Therapist service updated successfully");
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ therapistServiceId: string }> },
) {
  const { therapistServiceId } = await params;
  const auth = await getAuthContext(_request);
  if (!auth.ok) return err("Unauthorized", 401);
  const roleCheck = await requireRoleService(auth.ctx.user.id, ["admin"]);
  if (!roleCheck.ok) return err("Forbidden", 403);

  const adminSupabase = createSupabaseServiceRoleClient();
  const { data, error } = await adminSupabase
    .from("therapist_services")
    .update({ is_active: false })
    .eq("therapist_service_id", therapistServiceId)
    .select("therapist_service_id")
    .maybeSingle();
  if (error) return err(error.message, 400);
  if (!data) return err("Therapist service not found", 404);

  const res = ok(null, "Therapist service deleted successfully");
  res.headers.set("Cache-Control", "no-store");
  return res;
}
