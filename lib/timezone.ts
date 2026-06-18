export const DEFAULT_THERAPIST_TIMEZONE = "Asia/Colombo";

export type YMD = { year: number; month: number; day: number };

export function normalizeTimeZone(timeZone: string | undefined | null): string {
  const tz = String(timeZone ?? "").trim();
  return tz || DEFAULT_THERAPIST_TIMEZONE;
}

/**
 * Parse DB/API timestamps as UTC. Supabase/Postgres often return `2025-05-29T05:30:00`
 * without a zone suffix; `new Date()` then treats that as local time and breaks calendar placement.
 */
export function parseDbUtcTimestamp(raw: string | Date | null | undefined): Date | null {
  if (raw == null) return null;
  if (raw instanceof Date) return Number.isNaN(raw.getTime()) ? null : raw;

  const s = String(raw).trim();
  if (!s) return null;

  if (/[zZ]$/.test(s) || /[+-]\d{2}:\d{2}$/.test(s) || /[+-]\d{2}$/.test(s)) {
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const normalized = s.includes(" ") ? s.replace(" ", "T") : s;
  const d = new Date(`${normalized}Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDbUtcTimestamp(d: Date): string {
  return d.toISOString();
}

export function sameYMD(a: YMD, b: YMD): boolean {
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

export function wallClockDateToYMD(d: Date): YMD {
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
}

export function getHourInTimeZone(d: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    hourCycle: "h23",
  }).formatToParts(d);
  return Number(parts.find((p) => p.type === "hour")?.value ?? "0");
}

/** UTC instant for 00:00 on the calendar day of `anchor` in `timeZone`. */
export function startOfDayUtcInTimeZone(anchor: Date, timeZone: string): Date {
  const ymd = getYMDInTimeZone(anchor, timeZone);
  return zonedLocalYmdTimeToUtc(ymd, "00:00", timeZone);
}

export function getYMDInTimeZone(d: Date, timeZone: string): YMD {
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = dtf.formatToParts(d);
  return {
    year: Number(parts.find((p) => p.type === "year")?.value ?? ""),
    month: Number(parts.find((p) => p.type === "month")?.value ?? ""),
    day: Number(parts.find((p) => p.type === "day")?.value ?? ""),
  };
}

export function addDaysToYMD(ymd: YMD, days: number): YMD {
  const base = Date.UTC(ymd.year, ymd.month - 1, ymd.day + days);
  const d = new Date(base);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

export function ymdToWallClockDate(ymd: YMD, hour = 12): Date {
  return new Date(ymd.year, ymd.month - 1, ymd.day, hour, 0, 0, 0);
}

export function sameWallClockDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function startOfWeekMondayYMD(anchor: Date, timeZone: string): YMD {
  const ymd = getYMDInTimeZone(anchor, timeZone);
  const dow = dayOfWeek1to7InTimeZone(ymd, timeZone);
  return addDaysToYMD(ymd, -(dow - 1));
}

export function dayOfWeek1to7InTimeZone(ymd: YMD, timeZone: string): number {
  const probe = zonedLocalYmdTimeToUtc(ymd, "12:00", timeZone);
  const wd = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(probe);
  const map: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  return map[wd] ?? 1;
}

export function zonedLocalYmdTimeToUtc(ymd: YMD, time: string, timeZone: string): Date {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  const hh = m ? Number(m[1]) : 0;
  const mm = m ? Number(m[2]) : 0;

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

/** Map a UTC instant to a Date whose local getters match wall clock in `timeZone` (for calendar grids). */
export function utcToWallClockDate(utc: Date, timeZone: string): Date {
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
  const parts = dtf.formatToParts(utc);
  const year = Number(parts.find((p) => p.type === "year")?.value ?? "0");
  const month = Number(parts.find((p) => p.type === "month")?.value ?? "1");
  const day = Number(parts.find((p) => p.type === "day")?.value ?? "1");
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  const second = Number(parts.find((p) => p.type === "second")?.value ?? "0");
  return new Date(year, month - 1, day, hour, minute, second);
}

export function toHHMMInTimeZone(d: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const hh = parts.find((p) => p.type === "hour")?.value ?? "00";
  const mm = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${hh}:${mm}`;
}

export function formatTimeInTimeZone(d: Date, timeZone: string): string {
  return d
    .toLocaleTimeString("en-US", { timeZone, hour: "numeric", minute: "2-digit" })
    .replace(" ", "");
}

export function formatDateInTimeZone(
  d: Date,
  timeZone: string,
  options: Intl.DateTimeFormatOptions,
): string {
  return d.toLocaleDateString("en-US", { ...options, timeZone });
}

export function shiftAnchorInTimeZone(anchor: Date, days: number, timeZone: string): Date {
  const ymd = getYMDInTimeZone(anchor, timeZone);
  return zonedLocalYmdTimeToUtc(addDaysToYMD(ymd, days), "12:00", timeZone);
}

export function shiftAnchorMonthsInTimeZone(anchor: Date, months: number, timeZone: string): Date {
  const ymd = getYMDInTimeZone(anchor, timeZone);
  const monthIndex = ymd.month - 1 + months;
  const year = ymd.year + Math.floor(monthIndex / 12);
  const month = ((monthIndex % 12) + 12) % 12 + 1;
  return zonedLocalYmdTimeToUtc({ year, month, day: 1 }, "12:00", timeZone);
}
