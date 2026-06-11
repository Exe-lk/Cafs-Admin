import {
  addDaysToYMD,
  type YMD,
  zonedLocalYmdTimeToUtc,
} from "@/lib/timezone";

export type TimeBlockKind = "time_off" | "break";

export type TimeBlockRange = {
  startUtc: Date;
  endUtc: Date;
  label?: string;
};

function pad2(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

export function parseTimeBlockKindAndLabel(
  reason: string | null,
): { kind: TimeBlockKind; label: string } | null {
  if (!reason) return null;
  if (reason.startsWith("time-off:")) {
    const label = reason.slice("time-off:".length).trim() || "Time off";
    return { kind: "time_off", label };
  }
  if (reason.startsWith("break:")) {
    return { kind: "break", label: "Break" };
  }
  return null;
}

export function intervalsOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function isRangeBlocked(startUtc: Date, endUtc: Date, blocks: TimeBlockRange[]): boolean {
  return blocks.some((b) => intervalsOverlap(startUtc, endUtc, b.startUtc, b.endUtc));
}

function hourCellEndUtc(ymd: YMD, hour: number, timeZone: string): Date {
  if (hour === 23) {
    return zonedLocalYmdTimeToUtc(addDaysToYMD(ymd, 1), "00:00", timeZone);
  }
  return zonedLocalYmdTimeToUtc(ymd, `${pad2(hour + 1)}:00`, timeZone);
}

export function segmentsInHour(
  block: TimeBlockRange,
  ymd: YMD,
  hour: number,
  timeZone: string,
): { topPct: number; heightPct: number; label?: string } | null {
  const cellStart = zonedLocalYmdTimeToUtc(ymd, `${pad2(hour)}:00`, timeZone);
  const cellEnd = hourCellEndUtc(ymd, hour, timeZone);

  if (!intervalsOverlap(block.startUtc, block.endUtc, cellStart, cellEnd)) return null;

  const segStart = Math.max(block.startUtc.getTime(), cellStart.getTime());
  const segEnd = Math.min(block.endUtc.getTime(), cellEnd.getTime());
  const cellMs = cellEnd.getTime() - cellStart.getTime();
  if (cellMs <= 0 || segEnd <= segStart) return null;

  const topPct = ((segStart - cellStart.getTime()) / cellMs) * 100;
  const heightPct = ((segEnd - segStart) / cellMs) * 100;

  return { topPct, heightPct, label: block.label };
}
