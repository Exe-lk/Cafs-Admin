import {
  addDaysToYMD,
  getYMDInTimeZone,
  type YMD,
  zonedLocalYmdTimeToUtc,
} from "@/lib/timezone";

export type WorkingHoursSlot = {
  dayOfWeek: number; // 1=Mon .. 7=Sun
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
  isActive: boolean;
};

function pad2(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

export function hhmmToMinutes(hhmm: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return 0;
  return Number(m[1]) * 60 + Number(m[2]);
}

export function dayOfWeek1to7InTimeZone(ymd: YMD, timeZone: string): number {
  const probe = zonedLocalYmdTimeToUtc(ymd, "12:00", timeZone);
  const wd = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(probe);
  const map: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  return map[wd] ?? 1;
}

export function minutesInTimeZone(d: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(d);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return hour * 60 + minute;
}

function hourCellEndUtc(ymd: YMD, hour: number, timeZone: string): Date {
  if (hour === 23) {
    return zonedLocalYmdTimeToUtc(addDaysToYMD(ymd, 1), "00:00", timeZone);
  }
  return zonedLocalYmdTimeToUtc(ymd, `${pad2(hour + 1)}:00`, timeZone);
}

function activeSlotsForDay(slots: WorkingHoursSlot[], dayOfWeek: number): WorkingHoursSlot[] {
  return slots.filter((s) => s.isActive && s.dayOfWeek === dayOfWeek);
}

function rangeFitsSingleDaySlots(
  startUtc: Date,
  endUtc: Date,
  ymd: YMD,
  slots: WorkingHoursSlot[],
  timeZone: string,
): boolean {
  const dow = dayOfWeek1to7InTimeZone(ymd, timeZone);
  const daySlots = activeSlotsForDay(slots, dow);
  if (!daySlots.length) return false;

  const startMin = minutesInTimeZone(startUtc, timeZone);
  const endMin = minutesInTimeZone(endUtc, timeZone);

  return daySlots.some(
    (slot) =>
      startMin >= hhmmToMinutes(slot.startTime) && endMin <= hhmmToMinutes(slot.endTime),
  );
}

export function isRangeWithinWorkingHours(
  startUtc: Date,
  endUtc: Date,
  slots: WorkingHoursSlot[],
  timeZone: string,
): boolean {
  if (!slots.length || !(endUtc > startUtc)) return false;

  const startYmd = getYMDInTimeZone(startUtc, timeZone);
  const endYmd = getYMDInTimeZone(new Date(endUtc.getTime() - 1), timeZone);

  let ymd = startYmd;
  while (
    ymd.year < endYmd.year ||
    (ymd.year === endYmd.year && ymd.month < endYmd.month) ||
    (ymd.year === endYmd.year && ymd.month === endYmd.month && ymd.day <= endYmd.day)
  ) {
    const dayStart = zonedLocalYmdTimeToUtc(ymd, "00:00", timeZone);
    const dayEnd = zonedLocalYmdTimeToUtc(addDaysToYMD(ymd, 1), "00:00", timeZone);
    const segStart = new Date(Math.max(startUtc.getTime(), dayStart.getTime()));
    const segEnd = new Date(Math.min(endUtc.getTime(), dayEnd.getTime()));
    if (segEnd > segStart && !rangeFitsSingleDaySlots(segStart, segEnd, ymd, slots, timeZone)) {
      return false;
    }
    ymd = addDaysToYMD(ymd, 1);
  }

  return true;
}

/** Returns off-hour segments within an hour cell (inverse of working-hour coverage). */
export function offHoursSegmentsInHour(
  slots: WorkingHoursSlot[],
  ymd: YMD,
  hour: number,
  timeZone: string,
): Array<{ topPct: number; heightPct: number }> {
  const cellStart = zonedLocalYmdTimeToUtc(ymd, `${pad2(hour)}:00`, timeZone);
  const cellEnd = hourCellEndUtc(ymd, hour, timeZone);
  const cellMs = cellEnd.getTime() - cellStart.getTime();
  if (cellMs <= 0) return [{ topPct: 0, heightPct: 100 }];

  const dow = dayOfWeek1to7InTimeZone(ymd, timeZone);
  const daySlots = activeSlotsForDay(slots, dow);

  if (!daySlots.length) {
    return [{ topPct: 0, heightPct: 100 }];
  }

  const hourStartMin = hour * 60;
  const hourEndMin = hour === 23 ? 24 * 60 : (hour + 1) * 60;

  type Interval = { start: number; end: number };
  const covered: Interval[] = daySlots
    .map((s) => ({
      start: Math.max(hourStartMin, hhmmToMinutes(s.startTime)),
      end: Math.min(hourEndMin, hhmmToMinutes(s.endTime)),
    }))
    .filter((i) => i.end > i.start)
    .sort((a, b) => a.start - b.start);

  if (!covered.length) {
    return [{ topPct: 0, heightPct: 100 }];
  }

  const merged: Interval[] = [];
  for (const interval of covered) {
    const last = merged[merged.length - 1];
    if (last && interval.start <= last.end) {
      last.end = Math.max(last.end, interval.end);
    } else {
      merged.push({ ...interval });
    }
  }

  const offSegments: Interval[] = [];
  let cursor = hourStartMin;
  for (const interval of merged) {
    if (interval.start > cursor) {
      offSegments.push({ start: cursor, end: interval.start });
    }
    cursor = Math.max(cursor, interval.end);
  }
  if (cursor < hourEndMin) {
    offSegments.push({ start: cursor, end: hourEndMin });
  }

  return offSegments.map((seg) => ({
    topPct: ((seg.start - hourStartMin) / (hourEndMin - hourStartMin)) * 100,
    heightPct: ((seg.end - seg.start) / (hourEndMin - hourStartMin)) * 100,
  }));
}

export function timeToHHMM(raw: string): string {
  const m = /^(\d{2}):(\d{2})/.exec(raw.trim());
  if (!m) return "00:00";
  return `${m[1]}:${m[2]}`;
}
