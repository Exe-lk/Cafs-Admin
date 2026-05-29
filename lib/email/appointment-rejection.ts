import {
  formatDateInTimeZone,
  formatTimeInTimeZone,
  normalizeTimeZone,
  parseDbUtcTimestamp,
} from "@/lib/timezone";
import { sendEmail } from "@/lib/email/resend";

export type AppointmentRejectionEmailInput = {
  to: string;
  clientName: string;
  therapistName?: string | null;
  startAt: string;
  endAt: string;
  appointmentType: "online" | "in_person";
  timeZone?: string;
  reason: string;
};

function appointmentTypeLabel(t: "online" | "in_person") {
  return t === "in_person" ? "In-person" : "Online";
}

export function buildAppointmentRejectionEmailContent(
  input: AppointmentRejectionEmailInput,
): { subject: string; html: string; text: string } {
  const timeZone = normalizeTimeZone(input.timeZone);
  const start = parseDbUtcTimestamp(input.startAt);
  const end = parseDbUtcTimestamp(input.endAt);

  const dateLabel =
    start != null
      ? formatDateInTimeZone(start, timeZone, {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : input.startAt;
  const timeLabel =
    start != null && end != null
      ? `${formatTimeInTimeZone(start, timeZone)} – ${formatTimeInTimeZone(end, timeZone)}`
      : `${input.startAt} – ${input.endAt}`;

  const therapistLine = input.therapistName?.trim()
    ? `<p><strong>Therapist:</strong> ${escapeHtml(input.therapistName.trim())}</p>`
    : "";
  const therapistText = input.therapistName?.trim()
    ? `Therapist: ${input.therapistName.trim()}\n`
    : "";

  const subject = "Your appointment could not be confirmed";
  const reasonEscaped = escapeHtml(input.reason.trim());
  const clientName = escapeHtml(input.clientName.trim() || "there");

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #2f3334;">
  <p>Hi ${clientName},</p>
  <p>We were unable to confirm your appointment request. It has been cancelled and the time slot is no longer reserved for you.</p>
  <p><strong>Appointment details</strong></p>
  <ul>
    <li><strong>Date:</strong> ${escapeHtml(String(dateLabel))}</li>
    <li><strong>Time:</strong> ${escapeHtml(String(timeLabel))}</li>
    <li><strong>Type:</strong> ${appointmentTypeLabel(input.appointmentType)}</li>
  </ul>
  ${therapistLine}
  <p><strong>Reason:</strong></p>
  <p style="white-space: pre-wrap;">${reasonEscaped}</p>
  <p>If you have questions or would like to book another time, please contact us.</p>
  <p>— CAFS</p>
</body>
</html>`.trim();

  const text = [
    `Hi ${input.clientName.trim() || "there"},`,
    "",
    "We were unable to confirm your appointment request. It has been cancelled and the time slot is no longer reserved for you.",
    "",
    "Appointment details:",
    `Date: ${dateLabel}`,
    `Time: ${timeLabel}`,
    `Type: ${appointmentTypeLabel(input.appointmentType)}`,
    therapistText,
    "Reason:",
    input.reason.trim(),
    "",
    "If you have questions or would like to book another time, please contact us.",
    "",
    "— CAFS",
  ]
    .filter(Boolean)
    .join("\n");

  return { subject, html, text };
}

export async function sendAppointmentRejectionEmail(
  input: AppointmentRejectionEmailInput,
): Promise<{ ok: true; messageId: string } | { ok: false; error: string }> {
  const { subject, html, text } = buildAppointmentRejectionEmailContent(input);
  return sendEmail({ to: input.to, subject, html, text });
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
