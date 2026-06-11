export type ApprovalStatus = "pending" | "accepted" | "rejected";

export type DbAppointmentStatus =
  | "pending_payment"
  | "pending_confirmation"
  | "confirmed"
  | "cancelled"
  | "completed"
  | "no_show"
  | "expired";

export const PENDING_APPOINTMENT_STATUSES = [
  "pending_payment",
  "pending_confirmation",
] as const satisfies readonly DbAppointmentStatus[];

export const REJECTABLE_APPOINTMENT_STATUSES = [
  "pending_payment",
  "pending_confirmation",
] as const satisfies readonly DbAppointmentStatus[];

export const LISTABLE_APPOINTMENT_STATUSES = [
  "pending_payment",
  "pending_confirmation",
  "confirmed",
] as const satisfies readonly DbAppointmentStatus[];

export function approvalStatusForAppointmentStatus(status: string): ApprovalStatus {
  if (status === "pending_payment" || status === "pending_confirmation") return "pending";
  if (status === "confirmed" || status === "completed") return "accepted";
  if (status === "cancelled" || status === "no_show" || status === "expired") return "rejected";
  return "pending";
}
