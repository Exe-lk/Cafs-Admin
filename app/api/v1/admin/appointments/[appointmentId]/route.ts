import type { NextRequest } from "next/server";
import { ok, err } from "@/lib/api/envelope";
import { getAuthContext, requireRoleService } from "@/lib/api/auth";
import { parseIsoDateParam } from "@/lib/api/http";
import {
  AUDIT_ENTITY_APPOINTMENT,
  buildAppointmentUpdateChanges,
  writeAuditLog,
} from "@/lib/audit/writeAuditLog";
import { validateAppointmentSchedule } from "@/lib/calendar/scheduling";
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

  const hasStartAt = typeof body.startAt === "string";
  const hasEndAt = typeof body.endAt === "string";

  const { data: existingRow, error: fetchError } = await adminSupabase
    .from("appointments")
    .select(
      "client_id,start_at,end_at,therapist_id,service_id,appointment_type,status,cancel_reason",
    )
    .eq("appointment_id", appointmentId)
    .maybeSingle();

  if (fetchError) return err(fetchError.message, 400);
  if (!existingRow) return err("Appointment not found", 404);

  const existing = existingRow as {
    client_id: string;
    start_at: string;
    end_at: string;
    therapist_id: string;
    service_id: string;
    appointment_type: string;
    status: string;
    cancel_reason: string | null;
  };

  const currentStart = parseIsoDateParam(String(existing.start_at));
  const currentEnd = parseIsoDateParam(String(existing.end_at));
  if (!currentStart || !currentEnd) return err("Appointment has invalid stored times", 400);

  const nextStart = hasStartAt ? parseIsoDateParam(body.startAt!) : currentStart;
  const nextEnd = hasEndAt ? parseIsoDateParam(body.endAt!) : currentEnd;
  if (hasStartAt && !nextStart) return err("Invalid startAt", 400);
  if (hasEndAt && !nextEnd) return err("Invalid endAt", 400);

  if (hasStartAt || hasEndAt) {
    const scheduleCheck = validateAppointmentSchedule({
      startUtc: nextStart!,
      endUtc: nextEnd!,
    });
    if (!scheduleCheck.ok) return err(scheduleCheck.message, 400);
  }

  const resolvedStartAt = hasStartAt ? nextStart!.toISOString() : undefined;
  const resolvedEndAt = hasEndAt ? nextEnd!.toISOString() : undefined;

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
  if (hasStartAt) {
    const d = parseIsoDateParam(body.startAt!);
    if (!d) return err("Invalid startAt", 400);
    payload.start_at = d.toISOString();
  }
  if (hasEndAt) {
    const d = parseIsoDateParam(body.endAt!);
    if (!d) return err("Invalid endAt", 400);
    payload.end_at = d.toISOString();
  }

  const { error } = await adminSupabase
    .from("appointments")
    .update(payload)
    .eq("appointment_id", appointmentId);
  if (error) return err(error.message, 400);

  const changes = buildAppointmentUpdateChanges(existing, body, {
    startAt: resolvedStartAt,
    endAt: resolvedEndAt,
  });

  await writeAuditLog(adminSupabase, {
    actorUserId: auth.ctx.user.id,
    action: "updated",
    entity: AUDIT_ENTITY_APPOINTMENT,
    entityId: appointmentId,
    metadata: {
      clientId: existing.client_id,
      startAt: resolvedStartAt ?? existing.start_at,
      changes,
    },
  });

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

  const { data: existingRow, error: fetchError } = await adminSupabase
    .from("appointments")
    .select("client_id,cancel_reason")
    .eq("appointment_id", appointmentId)
    .maybeSingle();
  if (fetchError) return err(fetchError.message, 400);
  if (!existingRow) return err("Appointment not found", 404);

  const { error } = await adminSupabase
    .from("appointments")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("appointment_id", appointmentId);
  if (error) return err(error.message, 400);

  const existing = existingRow as { client_id: string; cancel_reason: string | null };
  await writeAuditLog(adminSupabase, {
    actorUserId: auth.ctx.user.id,
    action: "cancelled",
    entity: AUDIT_ENTITY_APPOINTMENT,
    entityId: appointmentId,
    metadata: {
      clientId: existing.client_id,
      cancelReason: existing.cancel_reason,
    },
  });

  const res = ok(null, "Appointment cancelled successfully");
  res.headers.set("Cache-Control", "no-store");
  return res;
}
