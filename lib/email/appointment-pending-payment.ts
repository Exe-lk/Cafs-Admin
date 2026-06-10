import {
  formatDateInTimeZone,
  formatTimeInTimeZone,
  normalizeTimeZone,
  parseDbUtcTimestamp,
} from "@/lib/timezone";
import { sendEmail } from "@/lib/email/resend";

export type AppointmentPendingPaymentEmailInput = {
  to: string;
  clientName: string;
  therapistName?: string | null;
  serviceName?: string | null;
  startAt: string;
  endAt: string;
  appointmentType: "online" | "in_person";
  timeZone?: string;
  paymentDueAt: string;
  amountLkr?: string | null;
  paymentInstructionsText?: string | null;
  paymentWhatsappNumber?: string | null;
};

function appointmentTypeLabel(t: "online" | "in_person") {
  return t === "in_person" ? "In-person" : "Online";
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatPaymentDueLabel(paymentDueAt: string, timeZone: string): string {
  const due = parseDbUtcTimestamp(paymentDueAt);
  if (!due) return paymentDueAt;
  return formatDateInTimeZone(due, timeZone, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function getPaymentInstructionsFromEnv(): {
  paymentInstructionsText: string | null;
  paymentWhatsappNumber: string | null;
} {
  const paymentInstructionsText =
    process.env.PAYMENT_INSTRUCTIONS_TEXT?.trim() || null;
  const paymentWhatsappNumber =
    process.env.PAYMENT_WHATSAPP_NUMBER?.trim() || null;
  return { paymentInstructionsText, paymentWhatsappNumber };
}

export function buildAppointmentPendingPaymentEmailContent(
  input: AppointmentPendingPaymentEmailInput,
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

  const paymentDueLabel = formatPaymentDueLabel(input.paymentDueAt, timeZone);
  const clientName = escapeHtml(input.clientName.trim() || "there");

  const therapistLine = input.therapistName?.trim()
    ? `<li><strong>Therapist:</strong> ${escapeHtml(input.therapistName.trim())}</li>`
    : "";
  const therapistText = input.therapistName?.trim()
    ? `Therapist: ${input.therapistName.trim()}\n`
    : "";

  const serviceLine = input.serviceName?.trim()
    ? `<li><strong>Service:</strong> ${escapeHtml(input.serviceName.trim())}</li>`
    : "";
  const serviceText = input.serviceName?.trim()
    ? `Service: ${input.serviceName.trim()}\n`
    : "";

  const amountLine = input.amountLkr?.trim()
    ? `<li><strong>Amount:</strong> Rs ${escapeHtml(input.amountLkr.trim())}</li>`
    : "";
  const amountText = input.amountLkr?.trim()
    ? `Amount: Rs ${input.amountLkr.trim()}\n`
    : "";

  const instructionsText = input.paymentInstructionsText?.trim() ?? "";
  const instructionsHtml = instructionsText
    ? `<p style="white-space: pre-wrap;">${escapeHtml(instructionsText)}</p>`
    : "";
  const instructionsPlain = instructionsText ? `${instructionsText}\n` : "";

  const whatsapp = input.paymentWhatsappNumber?.trim() ?? "";
  const whatsappHtml = whatsapp
    ? `<p>After paying, please send your payment receipt on WhatsApp to <strong>${escapeHtml(whatsapp)}</strong>.</p>`
    : "";
  const whatsappPlain = whatsapp
    ? `After paying, please send your payment receipt on WhatsApp to ${whatsapp}.\n`
    : "";

  const subject = "Your appointment is booked — payment pending";

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #2f3334;">
  <p>Hi ${clientName},</p>
  <p>Your appointment has been booked. <strong>Payment is required to confirm your slot.</strong></p>
  <p><strong>Appointment details</strong></p>
  <ul>
    <li><strong>Date:</strong> ${escapeHtml(String(dateLabel))}</li>
    <li><strong>Time:</strong> ${escapeHtml(String(timeLabel))}</li>
    <li><strong>Type:</strong> ${appointmentTypeLabel(input.appointmentType)}</li>
    ${serviceLine}
    ${therapistLine}
    ${amountLine}
  </ul>
  <p><strong>Payment deadline:</strong> ${escapeHtml(paymentDueLabel)}</p>
  <p><strong>How to pay</strong></p>
  ${instructionsHtml}
  ${whatsappHtml}
  <p>If you have questions, please contact us.</p>
  <p>— CAFS</p>
</body>
</html>`.trim();

  const text = [
    `Hi ${input.clientName.trim() || "there"},`,
    "",
    "Your appointment has been booked. Payment is required to confirm your slot.",
    "",
    "Appointment details:",
    `Date: ${dateLabel}`,
    `Time: ${timeLabel}`,
    `Type: ${appointmentTypeLabel(input.appointmentType)}`,
    serviceText,
    therapistText,
    amountText,
    `Payment deadline: ${paymentDueLabel}`,
    "",
    "How to pay:",
    instructionsPlain,
    whatsappPlain,
    "If you have questions, please contact us.",
    "",
    "— CAFS",
  ]
    .filter((line) => line !== "")
    .join("\n");

  return { subject, html, text };
}

export async function sendAppointmentPendingPaymentEmail(
  input: AppointmentPendingPaymentEmailInput,
): Promise<{ ok: true; messageId: string } | { ok: false; error: string }> {
  const { subject, html, text } = buildAppointmentPendingPaymentEmailContent(input);
  return sendEmail({ to: input.to, subject, html, text });
}
