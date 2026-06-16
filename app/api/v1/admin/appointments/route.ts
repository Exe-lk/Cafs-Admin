import type { NextRequest } from "next/server";
import { created, err } from "@/lib/api/envelope";
import { getAuthContext, requireRoleService } from "@/lib/api/auth";
import { newUuid } from "@/lib/api/ids";
import { parseIsoDateParam } from "@/lib/api/http";
import { AUDIT_ENTITY_APPOINTMENT, writeAuditLog } from "@/lib/audit/writeAuditLog";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { validateAppointmentSchedule } from "@/lib/calendar/scheduling";
import {
  isRangeWithinWorkingHours,
  timeToHHMM,
  type WorkingHoursSlot,
} from "@/lib/calendar/workingHours";
import {
  buildAppointmentPendingPaymentEmailContent,
  getPaymentInstructionsFromEnv,
  sendAppointmentPendingPaymentEmail,
} from "@/lib/email/appointment-pending-payment";
import { normalizeTimeZone } from "@/lib/timezone";

type Body = {
  client?: { clientId?: string };
  therapistId?: string;
  serviceId?: string;
  appointmentType?: "online" | "in_person";
  startAt?: string;
  endAt?: string;
  allowOffHours?: boolean;
  payment?: { method?: "cash" | "gateway" | "bank_transfer"; markAsPaid?: boolean };
};

function formatAmountLkr(value: unknown): string | null {
  if (value == null) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return n.toLocaleString("en-LK", { maximumFractionDigits: 2 });
}

