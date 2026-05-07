import type { NextRequest } from "next/server";
import { ok, err } from "@/lib/api/envelope";
import { getAuthContext, requireRoleService } from "@/lib/api/auth";
import { newUuid } from "@/lib/api/ids";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

type Item = {
  dayOfWeek: number; // 1=Mon..7=Sun
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
  isActive: boolean;
};

type PutBody = {
  items?: Item[];
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ therapistId: string }> },
) {
  const { therapistId } = await params;
  const auth = await getAuthContext(request);
  if (!auth.ok) return err("Unauthorized", 401);
  const roleCheck = await requireRoleService(auth.ctx.user.id, ["admin"]);
  if (!roleCheck.ok) return err("Forbidden", 403);

  const adminSupabase = createSupabaseServiceRoleClient();
  const { data, error } = await adminSupabase
    .from("therapist_working_hours")
    .select("day_of_week,start_time,end_time,is_active,created_at")
    .eq("therapist_id", therapistId)
    .order("day_of_week", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) return err(error.message, 400);

  const items: Item[] = (data ?? []).map((row) => {
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

  const res = ok({ items }, "Working hours retrieved successfully");
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ therapistId: string }> },
) {
  const { therapistId } = await params;
  const auth = await getAuthContext(request);
  if (!auth.ok) return err("Unauthorized", 401);
  const roleCheck = await requireRoleService(auth.ctx.user.id, ["admin"]);
  if (!roleCheck.ok) return err("Forbidden", 403);

  let body: PutBody;
  try {
    body = (await request.json()) as PutBody;
  } catch {
    return err("Invalid JSON body", 400);
  }

  const items = Array.isArray(body.items) ? body.items : null;
  if (!items) return err("Validation error", 400, [{ field: "items", message: "Required" }]);

  const adminSupabase = createSupabaseServiceRoleClient();
  const now = new Date().toISOString();

  // Replace weekly template: remove existing rows, then insert the submitted week (one PUT = one DB state).
  const { error: deleteError } = await adminSupabase
    .from("therapist_working_hours")
    .delete()
    .eq("therapist_id", therapistId);
  if (deleteError) return err(deleteError.message, 400);

  const rows = items.map((it) => ({
    working_hours_id: newUuid(),
    therapist_id: therapistId,
    day_of_week: clampInt(it.dayOfWeek, 1, 7),
    start_time: normalizeTime(it.startTime),
    end_time: normalizeTime(it.endTime),
    is_active: Boolean(it.isActive),
    created_at: now,
  }));

  const { error } = await adminSupabase.from("therapist_working_hours").insert(rows);
  if (error) return err(error.message, 400);

  const res = ok(null, "Working hours updated successfully");
  res.headers.set("Cache-Control", "no-store");
  return res;
}

function normalizeTime(raw: string): string {
  // Store as HH:MM:SS for Postgres `time`.
  const m = /^(\d{2}):(\d{2})$/.exec(String(raw).trim());
  if (!m) return "00:00:00";
  return `${m[1]}:${m[2]}:00`;
}

function timeToHHMM(raw: string): string {
  const m = /^(\d{2}):(\d{2})/.exec(raw.trim());
  if (!m) return "00:00";
  return `${m[1]}:${m[2]}`;
}

function clampInt(n: unknown, min: number, max: number): number {
  const x = Number(n);
  if (!Number.isFinite(x)) return min;
  return Math.min(max, Math.max(min, Math.trunc(x)));
}

