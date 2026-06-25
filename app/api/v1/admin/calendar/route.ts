import type { NextRequest } from "next/server";
import { ok, err } from "@/lib/api/envelope";
import { getAuthContext, requireRoleService } from "@/lib/api/auth";
import { parseIsoDateParam } from "@/lib/api/http";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { resolveBankSlipProofUrl } from "@/lib/calendar/bankSlipProof";
import {
  calendarAppointmentTypeLine,
  calendarPaymentBadge,
} from "@/lib/calendar/calendarEventDisplay";
import { parseTimeBlockKindAndLabel } from "@/lib/calendar/timeBlocks";
import { timeToHHMM, type WorkingHoursSlot } from "@/lib/calendar/workingHours";
import { formatDbUtcTimestamp, normalizeTimeZone, parseDbUtcTimestamp } from "@/lib/timezone";

type AppointmentRow = {
  appointment_id: string;
  therapist_id: string;
  start_at: string;
  end_at: string;
  appointment_type: "online" | "in_person";
  status: string;
  meet_link?: string | null;
  client:
    | { full_name?: string | null }
    | Array<{ full_name?: string | null }>
    | null;
  service:
    | { name?: string | null }
    | Array<{ name?: string | null }>
    | null;
  payments:
    | {
        method?: "gateway" | "bank_transfer" | "cash";
        status?: string | null;
        paid_at?: string | null;
        provider_payload?: string | null;
      }
    | Array<{
        method?: "gateway" | "bank_transfer" | "cash";
        status?: string | null;
        paid_at?: string | null;
        provider_payload?: string | null;
      }>
    | null;
};

function firstOrSelf<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function str(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request);
  if (!auth.ok) return err("Unauthorized", 401);
  const roleCheck = await requireRoleService(auth.ctx.user.id, [
    "admin",
    "front_office",
  ]);
  if (!roleCheck.ok) return err("Forbidden", 403);

  const sp = request.nextUrl.searchParams;
  const therapistId = sp.get("therapistId")?.trim() || null;
  const clientId = sp.get("clientId")?.trim() || null;
  const fromD = parseIsoDateParam(sp.get("from"));
  const toD = parseIsoDateParam(sp.get("to"));

  const adminSupabase = createSupabaseServiceRoleClient();
  let q = adminSupabase
    .from("appointments")
    .select(
      `
      appointment_id,
      therapist_id,
      start_at,
      end_at,
      appointment_type,
      status,
      meet_link,
      payments(method, status, paid_at, provider_payload),
      client:profiles!appointments_client_id_fkey(user_id, full_name),
      service:services!appointments_service_id_fkey(service_id, name)
    `,
    )
    .order("start_at", { ascending: true });

  if (therapistId) q = q.eq("therapist_id", therapistId);
  if (clientId) q = q.eq("client_id", clientId);
  if (fromD) q = q.gte("start_at", fromD.toISOString());
  if (toD) q = q.lt("start_at", toD.toISOString());

  const { data, error } = await q;
  if (error) return err(error.message, 400);

  const rows = (data ?? []) as AppointmentRow[];
  const items = await Promise.all(
    rows.map(async (a) => {
      const proofUrl = await resolveBankSlipProofUrl(adminSupabase, a);
      const startUtc = parseDbUtcTimestamp(a.start_at);
      const endUtc = parseDbUtcTimestamp(a.end_at);
      const client = firstOrSelf(a.client);
      const service = firstOrSelf(a.service);
      const payment = firstOrSelf(a.payments);
      const clientName = str(client?.full_name).trim() || "Customer";
      const serviceName = str(service?.name).trim();
      const appointmentTypeLine = calendarAppointmentTypeLine(a.appointment_type, serviceName);
      const paymentBadge = calendarPaymentBadge(a.status, payment);
      return {
        therapistId: a.therapist_id,
        type: "appointment" as const,
        appointmentId: a.appointment_id,
        startAt: startUtc ? formatDbUtcTimestamp(startUtc) : a.start_at,
        endAt: endUtc ? formatDbUtcTimestamp(endUtc) : a.end_at,
        appointmentType: a.appointment_type,
        status: a.status,
        clientName,
        serviceName,
        appointmentTypeLine,
        paymentBadge,
        proofUrl,
        meetLink: str(a.meet_link).trim() || null,
      };
    }),
  );

  let therapistTimezone: string | undefined;
  let timeBlocks: Array<{
    timeBlockId: string;
    startAt: string;
    endAt: string;
    kind: "time_off" | "break";
    label: string;
  }> = [];
  let workingHours: WorkingHoursSlot[] = [];

  if (therapistId) {
    const { data: tzRow } = await adminSupabase
      .from("therapists")
      .select("timezone")
      .eq("therapist_id", therapistId)
      .maybeSingle();
    therapistTimezone = normalizeTimeZone(
      String((tzRow as { timezone?: unknown } | null)?.timezone ?? ""),
    );

    if (fromD && toD) {
      const blockQ = adminSupabase
        .from("therapist_time_blocks")
        .select("time_block_id,start_at,end_at,reason")
        .eq("therapist_id", therapistId)
        .gt("end_at", fromD.toISOString())
        .lt("start_at", toD.toISOString())
        .or("reason.like.time-off:%,reason.like.break:%")
        .order("start_at", { ascending: true });

      const { data: blockRows, error: blockErr } = await blockQ;
      if (blockErr) return err(blockErr.message, 400);

      timeBlocks = (blockRows ?? [])
        .map((row) => {
          const b = (row && typeof row === "object" ? (row as Record<string, unknown>) : {}) as Record<
            string,
            unknown
          >;
          const reason = b.reason === null ? null : String(b.reason);
          const parsed = parseTimeBlockKindAndLabel(reason);
          if (!parsed) return null;
          const startUtc = parseDbUtcTimestamp(String(b.start_at));
          const endUtc = parseDbUtcTimestamp(String(b.end_at));
          if (!startUtc || !endUtc) return null;
          return {
            timeBlockId: String(b.time_block_id),
            startAt: formatDbUtcTimestamp(startUtc),
            endAt: formatDbUtcTimestamp(endUtc),
            kind: parsed.kind,
            label: parsed.label,
          };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);
    }

    const { data: whRows, error: whErr } = await adminSupabase
      .from("therapist_working_hours")
      .select("day_of_week,start_time,end_time,is_active")
      .eq("therapist_id", therapistId)
      .order("day_of_week", { ascending: true });
    if (whErr) return err(whErr.message, 400);

    workingHours = (whRows ?? []).map((row) => {
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
  }

  const res = ok(
    {
      items,
      therapistTimezone,
      timeBlocks,
      workingHours,
    },
    "Team calendar retrieved successfully",
  );
  res.headers.set("Cache-Control", "no-store");
  return res;
}

