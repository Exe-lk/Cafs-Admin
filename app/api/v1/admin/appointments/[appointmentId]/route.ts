import type { NextRequest } from "next/server";
import { ok, err } from "@/lib/api/envelope";
import { getAuthContext, requireRoleService } from "@/lib/api/auth";
import { parseIsoDateParam } from "@/lib/api/http";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

type PutBody = {
  therapistId?: string;
  serviceId?: string;
  appointmentType?: "online" | "in_person";
  status?:
    | "pending_payment"
    | "pending_confirmation"
    | "confirmed"
    | "cancelled"
    | "completed"
    | "no_show"
    | "expired";
  startAt?: string;
  endAt?: string;
  note?: string;
  cancelReason?: string;
};

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ appointmentId: string }> },
) {
  const { appointmentId } = await params;
  const auth = await getAuthContext(request);
  if (!auth.ok) return err("Unauthorized", 401);
  const roleCheck = await requireRoleService(auth.ctx.user.id, [
    "admin",
    "front_office",
  ]);
  if (!roleCheck.ok) return err("Forbidden", 403);

  const adminSupabase = createSupabaseServiceRoleClient();
  let body: PutBody;
  try {
    body = (await request.json()) as PutBody;
  } catch {
    return err("Invalid JSON body", 400);
  }

  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.therapistId === "string") payload.therapist_id = body.therapistId;
  if (typeof body.serviceId === "string") payload.service_id = body.serviceId;
  if (body.appointmentType) payload.appointment_type = body.appointmentType;
  if (body.status) {
    payload.status = body.status;
    if (body.status === "cancelled") {
      payload.cancelled_at = new Date().toISOString();
    }
  }
  if (typeof body.cancelReason === "string" && body.cancelReason.trim()) {
    payload.cancel_reason = body.cancelReason.trim();
  }
  if (typeof body.startAt === "string") {
    const d = parseIsoDateParam(body.startAt);
    if (!d) return err("Invalid startAt", 400);
    payload.start_at = d.toISOString();
  }
  if (typeof body.endAt === "string") {
    const d = parseIsoDateParam(body.endAt);
    if (!d) return err("Invalid endAt", 400);
    payload.end_at = d.toISOString();
  }

  const { error } = await adminSupabase
    .from("appointments")
    .update(payload)
    .eq("appointment_id", appointmentId);
  if (error) return err(error.message, 400);

  const res = ok(null, "Appointment updated successfully");
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ appointmentId: string }> },
) {
  const { appointmentId } = await params;
  const auth = await getAuthContext(request);
  if (!auth.ok) return err("Unauthorized", 401);
  const roleCheck = await requireRoleService(auth.ctx.user.id, [
    "admin",
    "front_office",
  ]);
  if (!roleCheck.ok) return err("Forbidden", 403);

  const adminSupabase = createSupabaseServiceRoleClient();
  const { error } = await adminSupabase
    .from("appointments")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("appointment_id", appointmentId);
  if (error) return err(error.message, 400);

  const res = ok(null, "Appointment cancelled successfully");
  res.headers.set("Cache-Control", "no-store");
  return res;
}

