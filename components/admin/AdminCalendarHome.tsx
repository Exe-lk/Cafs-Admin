"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import MaterialSymbol from "@/components/admin/MaterialSymbol";
import CreateAppointmentModal, {
  type CreateAppointmentInitialSchedule,
} from "@/components/admin/CreateAppointmentModal";
import EditAppointmentModal, { type AdminEditableAppointment } from "@/components/admin/EditAppointmentModal";
import {
  addDaysToYMD,
  formatDateInTimeZone,
  formatTimeInTimeZone,
  getHourInTimeZone,
  getYMDInTimeZone,
  normalizeTimeZone,
  parseDbUtcTimestamp,
  sameYMD,
  shiftAnchorInTimeZone,
  shiftAnchorMonthsInTimeZone,
  startOfWeekMondayYMD,
  type YMD,
  wallClockDateToYMD,
  ymdToWallClockDate,
  zonedLocalYmdTimeToUtc,
} from "@/lib/timezone";

const TIME_LABELS = Array.from({ length: 24 }, (_, i) => {
  if (i === 0) return "12 AM";
  if (i < 12) return `${i} AM`;
  if (i === 12) return "12 PM";
  return `${i - 12} PM`;
});

type CalendarView = "day" | "week" | "month";

type CalEvent = {
  id: string;
  startUtc: Date;
  endUtc: Date;
  title: string;
  subtitle: string;
  variant: "therapy" | "neutral";
  durationMin?: number;
  proofUrl?: string;
  approvalStatus?: "pending" | "accepted" | "rejected";
  appointmentStatus?:
    | "pending_payment"
    | "pending_confirmation"
    | "confirmed"
    | "cancelled"
    | "completed"
    | "no_show"
    | "expired";
};

type ApiEnvelope<T> = {
  status: "success" | "error";
  code: number;
  message: string;
  timestamp: string;
  data: T | null;
  errors?: Array<{ field: string; message: string }>;
};

function formatWeekHeader(weekStartYmd: YMD, weekEndYmd: YMD, timeZone: string): string {
  const weekStart = ymdToWallClockDate(weekStartYmd);
  const weekEnd = ymdToWallClockDate(weekEndYmd);
  const fmt = (d: Date) => formatDateInTimeZone(d, timeZone, { month: "short" });
  const yEnd = weekEndYmd.year;
  if (weekStartYmd.month === weekEndYmd.month) {
    return `${fmt(weekStart)} ${yEnd}`;
  }
  const yStart = weekStartYmd.year;
  if (yStart !== yEnd) {
    return `${fmt(weekStart)} ${yStart} - ${fmt(weekEnd)} ${yEnd}`;
  }
  return `${fmt(weekStart)} - ${fmt(weekEnd)} ${yEnd}`;
}

function rangeForView(view: CalendarView, anchor: Date, weekStartYmd: YMD, timeZone: string) {
  if (view === "day") {
    const ymd = getYMDInTimeZone(anchor, timeZone);
    return {
      from: zonedLocalYmdTimeToUtc(ymd, "00:00", timeZone),
      to: zonedLocalYmdTimeToUtc(addDaysToYMD(ymd, 1), "00:00", timeZone),
    };
  }
  if (view === "week") {
    return {
      from: zonedLocalYmdTimeToUtc(weekStartYmd, "00:00", timeZone),
      to: zonedLocalYmdTimeToUtc(addDaysToYMD(weekStartYmd, 7), "00:00", timeZone),
    };
  }
  const ymd = getYMDInTimeZone(anchor, timeZone);
  const from = zonedLocalYmdTimeToUtc({ year: ymd.year, month: ymd.month, day: 1 }, "00:00", timeZone);
  const nextMonth =
    ymd.month === 12
      ? { year: ymd.year + 1, month: 1, day: 1 }
      : { year: ymd.year, month: ymd.month + 1, day: 1 };
  const to = zonedLocalYmdTimeToUtc(nextMonth, "00:00", timeZone);
  return { from, to };
}

function titleForAppointmentType(t: string | null) {
  if (t === "in_person") return "In-person appointment";
  if (t === "online") return "Online appointment";
  return "Appointment";
}

