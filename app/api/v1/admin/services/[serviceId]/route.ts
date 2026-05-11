import type { NextRequest } from "next/server";
import { ok, err } from "@/lib/api/envelope";
import { getAuthContext, requireRoleService } from "@/lib/api/auth";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { isoNow } from "@/lib/api/envelope";
import {  requireRole } from "@/lib/api/auth";

type PutBody = {
  name?: string;
  description?: string | null;
  visibility?: "public" | "private";
  defaultDurationMinutes?: number;
  basePriceLkr?: number | null;
  currency?: string;
  allowedAppointmentType?: "online" | "in_person" | null;
  isActive?: boolean;
};

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ serviceId: string }> },
) {
  const { serviceId } = await params;
  const auth = await getAuthContext(request);
  if (!auth.ok) return err("Unauthorized", 401);
  const roleCheck = await requireRole(auth.supabase, auth.ctx.user.id, ["admin"]);
  if (!roleCheck.ok) return err("Forbidden", 403);

  let body: PutBody;
  try {
    body = (await request.json()) as PutBody;
  } catch {
    return err("Invalid JSON body", 400);
  }

  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (typeof body.name === "string") payload.name = body.name.trim();
  if (body.description === null || typeof body.description === "string")
    payload.description = body.description;
  if (body.visibility === "public" || body.visibility === "private")
    payload.visibility = body.visibility;
  if (typeof body.defaultDurationMinutes === "number")
    payload.default_duration_minutes = Math.max(5, Math.floor(body.defaultDurationMinutes));
  if (body.basePriceLkr === null || typeof body.basePriceLkr === "number")
    payload.base_price_lkr = body.basePriceLkr;
  if (typeof body.currency === "string") payload.currency = body.currency.trim();
  if (
    body.allowedAppointmentType === null ||
    body.allowedAppointmentType === "online" ||
    body.allowedAppointmentType === "in_person"
  ) {
    payload.allowed_appointment_type = body.allowedAppointmentType;
  }
  if (typeof body.isActive === "boolean") payload.is_active = body.isActive;

  const { error } = await auth.supabase
    .from("services")
    .update(payload)
    .eq("service_id", serviceId);
  if (error) return err(error.message, 400);

  const res = ok(null, "Service updated successfully");
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ serviceId: string }> },
) {
  const { serviceId } = await params;
  const auth = await getAuthContext(request);
  if (!auth.ok) return err("Unauthorized", 401);
  const roleCheck = await requireRole(auth.supabase, auth.ctx.user.id, ["admin"]);
  if (!roleCheck.ok) return err("Forbidden", 403);

  // Soft-disable (recommended): keep history.
  const { error } = await auth.supabase
    .from("services")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("service_id", serviceId);
  if (error) return err(error.message, 400);

  const res = ok(null, "Service deleted successfully");
  res.headers.set("Cache-Control", "no-store");
  return res;
}
