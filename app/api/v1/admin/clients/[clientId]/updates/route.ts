import type { NextRequest } from "next/server";
import { ok, err } from "@/lib/api/envelope";
import { getAuthContext, requireRoleService } from "@/lib/api/auth";
import {
  formatAuditDescription,
  labelForAuditAction,
} from "@/lib/audit/labels";
import type { AppointmentAuditMetadata } from "@/lib/audit/writeAuditLog";
import { AUDIT_ENTITY_APPOINTMENT } from "@/lib/audit/writeAuditLog";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { formatDbUtcTimestamp, parseDbUtcTimestamp } from "@/lib/timezone";

const UPDATES_LIMIT = 200;

type AppointmentRow = {
  appointment_id: string;
  start_at: string;
  service:
    | { name?: string | null }
    | Array<{ name?: string | null }>
    | null;
};

type AuditRow = {
  audit_id: string;
  actor_user_id: string | null;
  action: string;
  entity_id: string | null;
  metadata_json: string | null;
  created_at: string;
};

function firstOrSelf<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function str(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function parseMetadata(raw: string | null | undefined): AppointmentAuditMetadata | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AppointmentAuditMetadata;
  } catch {
    return null;
  }
}

function formatOptionalTimestamp(value: string | null | undefined): string | null {
  if (!value) return null;
  const parsed = parseDbUtcTimestamp(value);
  return parsed ? formatDbUtcTimestamp(parsed) : value;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> },
) {
  const { clientId } = await params;
  const auth = await getAuthContext(_request);
  if (!auth.ok) return err("Unauthorized", 401);
  const roleCheck = await requireRoleService(auth.ctx.user.id, [
    "admin",
    "front_office",
  ]);
  if (!roleCheck.ok) return err("Forbidden", 403);

  const adminSupabase = createSupabaseServiceRoleClient();

  const { data: profile, error: profileError } = await adminSupabase
    .from("profiles")
    .select("user_id")
    .eq("user_id", clientId)
    .eq("role", "client")
    .maybeSingle();
  if (profileError) return err(profileError.message, 400);
  if (!profile) return err("Client not found", 404);

  const { data: appointmentRows, error: appointmentsError } = await adminSupabase
    .from("appointments")
    .select(
      `
      appointment_id,
      start_at,
      service:services!appointments_service_id_fkey(name)
    `,
    )
    .eq("client_id", clientId);

  if (appointmentsError) return err(appointmentsError.message, 400);

  const appointments = (appointmentRows ?? []) as AppointmentRow[];
  const appointmentIds = appointments.map((row) => row.appointment_id).filter(Boolean);

  if (!appointmentIds.length) {
    const emptyRes = ok({ items: [], total: 0 }, "Client appointment updates retrieved successfully");
    emptyRes.headers.set("Cache-Control", "no-store");
    return emptyRes;
  }

  const appointmentContextById = new Map(
    appointments.map((row) => {
      const service = firstOrSelf(row.service);
      return [
        row.appointment_id,
        {
          serviceName: str(service?.name) || null,
          startAt: formatOptionalTimestamp(row.start_at),
        },
      ] as const;
    }),
  );

  const { data: auditRows, error: auditError } = await adminSupabase
    .from("audit_log")
    .select("audit_id,actor_user_id,action,entity_id,metadata_json,created_at")
    .eq("entity", AUDIT_ENTITY_APPOINTMENT)
    .in("entity_id", appointmentIds)
    .order("created_at", { ascending: false })
    .limit(UPDATES_LIMIT);

  if (auditError) return err(auditError.message, 400);

  const rows = (auditRows ?? []) as AuditRow[];
  const actorIds = [
    ...new Set(rows.map((row) => row.actor_user_id).filter((id): id is string => Boolean(id))),
  ];

  const actorNameById = new Map<string, string>();
  if (actorIds.length > 0) {
    const { data: actors, error: actorsError } = await adminSupabase
      .from("profiles")
      .select("user_id,full_name")
      .in("user_id", actorIds);
    if (actorsError) return err(actorsError.message, 400);
    for (const actor of actors ?? []) {
      const row = actor as { user_id?: string; full_name?: string | null };
      if (row.user_id) {
        actorNameById.set(row.user_id, str(row.full_name) || "Staff");
      }
    }
  }

  const items = rows
    .filter((row) => row.entity_id)
    .map((row) => {
      const appointmentId = str(row.entity_id);
      const metadata = parseMetadata(row.metadata_json);
      const context = appointmentContextById.get(appointmentId) ?? {
        serviceName: metadata?.serviceName ?? null,
        startAt: formatOptionalTimestamp(metadata?.startAt ?? null),
      };

      return {
        auditId: row.audit_id,
        appointmentId,
        action: row.action,
        title: labelForAuditAction(row.action),
        description: formatAuditDescription(row.action, metadata),
        createdAt: formatOptionalTimestamp(row.created_at) ?? row.created_at,
        actorName: row.actor_user_id
          ? (actorNameById.get(row.actor_user_id) ?? "Staff")
          : null,
        appointmentContext: context,
      };
    });

  const res = ok(
    {
      items,
      total: items.length,
    },
    "Client appointment updates retrieved successfully",
  );
  res.headers.set("Cache-Control", "no-store");
  return res;
}
