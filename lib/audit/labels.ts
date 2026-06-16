import type { AppointmentAuditMetadata } from "@/lib/audit/writeAuditLog";
import { parseDbUtcTimestamp } from "@/lib/timezone";

const ACTION_LABELS: Record<string, string> = {
  created: "Appointment created",
  updated: "Appointment updated",
  cancelled: "Appointment cancelled",
  rejected: "Appointment rejected",
};

const FIELD_LABELS: Record<string, string> = {
  status: "Status",
  startAt: "Start time",
  endAt: "End time",
  therapistId: "Therapist",
  serviceId: "Service",
  appointmentType: "Type",
  cancelReason: "Cancel reason",
};

function titleCaseWords(value: string): string {
  return value
    .split("_")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function formatStatusLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return titleCaseWords(value);
}

function formatAppointmentTypeLabel(value: string | null | undefined): string {
  if (value === "online") return "Online";
  if (value === "in_person") return "In-person";
  return formatStatusLabel(value);
}

function formatTimestampLabel(value: string | null | undefined): string {
  if (!value) return "—";
  const parsed = parseDbUtcTimestamp(value);
  if (!parsed) return value;
  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatFieldValue(field: string, value: string | null | undefined): string {
  if (field === "status") return formatStatusLabel(value);
  if (field === "appointmentType") return formatAppointmentTypeLabel(value);
  if (field === "startAt" || field === "endAt") return formatTimestampLabel(value);
  return value?.trim() || "—";
}

export function labelForAuditAction(action: string): string {
  return ACTION_LABELS[action] ?? titleCaseWords(action);
}

export function formatAuditDescription(
  action: string,
  metadata: AppointmentAuditMetadata | Record<string, unknown> | null | undefined,
): string {
  const meta = (metadata ?? {}) as AppointmentAuditMetadata;

  if (action === "created") {
    const parts: string[] = [];
    if (meta.serviceName) parts.push(meta.serviceName);
    if (meta.startAt) parts.push(formatTimestampLabel(meta.startAt));
    if (meta.status) parts.push(formatStatusLabel(meta.status));
    return parts.length ? parts.join(" · ") : "New appointment booked";
  }

  if (action === "cancelled") {
    return meta.cancelReason?.trim() || "Appointment was cancelled";
  }

  if (action === "rejected") {
    return meta.reason?.trim() || "Appointment was rejected";
  }

  if (action === "updated" && meta.changes && Object.keys(meta.changes).length > 0) {
    return Object.entries(meta.changes)
      .map(([field, change]) => {
        const label = FIELD_LABELS[field] ?? titleCaseWords(field);
        const from = formatFieldValue(field, change.from);
        const to = formatFieldValue(field, change.to);
        return `${label}: ${from} → ${to}`;
      })
      .join("; ");
  }

  return "Appointment details were updated";
}

export function iconForAuditAction(action: string): string {
  switch (action) {
    case "created":
      return "event_available";
    case "updated":
      return "edit_calendar";
    case "cancelled":
    case "rejected":
      return "event_busy";
    default:
      return "history";
  }
}