export async function POST(request: NextRequest) {
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

  const clientId =
    typeof body.client?.clientId === "string" ? body.client.clientId.trim() : "";
  const therapistId =
    typeof body.therapistId === "string" ? body.therapistId.trim() : "";
  const serviceId = typeof body.serviceId === "string" ? body.serviceId.trim() : "";
  const appointmentType = body.appointmentType;

  const startD = parseIsoDateParam(typeof body.startAt === "string" ? body.startAt : null);
  const endD = parseIsoDateParam(typeof body.endAt === "string" ? body.endAt : null);

  if (!clientId || !therapistId || !serviceId || !appointmentType || !startD || !endD) {
    return err("Validation error", 400);
  }
  if (!(endD > startD)) return err("Invalid startAt/endAt", 400);

  const scheduleCheck = validateAppointmentSchedule({ startUtc: startD, endUtc: endD });
  if (!scheduleCheck.ok) return err(scheduleCheck.message, 400);

  const { data: overlappingBlocks, error: blockErr } = await adminSupabase
    .from("therapist_time_blocks")
    .select("time_block_id")
    .eq("therapist_id", therapistId)
    .gt("end_at", startD.toISOString())
    .lt("start_at", endD.toISOString())
    .or("reason.like.time-off:%,reason.like.break:%")
    .limit(1);
  if (blockErr) return err(blockErr.message, 400);
  if (overlappingBlocks?.length) {
    return err("This time overlaps a therapist break or time off.", 400);
  }

  const allowOffHours = body.allowOffHours === true;
  if (!allowOffHours) {
    const { data: tzRow } = await adminSupabase
      .from("therapists")
      .select("timezone")
      .eq("therapist_id", therapistId)
      .maybeSingle();
    const therapistTimezone = normalizeTimeZone(
      String((tzRow as { timezone?: unknown } | null)?.timezone ?? ""),
    );

    const { data: whRows, error: whErr } = await adminSupabase
      .from("therapist_working_hours")
      .select("day_of_week,start_time,end_time,is_active")
      .eq("therapist_id", therapistId);
    if (whErr) return err(whErr.message, 400);

    const slots: WorkingHoursSlot[] = (whRows ?? []).map((row) => {
      const r = (row && typeof row === "object" ? (row as Record<string, unknown>) : {}) as Record<
        string,
        unknown
      >;
      return {
        dayOfWeek: Number(r.day_of_week),
        startTime: timeToHHMM(String(r.start_time ?? "00:00:00")),
        endTime: timeToHHMM(String(r.end_time ?? "00:00:00")),
        isActive: Boolean(r.is_active),
      };
    });

    if (!isRangeWithinWorkingHours(startD, endD, slots, therapistTimezone)) {
      return err("Therapist is not available at this time (outside working hours).", 400);
    }
  }

  const deadlineHours = Number(process.env.PAYMENT_DEADLINE_HOURS ?? "24");
  const paymentDueAt = new Date(
    startD.getTime() + deadlineHours * 60 * 60 * 1000,
  ).toISOString();

  const now = new Date().toISOString();
  const appointmentId = newUuid();

  const { error } = await adminSupabase.from("appointments").insert({
    appointment_id: appointmentId,
    client_id: clientId,
    therapist_id: therapistId,
    service_id: serviceId,
    appointment_type: appointmentType,
    status: "pending_payment",
    start_at: startD.toISOString(),
    end_at: endD.toISOString(),
    payment_due_at: paymentDueAt,
    created_by: auth.ctx.user.id,
    created_at: now,
    updated_at: now,
  });
  if (error) return err(error.message, 400);

  const [
    { data: clientProfile },
    { data: therapistRow },
    { data: therapistProfile },
    { data: serviceRow },
    { data: therapistServiceRow },
  ] = await Promise.all([
    adminSupabase
      .from("profiles")
      .select("full_name,email")
      .eq("user_id", clientId)
      .maybeSingle(),
    adminSupabase
      .from("therapists")
      .select("timezone")
      .eq("therapist_id", therapistId)
      .maybeSingle(),
    adminSupabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", therapistId)
      .maybeSingle(),
    adminSupabase
      .from("services")
      .select("name,base_price_lkr")
      .eq("service_id", serviceId)
      .maybeSingle(),
    adminSupabase
      .from("therapist_services")
      .select("price_lkr")
      .eq("therapist_id", therapistId)
      .eq("service_id", serviceId)
      .maybeSingle(),
  ]);

  const clientEmail =
    typeof clientProfile?.email === "string" ? clientProfile.email.trim() : "";
  const clientName =
    typeof clientProfile?.full_name === "string"
      ? clientProfile.full_name.trim()
      : "Client";
  const therapistName =
    typeof therapistProfile?.full_name === "string"
      ? therapistProfile.full_name.trim()
      : null;
  const serviceName =
    typeof serviceRow?.name === "string" ? serviceRow.name.trim() : null;
  const timeZone = normalizeTimeZone(
    String((therapistRow as { timezone?: unknown } | null)?.timezone ?? ""),
  );
  const amountLkr =
    formatAmountLkr(therapistServiceRow?.price_lkr) ??
    formatAmountLkr(serviceRow?.base_price_lkr);

  const skipPendingPaymentEmail = body.payment?.method === "bank_transfer";

  const { paymentInstructionsText, paymentWhatsappNumber } =
    getPaymentInstructionsFromEnv();

  let emailSent = false;
  let emailError: string | undefined;
  let providerMessageId: string | undefined;

  if (skipPendingPaymentEmail) {
    emailError = undefined;
  } else if (!clientEmail) {
    emailError = "Client has no email on file";
  } else {
    const sendResult = await sendAppointmentPendingPaymentEmail({
      to: clientEmail,
      clientName,
      therapistName,
      serviceName,
      startAt: startD.toISOString(),
      endAt: endD.toISOString(),
      appointmentType,
      timeZone,
      paymentDueAt,
      amountLkr,
      paymentInstructionsText,
      paymentWhatsappNumber,
    });
    if (sendResult.ok) {
      emailSent = true;
      providerMessageId = sendResult.messageId;
    } else {
      emailError = sendResult.error;
      console.error(
        "[create appointment] email failed",
        appointmentId,
        sendResult.error,
      );
    }
  }

  const { subject, html, text } = buildAppointmentPendingPaymentEmailContent({
    to: clientEmail || "unknown",
    clientName,
    therapistName,
    serviceName,
    startAt: startD.toISOString(),
    endAt: endD.toISOString(),
    appointmentType,
    timeZone,
    paymentDueAt,
    amountLkr,
    paymentInstructionsText,
    paymentWhatsappNumber,
  });

  if (!skipPendingPaymentEmail) {
  const { error: outboxError } = await adminSupabase.from("notification_outbox").insert({
    notification_id: newUuid(),
    user_id: clientId,
    appointment_id: appointmentId,
    channel: "email",
    type: "booking_confirmation",
    status: emailSent ? "sent" : "failed",
    to_address: clientEmail || "unknown",
    subject,
    body: text || html,
    provider: "resend",
    provider_message_id: providerMessageId ?? null,
    last_error: emailError ?? null,
    sent_at: emailSent ? now : null,
    created_at: now,
  });
  if (outboxError) {
    console.error("[create appointment] notification_outbox insert failed", outboxError.message);
  }
  }

  await writeAuditLog(adminSupabase, {
    actorUserId: auth.ctx.user.id,
    action: "created",
    entity: AUDIT_ENTITY_APPOINTMENT,
    entityId: appointmentId,
    metadata: {
      clientId,
      serviceName:
        typeof serviceRow?.name === "string" ? serviceRow.name.trim() : null,
      startAt: startD.toISOString(),
      status: "pending_payment",
    },
  });

  const res = created(
    {
      appointmentId,
      status: "pending_payment" as const,
      emailSent,
      ...(emailError ? { emailError } : {}),
    },
    emailSent
      ? "Appointment created and client notified"
      : "Appointment created; email could not be sent",
  );
  res.headers.set("Cache-Control", "no-store");
  return res;
}
