import type { NextRequest } from "next/server";
import { ok, err } from "@/lib/api/envelope";
import { getAuthContext, requireRoleService } from "@/lib/api/auth";
import { newUuid } from "@/lib/api/ids";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

type PutBody = {
  horizonDays?: number; // default 56
  items?: Array<{
    dayOfWeek: number; // 1=Mon..7=Sun
    ranges: Array<{ startTime: string; endTime: string }>; // "HH:MM"
  }>;
};

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

  const horizonDays = clampInt(body.horizonDays ?? 56, 7, 365);
  const now = new Date();

  const adminSupabase = createSupabaseServiceRoleClient();

  const timezone = await getTherapistTimezone(adminSupabase, therapistId);

  // Replace strategy: delete future break blocks created by this admin (safe, avoids nuking therapist time-off).
  const { error: delErr } = await adminSupabase
    .from("therapist_time_blocks")
    .delete()
    .eq("therapist_id", therapistId)
    .eq("created_by", auth.ctx.user.id)
    .like("reason", "break:%")
    .gte("start_at", now.toISOString());
  if (delErr) return err(delErr.message, 400);

  const rows: Array<Record<string, unknown>> = [];
  const createdAt = new Date().toISOString();

  const todayLocal = getLocalYMD(now, timezone);
  for (let i = 0; i < horizonDays; i++) {
    const ymd = addDaysToYMD(todayLocal, i);
    const dow = dayOfWeek1to7InTimeZone(ymd, timezone);
    const entry = items.find((x) => clampInt(x.dayOfWeek, 1, 7) === dow);
    if (!entry) continue;

    for (const r of entry.ranges ?? []) {
      const startTime = String(r.startTime ?? "00:00");
      const endTime = String(r.endTime ?? "00:00");
      const startAt = zonedLocalYmdTimeToUtc(ymd, startTime, timezone);
      const endAt = zonedLocalYmdTimeToUtc(ymd, endTime, timezone);
      if (!(endAt > startAt)) continue;
      rows.push({
        time_block_id: newUuid(),
        therapist_id: therapistId,
        start_at: startAt.toISOString(),
        end_at: endAt.toISOString(),
        reason: `break:${dow}:${startTime}-${endTime}`,
        is_visible_to_client: false,
        created_by: auth.ctx.user.id,
        created_at: createdAt,
      });
    }
  }

  if (rows.length) {
    const { error: insErr } = await adminSupabase.from("therapist_time_blocks").insert(rows);
    if (insErr) return err(insErr.message, 400);
  }

  const res = ok({ inserted: rows.length, horizonDays }, "Breaks updated successfully");
  res.headers.set("Cache-Control", "no-store");
  return res;
}
async function getTherapistTimezone(
  supabase: ReturnType<typeof createSupabaseServiceRoleClient>,
  therapistId: string,
): Promise<string> {
  const { data, error } = await supabase
    .from("therapists")
    .select("timezone")
    .eq("therapist_id", therapistId)
    .maybeSingle();
  if (error) return "Asia/Colombo";
  const tz = String((data as any)?.timezone ?? "").trim();
  return tz || "Asia/Colombo";
}

type YMD = { year: number; month: number; day: number };

function getLocalYMD(d: Date, timeZone: string): YMD {
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = dtf.formatToParts(d);
  const y = Number(parts.find((p) => p.type === "year")?.value ?? "");
  const m = Number(parts.find((p) => p.type === "month")?.value ?? "");
  const day = Number(parts.find((p) => p.type === "day")?.value ?? "");
  return { year: y, month: m, day };
}

function addDaysToYMD(ymd: YMD, days: number): YMD {
  const base = Date.UTC(ymd.year, ymd.month - 1, ymd.day + days);
  const d = new Date(base);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

function dayOfWeek1to7InTimeZone(ymd: YMD, timeZone: string): number {
  // Use local noon to avoid edge cases around midnight transitions.
  const probe = zonedLocalYmdTimeToUtc(ymd, "12:00", timeZone);
  const wd = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(probe);
  const map: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  return map[wd] ?? 1;
}

function zonedLocalYmdTimeToUtc(ymd: YMD, time: string, timeZone: string): Date {
  const m = /^(\d{2}):(\d{2})$/.exec(time.trim());
  const hh = m ? Number(m[1]) : 0;
  const mm = m ? Number(m[2]) : 0;

  // Start with a UTC guess, then correct using computed timezone offset (handles DST too).
  let guess = Date.UTC(ymd.year, ymd.month - 1, ymd.day, hh, mm, 0);
  for (let i = 0; i < 2; i++) {
    const offsetMin = getTimeZoneOffsetMinutes(new Date(guess), timeZone);
    guess = Date.UTC(ymd.year, ymd.month - 1, ymd.day, hh, mm, 0) - offsetMin * 60_000;
  }
  return new Date(guess);
}

function getTimeZoneOffsetMinutes(utcDate: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = dtf.formatToParts(utcDate);
  const year = Number(parts.find((p) => p.type === "year")?.value ?? "0");
  const month = Number(parts.find((p) => p.type === "month")?.value ?? "1");
  const day = Number(parts.find((p) => p.type === "day")?.value ?? "1");
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  const second = Number(parts.find((p) => p.type === "second")?.value ?? "0");
  const asIfUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  return (asIfUtc - utcDate.getTime()) / 60_000;
}

function clampInt(n: unknown, min: number, max: number): number {
  const x = Number(n);
  if (!Number.isFinite(x)) return min;
  return Math.min(max, Math.max(min, Math.trunc(x)));
}


