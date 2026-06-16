import type { SupabaseClient } from "@supabase/supabase-js";
import { newUuid } from "@/lib/api/ids";

export const AUDIT_ENTITY_APPOINTMENT = "appointment" as const;

export type AuditAction = "created" | "updated" | "cancelled" | "rejected";

export type AuditFieldChange = {
  from: string | null;
  to: string | null;
};

export type AppointmentAuditMetadata = {
  clientId?: string;
  serviceName?: string | null;
  startAt?: string | null;
  status?: string | null;
  changes?: Record<string, AuditFieldChange>;
  cancelReason?: string | null;
  reason?: string | null;
};

export type WriteAuditLogArgs = {
  actorUserId: string | null;
  action: AuditAction | string;
  entity: typeof AUDIT_ENTITY_APPOINTMENT | string;
  entityId: string;
  metadata?: AppointmentAuditMetadata | Record<string, unknown> | null;
};

type ExistingAppointmentRow = {
  therapist_id?: string;
  service_id?: string;
  appointment_type?: string;
  status?: string;
  start_at?: string;
  end_at?: string;
  cancel_reason?: string | null;
};

type AppointmentUpdateInput = {
  therapistId?: string;
  serviceId?: string;
  appointmentType?: string;
  status?: string;
  startAt?: string;
  endAt?: string;
  cancelReason?: string;
};

function addChange(
  changes: Record<string, AuditFieldChange>,
  field: string,
  from: string | null | undefined,
  to: string | null | undefined,
) {
  const fromStr = from == null || from === "" ? null : String(from);
  const toStr = to == null || to === "" ? null : String(to);
  if (fromStr === toStr) return;
  changes[field] = { from: fromStr, to: toStr };
}

export function buildAppointmentUpdateChanges(
  existing: ExistingAppointmentRow,
  body: AppointmentUpdateInput,
  resolved: {
    startAt?: string;
    endAt?: string;
  } = {},
): Record<string, AuditFieldChange> {
  const changes: Record<string, AuditFieldChange> = {};

  if (typeof body.therapistId === "string") {
    addChange(changes, "therapistId", existing.therapist_id, body.therapistId);
  }
  if (typeof body.serviceId === "string") {
    addChange(changes, "serviceId", existing.service_id, body.serviceId);
  }
  if (body.appointmentType) {
    addChange(changes, "appointmentType", existing.appointment_type, body.appointmentType);
  }
  if (body.status) {
    addChange(changes, "status", existing.status, body.status);
  }
  if (typeof body.startAt === "string" && resolved.startAt) {
    addChange(changes, "startAt", existing.start_at, resolved.startAt);
  }
  if (typeof body.endAt === "string" && resolved.endAt) {
    addChange(changes, "endAt", existing.end_at, resolved.endAt);
  }
  if (typeof body.cancelReason === "string" && body.cancelReason.trim()) {
    addChange(
      changes,
      "cancelReason",
      existing.cancel_reason,
      body.cancelReason.trim(),
    );
  }

  return changes;
}

export async function writeAuditLog(
  supabase: SupabaseClient,
  args: WriteAuditLogArgs,
): Promise<void> {
  const now = new Date().toISOString();
  const metadataJson =
    args.metadata != null && Object.keys(args.metadata).length > 0
      ? JSON.stringify(args.metadata)
      : null;

  const { error } = await supabase.from("audit_log").insert({
    audit_id: newUuid(),
    actor_user_id: args.actorUserId,
    action: args.action,
    entity: args.entity,
    entity_id: args.entityId,
    metadata_json: metadataJson,
    created_at: now,
  });

  if (error) {
    console.error("[audit_log] insert failed", {
      entity: args.entity,
      entityId: args.entityId,
      action: args.action,
      message: error.message,
    });
  }
}
