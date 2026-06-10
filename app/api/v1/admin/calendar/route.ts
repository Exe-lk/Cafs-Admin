import type { NextRequest } from "next/server";
import { ok, err } from "@/lib/api/envelope";
import { getAuthContext, requireRoleService } from "@/lib/api/auth";
import { parseIsoDateParam } from "@/lib/api/http";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { parseTimeBlockKindAndLabel } from "@/lib/calendar/timeBlocks";
import { timeToHHMM, type WorkingHoursSlot } from "@/lib/calendar/workingHours";
import { formatDbUtcTimestamp, normalizeTimeZone, parseDbUtcTimestamp } from "@/lib/timezone";

const BANK_SLIPS_BUCKET = "bank-slips";
const BANK_SLIP_SIGNED_URL_TTL_SECONDS = 60 * 10;

type AppointmentRow = {
  appointment_id: string;
  therapist_id: string;
  start_at: string;
  end_at: string;
  appointment_type: "online" | "in_person";
  status: string;
  payments:
    | {
        method?: "gateway" | "bank_transfer" | "cash";
        provider_payload?: string | null;
      }
    | Array<{
        method?: "gateway" | "bank_transfer" | "cash";
        provider_payload?: string | null;
      }>
    | null;
};

function normalizeStoragePath(path: string) {
  const trimmed = path.trim().replace(/^\/+/, "");
  if (!trimmed) return null;
  if (trimmed.startsWith(`${BANK_SLIPS_BUCKET}/`)) {
    return trimmed.slice(BANK_SLIPS_BUCKET.length + 1);
  }
  return trimmed;
}

function parseProviderPayload(payload: string | null | undefined): Record<string, unknown> | null {
  if (!payload) return null;
  try {
    const parsed = JSON.parse(payload) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return null;
  }
  return null;
}

function pickFirstString(payload: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

async function resolveBankSlipProofUrl(
  adminSupabase: ReturnType<typeof createSupabaseServiceRoleClient>,
  row: AppointmentRow,
) {
  const payment = Array.isArray(row.payments) ? row.payments[0] : row.payments;
  if (!payment || payment.method !== "bank_transfer") return null;

  const payload = parseProviderPayload(payment.provider_payload);
  if (!payload) return null;

  const directUrl = pickFirstString(payload, [
    "proofUrl",
    "bankSlipUrl",
    "slipUrl",
    "publicUrl",
    "url",
  ]);
  if (directUrl) return directUrl;

  const path = pickFirstString(payload, [
    "proofPath",
    "bankSlipPath",
    "storagePath",
    "path",
    "objectPath",
    "filePath",
    "key",
  ]);
  if (!path) return null;

  const normalizedPath = normalizeStoragePath(path);
  if (!normalizedPath) return null;

  const { data, error } = await adminSupabase.storage
    .from(BANK_SLIPS_BUCKET)
    .createSignedUrl(normalizedPath, BANK_SLIP_SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
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
      "appointment_id,therapist_id,start_at,end_at,appointment_type,status,payments(method,provider_payload)",
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
      return {
        therapistId: a.therapist_id,
        type: "appointment" as const,
        appointmentId: a.appointment_id,
        startAt: startUtc ? formatDbUtcTimestamp(startUtc) : a.start_at,
        endAt: endUtc ? formatDbUtcTimestamp(endUtc) : a.end_at,
        appointmentType: a.appointment_type,
        status: a.status,
        proofUrl,
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