function approvalStatusForAppointmentStatus(
  status: string,
): "pending" | "accepted" | "rejected" {
  if (status === "pending_payment" || status === "pending_confirmation") return "pending";
  if (status === "confirmed" || status === "completed") return "accepted";
  if (status === "cancelled" || status === "no_show" || status === "expired") return "rejected";
  return "pending";
}

function pad2(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

function slotToInitialSchedule(colDate: Date, hour: number): CreateAppointmentInitialSchedule {
  const d = new Date(colDate);
  return {
    date: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`,
    startTime: `${pad2(hour)}:00`,
    durationMin: 60,
  };
}

export default function AdminCalendarHome({
  therapistId,
  therapistTimezone,
  onAddTherapist,
}: {
  therapistId?: string;
  therapistTimezone?: string;
  onAddTherapist?: () => void;
}) {
  const [timeZone, setTimeZone] = useState(() => normalizeTimeZone(therapistTimezone));
  const [view, setView] = useState<CalendarView>("week");

  useEffect(() => {
    setTimeZone(normalizeTimeZone(therapistTimezone));
  }, [therapistTimezone]);
  const [anchor, setAnchor] = useState(() => new Date());
  const [createOpen, setCreateOpen] = useState(false);
  const [createInitialSchedule, setCreateInitialSchedule] = useState<CreateAppointmentInitialSchedule | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [selected, setSelected] = useState<AdminEditableAppointment | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const actionsMenuRef = useRef<HTMLDivElement>(null);

  const weekStartYmd = useMemo(() => startOfWeekMondayYMD(anchor, timeZone), [anchor, timeZone]);
  const weekEndYmd = useMemo(() => addDaysToYMD(weekStartYmd, 6), [weekStartYmd]);

  const headerTitle = useMemo(() => {
    if (view === "day") {
      return formatDateInTimeZone(anchor, timeZone, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
    if (view === "month") {
      return formatDateInTimeZone(anchor, timeZone, {
        month: "long",
        year: "numeric",
      });
    }
    return formatWeekHeader(weekStartYmd, weekEndYmd, timeZone);
  }, [anchor, timeZone, view, weekEndYmd, weekStartYmd]);

  const dayColumns = useMemo(() => {
    if (view === "day") return [ymdToWallClockDate(getYMDInTimeZone(anchor, timeZone))];
    if (view === "week") {
      return Array.from({ length: 7 }, (_, i) => ymdToWallClockDate(addDaysToYMD(weekStartYmd, i)));
    }
    return [];
  }, [anchor, timeZone, view, weekStartYmd]);

  const [events, setEvents] = useState<CalEvent[]>([]);

  useEffect(() => {
    if (!therapistId) {
      setEvents([]);
      setLoading(false);
      setErrorMsg(null);
      return;
    }

    const { from, to } = rangeForView(view, anchor, weekStartYmd, timeZone);
    const sp = new URLSearchParams();
    sp.set("from", from.toISOString());
    sp.set("to", to.toISOString());
    sp.set("therapistId", therapistId);

    const ac = new AbortController();
    setLoading(true);
    setErrorMsg(null);

    (async () => {
      try {
        const res = await fetch(`/api/v1/admin/calendar?${sp.toString()}`, {
          method: "GET",
          cache: "no-store",
          signal: ac.signal,
        });
        const json = (await res.json()) as ApiEnvelope<{
          therapistTimezone?: string;
          items: Array<{
            therapistId: string;
            type: "appointment";
            appointmentId: string;
            startAt: string;
            endAt: string;
            appointmentType: "online" | "in_person";
            status: string;
            proofUrl?: string | null;
          }>;
        }>;
        if (!res.ok || json.status !== "success" || !json.data) {
          throw new Error(json.message || `Failed to load calendar (HTTP ${res.status})`);
        }

        if (json.data.therapistTimezone) {
          setTimeZone(normalizeTimeZone(json.data.therapistTimezone));
        }

        const nextEvents: CalEvent[] = [];
        for (const it of json.data.items) {
          if (it.status === "cancelled" || it.status === "expired") continue;
          const startUtc = parseDbUtcTimestamp(it.startAt);
          const endUtc = parseDbUtcTimestamp(it.endAt);
          if (!startUtc || !endUtc) continue;
          nextEvents.push({
            id: it.appointmentId,
            startUtc,
            endUtc,
            title: titleForAppointmentType(it.appointmentType),
            subtitle: it.status,
            variant: "therapy",
            proofUrl: it.proofUrl ?? undefined,
            approvalStatus: approvalStatusForAppointmentStatus(it.status),
            appointmentStatus: it.status as CalEvent["appointmentStatus"],
          });
        }

        setEvents(nextEvents);
      } catch (e) {
        if ((e as any)?.name === "AbortError") return;
        setErrorMsg(e instanceof Error ? e.message : "Failed to load calendar");
        setEvents([]);
      } finally {
        setLoading(false);
      }
    })();

    return () => ac.abort();
  }, [anchor, therapistId, timeZone, view, weekStartYmd, reloadKey]);

  const todayYmd = useMemo(() => getYMDInTimeZone(new Date(), timeZone), [timeZone]);

  function onToday() {
    setAnchor(new Date());
  }

  function onPrev() {
    if (view === "week") setAnchor(shiftAnchorInTimeZone(anchor, -7, timeZone));
    else if (view === "day") setAnchor(shiftAnchorInTimeZone(anchor, -1, timeZone));
    else setAnchor(shiftAnchorMonthsInTimeZone(anchor, -1, timeZone));
  }

  function onNext() {
    if (view === "week") setAnchor(shiftAnchorInTimeZone(anchor, 7, timeZone));
    else if (view === "day") setAnchor(shiftAnchorInTimeZone(anchor, 1, timeZone));
    else setAnchor(shiftAnchorMonthsInTimeZone(anchor, 1, timeZone));
  }

  useEffect(() => {
    if (!datePickerOpen) return;
    function handlePointerDown(e: MouseEvent) {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
        setDatePickerOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [datePickerOpen]);

  useEffect(() => {
    if (!actionsMenuOpen) return;
    function handlePointerDown(e: MouseEvent) {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(e.target as Node)) {
        setActionsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [actionsMenuOpen]);

  const gridColsClass = view === "day" ? "grid-cols-[80px_1fr]" : "grid-cols-[80px_repeat(7,1fr)]";

  return (
    <main className="flex min-h-0 flex-1 overflow-hidden">
      <CreateAppointmentModal
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          setCreateInitialSchedule(null);
        }}
        therapistId={therapistId}
        therapistTimezone={timeZone}
        initialSchedule={createInitialSchedule}
        onCreated={() => {
          setReloadKey((k) => k + 1);
        }}
      />
      {editOpen && selected ? (
        <EditAppointmentModal
          appointment={selected}
          therapistTimezone={timeZone}
          onClose={() => setEditOpen(false)}
          onDelete={({ sessionId }) => {
            setEvents((prev) => prev.filter((e) => e.id !== sessionId));
            setReloadKey((k) => k + 1);
          }}
          onRejected={({ sessionId, emailSent, emailError }) => {
            setEvents((prev) => prev.filter((e) => e.id !== sessionId));
            setReloadKey((k) => k + 1);
            setEditOpen(false);
            if (!emailSent && emailError) {
              setErrorMsg(
                `Appointment cancelled, but the client could not be emailed: ${emailError}`,
              );
            }
          }}
          onSave={(next) => {
            setSelected(next);
            setEvents((prev) =>
              prev.map((e) =>
                e.id === next.sessionId
                  ? {
                      ...e,
                      title: next.title,
                      subtitle: next.providerName,
                      proofUrl: next.proofUrl,
                      approvalStatus: next.approvalStatus,
                    }
                  : e,
              ),
            );
            setReloadKey((k) => k + 1);
          }}
        />
      ) : null}

      <section className="flex h-full min-h-0 flex-1 flex-col bg-mgmt-surface-container-lowest">
        <header className="sticky top-0 z-40 grid h-16 shrink-0 grid-cols-[1fr_auto_1fr] items-center border-b border-mgmt-outline-variant/10 bg-white/80 px-8 backdrop-blur-xl">
          <div aria-hidden />

          <div className="flex items-center gap-4">
            <div className="relative" ref={datePickerRef}>
              <button
                type="button"
                onClick={() => setDatePickerOpen((open) => !open)}
                className="inline-flex items-center gap-1 rounded-lg px-1 py-1 text-xl font-bold text-mgmt-on-surface hover:bg-mgmt-surface-container-low"
                aria-expanded={datePickerOpen}
                aria-haspopup="dialog"
                aria-label="Choose date"
              >
                {headerTitle}
                <MaterialSymbol
                  name="expand_more"
                  className={`text-[22px] text-mgmt-on-surface-variant transition-transform ${
                    datePickerOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              {datePickerOpen ? (
                <CalendarDatePickerPopover
                  anchor={anchor}
                  timeZone={timeZone}
                  todayYmd={todayYmd}
                  onSelectDay={(d) => {
                    setAnchor(d);
                    setDatePickerOpen(false);
                  }}
                />
              ) : null}
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onPrev}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-mgmt-on-surface-variant hover:bg-mgmt-surface-container-low hover:text-mgmt-on-surface"
                aria-label="Previous"
              >
                <MaterialSymbol name="chevron_left" />
              </button>
              <button
                type="button"
                onClick={onNext}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-mgmt-on-surface-variant hover:bg-mgmt-surface-container-low hover:text-mgmt-on-surface"
                aria-label="Next"
              >
                <MaterialSymbol name="chevron_right" />
              </button>
              <button
                type="button"
                onClick={onToday}
                className="inline-flex h-9 items-center rounded-lg bg-white px-4 text-sm font-semibold text-mgmt-primary shadow-sm"
              >
                Today
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-4">
            {/* <div className="flex items-center rounded-lg bg-mgmt-surface-container-low p-1">
              <button
                type="button"
                onClick={() => setView("day")}
                className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider ${
                  view === "day" ? "rounded bg-white text-mgmt-primary shadow-sm" : "text-mgmt-on-surface-variant"
                }`}
              >
                Day
              </button>
              <button
                type="button"
                onClick={() => setView("week")}
                className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider ${
                  view === "week" ? "rounded bg-white text-mgmt-primary shadow-sm" : "text-mgmt-on-surface-variant"
                }`}
              >
                Week
              </button>
              <button
                type="button"
                onClick={() => setView("month")}
                className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider ${
                  view === "month" ? "rounded bg-white text-mgmt-primary shadow-sm" : "text-mgmt-on-surface-variant"
                }`}
              >
                Month
              </button>
            </div> */}

            <div className="relative" ref={actionsMenuRef}>
              <button
                type="button"
                onClick={() => setActionsMenuOpen((open) => !open)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-mgmt-on-surface-variant transition-colors hover:bg-mgmt-surface-container-low hover:text-mgmt-on-surface"
                aria-label="Create"
                aria-haspopup="menu"
                aria-expanded={actionsMenuOpen}
              >
                <MaterialSymbol name="add" className="text-[22px]" />
              </button>

              {actionsMenuOpen ? (
                <div
                  className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-mgmt-outline-variant/20 bg-white py-1 shadow-lg"
                  role="menu"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setActionsMenuOpen(false);
                      setCreateInitialSchedule(null);
                      setCreateOpen(true);
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-mgmt-on-surface hover:bg-mgmt-surface-container-low"
                  >
                    <MaterialSymbol name="event" className="text-[18px] text-mgmt-on-surface-variant" />
                    New booking
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setActionsMenuOpen(false);
                      onAddTherapist?.();
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-mgmt-on-surface hover:bg-mgmt-surface-container-low"
                  >
                    <MaterialSymbol name="person_add" className="text-[18px] text-mgmt-on-surface-variant" />
                    Add therapist
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    disabled
                    className="flex w-full cursor-not-allowed items-center gap-3 px-4 py-2.5 text-left text-sm text-mgmt-on-surface-variant/60"
                  >
                    <MaterialSymbol name="medical_services" className="text-[18px]" />
                    Create service
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    disabled
                    className="flex w-full cursor-not-allowed items-center gap-3 px-4 py-2.5 text-left text-sm text-mgmt-on-surface-variant/60"
                  >
                    <MaterialSymbol name="group_add" className="text-[18px]" />
                    Add customer
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    disabled
                    className="flex w-full cursor-not-allowed items-center gap-3 px-4 py-2.5 text-left text-sm text-mgmt-on-surface-variant/60"
                  >
                    <MaterialSymbol name="school" className="text-[18px]" />
                    Create class
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-auto bg-mgmt-surface">
          {errorMsg ? (
            <div className="border-b border-mgmt-outline-variant/10 bg-red-50 px-6 py-3 text-sm text-red-700">
              {errorMsg}
            </div>
          ) : null}
          {loading ? (
            <div className="border-b border-mgmt-outline-variant/10 bg-white/60 px-6 py-3 text-sm text-mgmt-on-surface-variant">
              Loading…
            </div>
          ) : null}
          {view === "month" ? (
            <MonthGrid
              anchor={anchor}
              timeZone={timeZone}
              todayYmd={todayYmd}
              onSelectDay={(d) => {
                setAnchor(d);
                setView("day");
              }}
            />
          ) : (
            <div className={`grid min-h-full min-w-[800px] ${gridColsClass}`}>
              <div className="sticky top-0 z-20 border-b border-mgmt-outline-variant/10 bg-mgmt-surface" />
              {dayColumns.map((colDate) => {
                const colYmd = {
                  year: colDate.getFullYear(),
                  month: colDate.getMonth() + 1,
                  day: colDate.getDate(),
                };
                const isToday =
                  colYmd.year === todayYmd.year &&
                  colYmd.month === todayYmd.month &&
                  colYmd.day === todayYmd.day;
                const dow = formatDateInTimeZone(colDate, timeZone, { weekday: "short" });
                const dom = colDate.getDate();
                return (
                  <div
                    key={colDate.toISOString()}
                    className="sticky top-0 z-20 border-b border-mgmt-outline-variant/10 bg-mgmt-surface py-4 text-center"
                  >
                    <span
                      className={`block text-xs font-bold uppercase tracking-widest ${
                        isToday ? "text-mgmt-primary" : "text-mgmt-on-surface-variant"
                      }`}
                    >
                      {dow}
                    </span>
                    {isToday ? (
                      <div className="mx-auto mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-mgmt-primary text-2xl font-bold text-mgmt-on-primary">
                        {dom}
                      </div>
                    ) : (
                      <span className="mt-1 block text-2xl font-bold text-mgmt-on-surface">{dom}</span>
                    )}
                  </div>
                );
              })}

              {TIME_LABELS.map((timeLabel, hour) => (
                <TimeRow
                  key={timeLabel}
                  timeLabel={timeLabel}
                  hour={hour}
                  timeZone={timeZone}
                  dayColumns={dayColumns}
                  events={events}
                  onEmptySlot={(colDate) => {
                    setCreateInitialSchedule(slotToInitialSchedule(colDate, hour));
                    setCreateOpen(true);
                  }}
                  onSelectEvent={(ev) => {
                    const dateLine = formatDateInTimeZone(ev.startUtc, timeZone, {
                      day: "2-digit",
                      month: "short",
                    }).toUpperCase();
                    const dow = formatDateInTimeZone(ev.startUtc, timeZone, {
                      weekday: "short",
                    }).toUpperCase();
                    const timeRange = `${formatTimeInTimeZone(ev.startUtc, timeZone)} – ${formatTimeInTimeZone(ev.endUtc, timeZone)}`;

                    setSelected({
                      dayId: zonedLocalYmdTimeToUtc(weekStartYmd, "12:00", timeZone).toISOString(),
                      sessionId: ev.id,
                      dateLine: `${dateLine}, ${dow}`,
                      timeRange,
                      title: ev.title,
                      providerName: ev.subtitle,
                      notes: "",
                      videoLink: "",
                      proofUrl: ev.proofUrl,
                      approvalStatus: ev.approvalStatus ?? "pending",
                      appointmentStatus: ev.appointmentStatus,
                      startAt: ev.startUtc.toISOString(),
                      endAt: ev.endUtc.toISOString(),
                    });
                    setEditOpen(true);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function TimeRow({
  timeLabel,
  hour,
  timeZone,
  dayColumns,
  events,
  onEmptySlot,
  onSelectEvent,
}: {
  timeLabel: string;
  hour: number;
  timeZone: string;
  dayColumns: Date[];
  events: CalEvent[];
  onEmptySlot: (colDate: Date) => void;
  onSelectEvent: (ev: CalEvent) => void;
}) {
  return (
    <>
      <div className="border-b border-r border-mgmt-outline-variant/5 bg-mgmt-surface py-4 pr-4 text-right text-[0.65rem] font-bold uppercase tracking-tighter text-mgmt-on-surface-variant">
        {timeLabel}
      </div>
      {dayColumns.map((colDate) => {
        const colYmd = wallClockDateToYMD(colDate);
        const cellEvents = events.filter((ev) => {
          const evYmd = getYMDInTimeZone(ev.startUtc, timeZone);
          return sameYMD(evYmd, colYmd) && getHourInTimeZone(ev.startUtc, timeZone) === hour;
        });
        return (
          <div
            key={`${colDate.toISOString()}-${hour}`}
            role="button"
            tabIndex={0}
            onClick={() => onEmptySlot(colDate)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onEmptySlot(colDate);
              }
            }}
            className="group relative min-h-[80px] border-b border-r border-mgmt-outline-variant/5 bg-white last:border-r-0 hover:bg-mgmt-surface-container-low text-left cursor-pointer"
            aria-label={`Create appointment ${colDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} at ${timeLabel}`}
          >
            {cellEvents.map((ev) => (
              <EventBlock key={ev.id} ev={ev} onClick={() => onSelectEvent(ev)} />
            ))}
          </div>
        );
      })}
    </>
  );
}

function EventBlock({ ev, onClick }: { ev: CalEvent; onClick: () => void }) {
  if (ev.variant === "therapy") {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className="absolute inset-x-1 top-1 bottom-1 z-10 cursor-pointer overflow-hidden rounded-xl border-l-4 border-mgmt-primary bg-mgmt-tertiary-container p-2 text-left shadow-sm hover:brightness-[0.98] active:scale-[0.995] transition"
        aria-label={`Edit appointment: ${ev.title}`}
      >
        <p className="text-[0.65rem] font-bold leading-tight text-mgmt-on-primary-container">{ev.title}</p>
        <p className="text-[0.6rem] text-mgmt-on-primary-container/80">{ev.subtitle}</p>
      </button>
    );
  }
  const h = ev.durationMin ? Math.max(80, (ev.durationMin / 60) * 80) : 150;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="absolute inset-x-1 top-1 z-10 cursor-pointer overflow-hidden rounded-xl border-l-4 border-slate-400 bg-slate-100 p-2 text-left shadow-sm hover:bg-slate-200/70 active:scale-[0.995] transition"
      style={{ height: `${h}px` }}
      aria-label={`Edit appointment: ${ev.title}`}
    >
      <p className="text-[0.65rem] font-bold leading-tight text-slate-700">{ev.title}</p>
      <p className="text-[0.6rem] text-slate-500">{ev.subtitle}</p>
    </button>
  );
}

function CalendarDatePickerPopover({
  anchor,
  timeZone,
  todayYmd,
  onSelectDay,
}: {
  anchor: Date;
  timeZone: string;
  todayYmd: YMD;
  onSelectDay: (d: Date) => void;
}) {
  const anchorYmd = getYMDInTimeZone(anchor, timeZone);
  const [pickerYmd, setPickerYmd] = useState(() => ({
    year: anchorYmd.year,
    month: anchorYmd.month,
  }));

  useEffect(() => {
    const ymd = getYMDInTimeZone(anchor, timeZone);
    setPickerYmd({ year: ymd.year, month: ymd.month });
  }, [anchor, timeZone]);

  const { year, month } = pickerYmd;
  const monthLabel = formatDateInTimeZone(
    ymdToWallClockDate({ year, month, day: 1 }),
    timeZone,
    { month: "long", year: "numeric" },
  );

  const first = ymdToWallClockDate({ year, month, day: 1 });
  const startPad = first.getDay() === 0 ? 6 : first.getDay() - 1;
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const weekdayHeaders = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  function onPrevMonth() {
    setPickerYmd((prev) => {
      if (prev.month === 1) return { year: prev.year - 1, month: 12 };
      return { year: prev.year, month: prev.month - 1 };
    });
  }

  function onNextMonth() {
    setPickerYmd((prev) => {
      if (prev.month === 12) return { year: prev.year + 1, month: 1 };
      return { year: prev.year, month: prev.month + 1 };
    });
  }

  return (
    <div
      role="dialog"
      aria-label="Choose date"
      className="absolute left-1/2 top-full z-50 mt-2 w-72 -translate-x-1/2 rounded-xl border border-mgmt-outline-variant/20 bg-white p-4 shadow-lg"
    >
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={onPrevMonth}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-mgmt-on-surface-variant hover:bg-mgmt-surface-container-low hover:text-mgmt-on-surface"
          aria-label="Previous month"
        >
          <MaterialSymbol name="chevron_left" />
        </button>
        <span className="text-sm font-bold text-mgmt-on-surface">{monthLabel}</span>
        <button
          type="button"
          onClick={onNextMonth}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-mgmt-on-surface-variant hover:bg-mgmt-surface-container-low hover:text-mgmt-on-surface"
          aria-label="Next month"
        >
          <MaterialSymbol name="chevron_right" />
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[0.65rem] font-bold uppercase tracking-wider text-mgmt-on-surface-variant">
        {weekdayHeaders.map((h) => (
          <div key={h} className="py-1">
            {h}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, idx) => {
          if (day === null) return <div key={`empty-${idx}`} className="h-8" />;
          const isToday =
            year === todayYmd.year && month === todayYmd.month && day === todayYmd.day;
          const isSelected =
            year === anchorYmd.year && month === anchorYmd.month && day === anchorYmd.day;
          return (
            <button
              key={day}
              type="button"
              onClick={() => onSelectDay(zonedLocalYmdTimeToUtc({ year, month, day }, "12:00", timeZone))}
              className={`inline-flex h-8 w-full items-center justify-center rounded-lg text-sm font-semibold transition-colors ${
                isSelected
                  ? "bg-mgmt-primary text-mgmt-on-primary"
                  : isToday
                    ? "bg-mgmt-primary/15 text-mgmt-primary"
                    : "text-mgmt-on-surface hover:bg-mgmt-surface-container-low"
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MonthGrid({
  anchor,
  timeZone,
  todayYmd,
  onSelectDay,
}: {
  anchor: Date;
  timeZone: string;
  todayYmd: YMD;
  onSelectDay: (d: Date) => void;
}) {
  const anchorYmd = getYMDInTimeZone(anchor, timeZone);
  const year = anchorYmd.year;
  const month = anchorYmd.month;
  const first = ymdToWallClockDate({ year, month, day: 1 });
  const startPad = first.getDay() === 0 ? 6 : first.getDay() - 1;
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const headers = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="p-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-3 grid grid-cols-7 gap-1 text-center text-[0.7rem] font-bold uppercase tracking-wider text-mgmt-on-surface-variant">
          {headers.map((h) => (
            <div key={h}>{h}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, idx) => {
            if (day === null) return <div key={`empty-${idx}`} className="aspect-square" />;
            const d = zonedLocalYmdTimeToUtc({ year, month, day }, "12:00", timeZone);
            const isToday =
              year === todayYmd.year && month === todayYmd.month && day === todayYmd.day;
            return (
              <button
                key={day}
                type="button"
                onClick={() => onSelectDay(d)}
                className={`flex aspect-square items-center justify-center rounded-lg text-sm font-semibold transition-colors ${
                  isToday
                    ? "bg-mgmt-primary text-mgmt-on-primary"
                    : "bg-white text-mgmt-on-surface hover:bg-mgmt-surface-container-low"
                }`}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

