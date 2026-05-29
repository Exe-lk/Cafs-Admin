import type { NextRequest } from "next/server";
import { ok, err } from "@/lib/api/envelope";
import { getAuthContext, requireRoleService } from "@/lib/api/auth";
import { newUuid } from "@/lib/api/ids";
import {
  buildAppointmentRejectionEmailContent,
  sendAppointmentRejectionEmail,
} from "@/lib/email/appointment-rejection";
import { normalizeTimeZone } from "@/lib/timezone";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

const REJECTABLE_STATUSES = new Set(["pending_payment", "pending_confirmation"]);
const MIN_REASON_LEN = 3;
const MAX_REASON_LEN = 500;

type RejectBody = {
  reason?: string;
};

type AppointmentRow = {
  appointment_id: string;
  client_id: string;
  therapist_id: string;
  start_at: string;
  end_at: string;
  status: string;
  appointment_type: "online" | "in_person";
};

export async function POST(
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

  let body: RejectBody;
  try {
    body = (await request.json()) as RejectBody;
  } catch {
    return err("Invalid JSON body", 400);
  }

  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (reason.length < MIN_REASON_LEN) {
    return err(`Reason must be at least ${MIN_REASON_LEN} characters`, 400);
  }
  if (reason.length > MAX_REASON_LEN) {
    return err(`Reason must be at most ${MAX_REASON_LEN} characters`, 400);
  }

  const adminSupabase = createSupabaseServiceRoleClient();

  const { data: appt, error: fetchError } = await adminSupabase
    .from("appointments")
    .select(
      "appointment_id,client_id,therapist_id,start_at,end_at,status,appointment_type",
    )
    .eq("appointment_id", appointmentId)
    .maybeSingle();

  if (fetchError) return err(fetchError.message, 400);
  if (!appt) return err("Appointment not found", 404);

  const row = appt as AppointmentRow;
  if (!REJECTABLE_STATUSES.has(row.status)) {
    return err(
      `Appointment cannot be rejected in status "${row.status}"`,
      409,
    );
  }

  const now = new Date().toISOString();
  const { error: updateError } = await adminSupabase
    .from("appointments")
    .update({
      status: "cancelled",
      cancelled_at: now,
      cancel_reason: reason,
      updated_at: now,
    })
    .eq("appointment_id", appointmentId);

  if (updateError) return err(updateError.message, 400);

  const [{ data: clientProfile }, { data: therapistRow }] = await Promise.all([
    adminSupabase
      .from("profiles")
      .select("full_name,email")
      .eq("user_id", row.client_id)
      .maybeSingle(),
    adminSupabase
      .from("therapists")
      .select("timezone")
      .eq("therapist_id", row.therapist_id)
      .maybeSingle(),
  ]);

  const { data: therapistProfile } = await adminSupabase
    .from("profiles")
    .select("full_name")
    .eq("user_id", row.therapist_id)
    .maybeSingle();

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
  const timeZone = normalizeTimeZone(
    String((therapistRow as { timezone?: unknown } | null)?.timezone ?? ""),
  );

  let emailSent = false;
  let emailError: string | undefined;
  let providerMessageId: string | undefined;

  if (!clientEmail) {
    emailError = "Client has no email on file";
  } else {
    const sendResult = await sendAppointmentRejectionEmail({
      to: clientEmail,
      clientName,
      therapistName,
      startAt: row.start_at,
      endAt: row.end_at,
      appointmentType: row.appointment_type,
      timeZone,
      reason,
    });
    if (sendResult.ok) {
      emailSent = true;
      providerMessageId = sendResult.messageId;
    } else {
      emailError = sendResult.error;
      console.error(
        "[reject appointment] email failed",
        appointmentId,
        sendResult.error,
      );
    }
  }

  const { subject, html, text } = buildAppointmentRejectionEmailContent({
    to: clientEmail || "unknown",
    clientName,
    therapistName,
    startAt: row.start_at,
    endAt: row.end_at,
    appointmentType: row.appointment_type,
    timeZone,
    reason,
  });

  const { error: outboxError } = await adminSupabase.from("notification_outbox").insert({
    notification_id: newUuid(),
    user_id: row.client_id,
    appointment_id: appointmentId,
    channel: "email",
    type: "cancellation",
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
    console.error("[reject appointment] notification_outbox insert failed", outboxError.message);
  }

  const res = ok(
    {
      appointmentId,
      status: "cancelled" as const,
      emailSent,
      ...(emailError ? { emailError } : {}),
    },
    emailSent
      ? "Appointment rejected and client notified"
      : "Appointment rejected; email could not be sent",
  );
  res.headers.set("Cache-Control", "no-store");
  return res;
}
