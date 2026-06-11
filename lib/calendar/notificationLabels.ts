const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  booking_confirmation: "Booking confirmation",
  appointment_reminder: "Appointment reminder",
  payment_confirmation: "Payment confirmation",
  payment_receipt: "Payment receipt",
  payment_reminder: "Payment reminder",
  cancellation: "Cancellation",
  reschedule: "Reschedule",
};

const CHANNEL_LABELS: Record<string, string> = {
  email: "Email",
  sms: "SMS",
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  gateway: "Online gateway",
  bank_transfer: "Bank transfer",
  cash: "Cash",
};

function titleCaseWords(value: string): string {
  return value
    .split("_")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function labelForNotificationType(type: string): string {
  return NOTIFICATION_TYPE_LABELS[type] ?? titleCaseWords(type);
}

export function labelForNotificationChannel(channel: string): string {
  return CHANNEL_LABELS[channel] ?? titleCaseWords(channel);
}

export function labelForPaymentMethod(method: string): string {
  return PAYMENT_METHOD_LABELS[method] ?? titleCaseWords(method);
}
