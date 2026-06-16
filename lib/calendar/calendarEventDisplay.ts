export type CalendarPaymentBadge = "Paid" | "Pending";

type PaymentSnapshot = {
  status?: string | null;
  paid_at?: string | null;
} | null;

export function calendarAppointmentTypeLine(
  appointmentType: "online" | "in_person",
  serviceName: string,
): string {
  const typeLabel = appointmentType === "in_person" ? "In Person" : "Online";
  const name = serviceName.trim();
  if (name) return `${typeLabel} ${name}`;
  return appointmentType === "in_person" ? "In Person appointment" : "Online appointment";
}

export function calendarPaymentBadge(
  appointmentStatus: string,
  payment?: PaymentSnapshot,
): CalendarPaymentBadge {
  if (appointmentStatus === "pending_payment") return "Pending";

  const paymentStatus = (payment?.status ?? "").toLowerCase();
  if (
    payment?.paid_at ||
    paymentStatus === "paid" ||
    paymentStatus === "succeeded" ||
    paymentStatus === "completed"
  ) {
    return "Paid";
  }

  if (appointmentStatus === "confirmed" || appointmentStatus === "completed") {
    return "Paid";
  }

  return "Pending";
}
