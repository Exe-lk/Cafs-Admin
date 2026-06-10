import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isAppointmentStartInPast,
  minBookableDateInputInTimeZone,
  PAST_APPOINTMENT_MESSAGE,
  validateAppointmentSchedule,
} from "@/lib/calendar/scheduling";

describe("isAppointmentStartInPast", () => {
  const now = new Date("2026-06-10T12:00:00.000Z");

  it("returns true when start is before now", () => {
    const start = new Date("2026-06-09T16:00:00.000Z");
    expect(isAppointmentStartInPast(start, now)).toBe(true);
  });

  it("returns false when start equals now", () => {
    expect(isAppointmentStartInPast(now, now)).toBe(false);
  });

  it("returns false when start is after now", () => {
    const start = new Date("2026-06-10T16:00:00.000Z");
    expect(isAppointmentStartInPast(start, now)).toBe(false);
  });

  it("returns true for earlier time on the same day", () => {
    const start = new Date("2026-06-10T10:00:00.000Z");
    expect(isAppointmentStartInPast(start, now)).toBe(true);
  });
});

describe("validateAppointmentSchedule", () => {
  const now = new Date("2026-06-10T12:00:00.000Z");

  it("accepts a future appointment range", () => {
    const result = validateAppointmentSchedule({
      startUtc: new Date("2026-06-11T10:00:00.000Z"),
      endUtc: new Date("2026-06-11T11:00:00.000Z"),
      now,
    });
    expect(result).toEqual({ ok: true });
  });

  it("rejects when end is not after start", () => {
    const start = new Date("2026-06-11T10:00:00.000Z");
    const result = validateAppointmentSchedule({
      startUtc: start,
      endUtc: start,
      now,
    });
    expect(result).toEqual({ ok: false, message: "Invalid startAt/endAt" });
  });

  it("rejects when end is before start", () => {
    const result = validateAppointmentSchedule({
      startUtc: new Date("2026-06-11T11:00:00.000Z"),
      endUtc: new Date("2026-06-11T10:00:00.000Z"),
      now,
    });
    expect(result).toEqual({ ok: false, message: "Invalid startAt/endAt" });
  });

  it("rejects a past-day appointment (June 9 when today is June 10)", () => {
    const result = validateAppointmentSchedule({
      startUtc: new Date("2026-06-09T16:00:00.000Z"),
      endUtc: new Date("2026-06-09T17:00:00.000Z"),
      now,
    });
    expect(result).toEqual({ ok: false, message: PAST_APPOINTMENT_MESSAGE });
  });

  it("rejects an earlier-time slot on the same day", () => {
    const result = validateAppointmentSchedule({
      startUtc: new Date("2026-06-10T10:00:00.000Z"),
      endUtc: new Date("2026-06-10T11:00:00.000Z"),
      now,
    });
    expect(result).toEqual({ ok: false, message: PAST_APPOINTMENT_MESSAGE });
  });

  it("allows a later-time slot on the same day", () => {
    const result = validateAppointmentSchedule({
      startUtc: new Date("2026-06-10T14:00:00.000Z"),
      endUtc: new Date("2026-06-10T15:00:00.000Z"),
      now,
    });
    expect(result).toEqual({ ok: true });
  });

  it("allows an appointment starting exactly at now", () => {
    const result = validateAppointmentSchedule({
      startUtc: now,
      endUtc: new Date("2026-06-10T13:00:00.000Z"),
      now,
    });
    expect(result).toEqual({ ok: true });
  });
});

describe("minBookableDateInputInTimeZone", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns therapist-local today as YYYY-MM-DD", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-10T02:30:00.000Z"));

    expect(minBookableDateInputInTimeZone("Asia/Colombo")).toBe("2026-06-10");
  });

  it("uses the therapist timezone, not UTC midnight edge cases", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-09T20:00:00.000Z"));

    expect(minBookableDateInputInTimeZone("Asia/Colombo")).toBe("2026-06-10");
    expect(minBookableDateInputInTimeZone("UTC")).toBe("2026-06-09");
  });
});
