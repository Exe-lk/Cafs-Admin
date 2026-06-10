import { getYMDInTimeZone } from "@/lib/timezone";

export const PAST_APPOINTMENT_MESSAGE = "Appointments cannot be scheduled in the past.";

function pad2(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

export function isAppointmentStartInPast(startUtc: Date, now: Date = new Date()): boolean {
  return startUtc.getTime() < now.getTime();
}

export function validateAppointmentSchedule(args: {
  startUtc: Date;
  endUtc: Date;
  now?: Date;
}): { ok: true } | { ok: false; message: string } {
  const now = args.now ?? new Date();
  if (!(args.endUtc > args.startUtc)) {
    return { ok: false, message: "Invalid startAt/endAt" };
  }
  if (isAppointmentStartInPast(args.startUtc, now)) {
    return { ok: false, message: PAST_APPOINTMENT_MESSAGE };
  }
  return { ok: true };
}

export function minBookableDateInputInTimeZone(timeZone: string): string {
  const ymd = getYMDInTimeZone(new Date(), timeZone);
  return `${ymd.year}-${pad2(ymd.month)}-${pad2(ymd.day)}`;
}
