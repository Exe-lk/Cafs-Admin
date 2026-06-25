"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CalendarPreferencesDrawer from "@/components/admin/CalendarPreferencesDrawer";
import MaterialSymbol from "@/components/admin/MaterialSymbol";
import TeamPanelOpenButton from "@/components/admin/TeamPanelOpenButton";
import CreateAppointmentModal, {
  type CreateAppointmentInitialSchedule,
} from "@/components/admin/CreateAppointmentModal";
import CreateCustomerModal from "@/components/admin/CreateCustomerModal";
import EditAppointmentModal, { type AdminEditableAppointment } from "@/components/admin/EditAppointmentModal";
import EditTherapistClassModal from "@/components/admin/EditTherapistClassModal";
import EditTherapistServiceModal from "@/components/admin/EditTherapistServiceModal";
import {
  approvalStatusForAppointmentStatus,
} from "@/lib/calendar/appointmentStatus";
import {
  calendarPaymentBadge,
  type CalendarPaymentBadge,
} from "@/lib/calendar/calendarEventDisplay";
import {
  isAppointmentStartInPast,
  PAST_APPOINTMENT_MESSAGE,
} from "@/lib/calendar/scheduling";
import { isOnlineAppointment, serviceCategoryCalendarStyles } from "@/lib/admin/serviceCategoryColors";
import {
  isRangeBlocked,
  segmentsInHour,
  type TimeBlockKind,
} from "@/lib/calendar/timeBlocks";
import { offHoursSegmentsInHour, type WorkingHoursSlot } from "@/lib/calendar/workingHours";
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

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const TIME_LABELS = Array.from({ length: 24 }, (_, i) => {
  if (i === 0) return "12 AM";
  if (i < 12) return `${i} AM`;
  if (i === 12) return "12 PM";
  return `${i - 12} PM`;
});

type CalendarView = "day" | "week" | "month";

const CALENDAR_VIEW_OPTIONS: Array<{
  value: CalendarView;
  label: string;
  shortcut: string;
}> = [
  { value: "day", label: "Day", shortcut: "D" },
  { value: "week", label: "Week", shortcut: "W" },
  { value: "month", label: "Month", shortcut: "M" },
];

function CalendarViewGlyph({ view, className }: { view: CalendarView; className?: string }) {
  if (view === "day") {
    return (
      <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden>
        <rect x="2.5" y="3.5" width="15" height="13" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <rect x="5" y="8.5" width="10" height="2.5" rx="0.5" fill="currentColor" />
      </svg>
    );
  }
  if (view === "week") {
    return (
      <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden>
        <rect x="2.5" y="3.5" width="15" height="13" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <rect x="5.5" y="6.5" width="2" height="7" rx="0.5" fill="currentColor" />
        <rect x="9" y="6.5" width="2" height="7" rx="0.5" fill="currentColor" />
        <rect x="12.5" y="6.5" width="2" height="7" rx="0.5" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden>
      <rect x="2.5" y="3.5" width="15" height="13" rx="2" stroke="currentColor" strokeWidth="1.5" />
      {[
        [5.5, 6.5],
        [8.25, 6.5],
        [11, 6.5],
        [5.5, 9.25],
        [8.25, 9.25],
        [11, 9.25],
        [5.5, 12],
        [8.25, 12],
        [11, 12],
      ].map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="2" height="2" rx="0.35" fill="currentColor" />
      ))}
    </svg>
  );
}

type CalEvent = {
  id: string;
  therapistId: string;
  therapistName?: string;
  startUtc: Date;
  endUtc: Date;
  title: string;
  customerName: string;
  appointmentTypeLine: string;
  paymentBadge: CalendarPaymentBadge;
  appointmentType: "online" | "in_person";
  durationMin?: number;
  proofUrl?: string;
  meetLink?: string;
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

type CalEventLayout = {
  ev: CalEvent;
  column: number;
  columnCount: number;
};

function layoutCellEvents(events: CalEvent[]): CalEventLayout[] {
  if (events.length <= 1) {
    return events.map((ev) => ({ ev, column: 0, columnCount: 1 }));
  }

  const uniqueTherapists = new Set(events.map((e) => e.therapistId));
  if (uniqueTherapists.size <= 1) {
    return events.map((ev) => ({ ev, column: 0, columnCount: 1 }));
  }

  const therapistOrder = [...uniqueTherapists].sort();
  const columnCount = therapistOrder.length;
  const therapistToColumn = new Map(therapistOrder.map((id, i) => [id, i]));

  return events.map((ev) => ({
    ev,
    column: therapistToColumn.get(ev.therapistId) ?? 0,
    columnCount,
  }));
}


type CalTimeBlock = {
  id: string;
  startUtc: Date;
  endUtc: Date;
  kind: TimeBlockKind;
  label: string;
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

function isRejectedCalendarEvent(ev: CalEvent): boolean {
  return (
    ev.approvalStatus === "rejected" ||
    ev.appointmentStatus === "cancelled" ||
    ev.appointmentStatus === "no_show" ||
    ev.appointmentStatus === "expired"
  );
}

function calendarEventStyles(ev: CalEvent): {
  container: string;
  title: string;
  subtitle: string;
} {
  const base = serviceCategoryCalendarStyles(ev.title, ev.appointmentType);
  if (isRejectedCalendarEvent(ev)) {
    return { ...base, container: cx(base.container, "opacity-70") };
  }
  if (isAppointmentStartInPast(ev.startUtc)) {
    return { ...base, container: cx(base.container, "opacity-80") };
  }
  return base;
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

type CalendarTherapistInfo = {
  name: string;
  timezone?: string;
};

export default function AdminCalendarHome({
  therapistIds,
  therapistTimezone,
  therapistsById,
  onAddTherapist,
  teamPanelOpen = true,
  onOpenTeamPanel,
}: {
  therapistIds?: string[];
  therapistTimezone?: string;
  therapistsById?: Record<string, CalendarTherapistInfo>;
  onAddTherapist?: () => void;
  teamPanelOpen?: boolean;
  onOpenTeamPanel?: () => void;
}) {
  const primaryTherapistId = therapistIds?.[0];
  const therapistIdsKey = useMemo(
    () => (therapistIds ?? []).slice().sort().join(","),
    [therapistIds],
  );
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
  const [noticeMsg, setNoticeMsg] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const actionsMenuRef = useRef<HTMLDivElement>(null);
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const viewMenuRef = useRef<HTMLDivElement>(null);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const [offHoursBookingEnabled, setOffHoursBookingEnabled] = useState(false);
  const [doubleBookingEnabled, setDoubleBookingEnabled] = useState(true);
  const [shareCopied, setShareCopied] = useState(false);
  const [calendarPreferencesOpen, setCalendarPreferencesOpen] = useState(false);
  const [bookingStatsExpanded, setBookingStatsExpanded] = useState(false);
  const [createServiceOpen, setCreateServiceOpen] = useState(false);
  const [createClassOpen, setCreateClassOpen] = useState(false);
  const [createCustomerOpen, setCreateCustomerOpen] = useState(false);

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

  const bookingStatsRangeLabel = useMemo(() => {
    if (view === "day") {
      return formatDateInTimeZone(anchor, timeZone, { day: "numeric", month: "short" });
    }
    if (view === "month") {
      return formatDateInTimeZone(anchor, timeZone, { month: "long", year: "numeric" });
    }
    const start = ymdToWallClockDate(weekStartYmd);
    const end = ymdToWallClockDate(weekEndYmd);
    const fmt = (d: Date) => formatDateInTimeZone(d, timeZone, { day: "numeric", month: "short" });
    return `${fmt(start)} - ${fmt(end)}`;
  }, [anchor, timeZone, view, weekEndYmd, weekStartYmd]);

  const dayColumns = useMemo(() => {
    if (view === "day") return [ymdToWallClockDate(getYMDInTimeZone(anchor, timeZone))];
    if (view === "week") {
      return Array.from({ length: 7 }, (_, i) => ymdToWallClockDate(addDaysToYMD(weekStartYmd, i)));
    }
    return [];
  }, [anchor, timeZone, view, weekStartYmd]);

  const [events, setEvents] = useState<CalEvent[]>([]);
  const [timeBlocks, setTimeBlocks] = useState<CalTimeBlock[]>([]);
  const [workingHours, setWorkingHours] = useState<WorkingHoursSlot[]>([]);

  const bookingStats = useMemo(() => {
    const bookings = events.length;
    const confirmed = events.filter(
      (e) => e.appointmentStatus === "confirmed" || e.appointmentStatus === "completed",
    ).length;
    const rejected = events.filter(
      (e) =>
        e.approvalStatus === "rejected" ||
        e.appointmentStatus === "cancelled" ||
        e.appointmentStatus === "no_show",
    ).length;
    return { bookings, confirmed, rejected };
  }, [events]);

  useEffect(() => {
    const ids = therapistIds ?? [];
    if (ids.length === 0) {
      setEvents([]);
      setTimeBlocks([]);
      setWorkingHours([]);
      setLoading(false);
      setErrorMsg(null);
      return;
    }

    const { from, to } = rangeForView(view, anchor, weekStartYmd, timeZone);

    type CalendarApiData = {
      therapistTimezone?: string;
      items: Array<{
        therapistId: string;
        type: "appointment";
        appointmentId: string;
        startAt: string;
        endAt: string;
        appointmentType: "online" | "in_person";
        status: string;
        clientName: string;
        serviceName: string;
        appointmentTypeLine: string;
        paymentBadge: CalendarPaymentBadge;
        proofUrl?: string | null;
        meetLink?: string | null;
      }>;
      timeBlocks?: Array<{
        timeBlockId: string;
        startAt: string;
        endAt: string;
        kind: TimeBlockKind;
        label: string;
      }>;
      workingHours?: Array<{
        dayOfWeek: number;
        startTime: string;
        endTime: string;
        isActive: boolean;
      }>;
    };

    const ac = new AbortController();
    setLoading(true);
    setErrorMsg(null);

    (async () => {
      try {
        const responses = await Promise.all(
          ids.map(async (therapistId) => {
            const sp = new URLSearchParams();
            sp.set("from", from.toISOString());
            sp.set("to", to.toISOString());
            sp.set("therapistId", therapistId);
            const res = await fetch(`/api/v1/admin/calendar?${sp.toString()}`, {
              method: "GET",
              cache: "no-store",
              signal: ac.signal,
            });
            const json = (await res.json()) as ApiEnvelope<CalendarApiData>;
            if (!res.ok || json.status !== "success" || !json.data) {
              throw new Error(json.message || `Failed to load calendar (HTTP ${res.status})`);
            }
            return { therapistId, data: json.data };
          }),
        );

        const nextEvents: CalEvent[] = [];
        const nextBlocks: CalTimeBlock[] = [];
        let mergedWorkingHours: WorkingHoursSlot[] = [];

        for (const { therapistId, data } of responses) {
          const therapistName = therapistsById?.[therapistId]?.name;
          for (const it of data.items) {
            const startUtc = parseDbUtcTimestamp(it.startAt);
            const endUtc = parseDbUtcTimestamp(it.endAt);
            if (!startUtc || !endUtc) continue;
            nextEvents.push({
              id: it.appointmentId,
              therapistId: it.therapistId,
              therapistName,
              startUtc,
              endUtc,
              title: it.serviceName || titleForAppointmentType(it.appointmentType),
              customerName: it.clientName,
              appointmentTypeLine: it.appointmentTypeLine,
              paymentBadge: it.paymentBadge,
              appointmentType: it.appointmentType,
              proofUrl: it.proofUrl ?? undefined,
              meetLink: it.meetLink ?? undefined,
              approvalStatus: approvalStatusForAppointmentStatus(it.status),
              appointmentStatus: it.status as CalEvent["appointmentStatus"],
            });
          }

          for (const tb of data.timeBlocks ?? []) {
            const startUtc = parseDbUtcTimestamp(tb.startAt);
            const endUtc = parseDbUtcTimestamp(tb.endAt);
            if (!startUtc || !endUtc) continue;
            nextBlocks.push({
              id: `${therapistId}:${tb.timeBlockId}`,
              startUtc,
              endUtc,
              kind: tb.kind,
              label: tb.label,
            });
          }
        }

        if (ids.length === 1) {
          const single = responses[0]?.data;
          if (single?.therapistTimezone) {
            setTimeZone(normalizeTimeZone(single.therapistTimezone));
          }
          mergedWorkingHours = (single?.workingHours ?? []).map((wh) => ({
            dayOfWeek: wh.dayOfWeek,
            startTime: wh.startTime,
            endTime: wh.endTime,
            isActive: wh.isActive,
          }));
        }

        setEvents(nextEvents);
        setTimeBlocks(nextBlocks);
        setWorkingHours(mergedWorkingHours);
      } catch (e) {
        if ((e as any)?.name === "AbortError") return;
        setErrorMsg(e instanceof Error ? e.message : "Failed to load calendar");
        setEvents([]);
        setTimeBlocks([]);
        setWorkingHours([]);
      } finally {
        setLoading(false);
      }
    })();

    return () => ac.abort();
  }, [anchor, therapistIdsKey, therapistsById, timeZone, view, weekStartYmd, reloadKey]);

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

  useEffect(() => {
    if (!viewMenuOpen) return;
    function handlePointerDown(e: MouseEvent) {
      if (viewMenuRef.current && !viewMenuRef.current.contains(e.target as Node)) {
        setViewMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [viewMenuOpen]);

  useEffect(() => {
    if (!moreMenuOpen) return;
    function handlePointerDown(e: MouseEvent) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setMoreMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [moreMenuOpen]);

  useEffect(() => {
    if (!moreMenuOpen) setBookingStatsExpanded(false);
  }, [moreMenuOpen]);

  const handlePrintCalendar = useCallback(() => {
    setMoreMenuOpen(false);
    window.setTimeout(() => window.print(), 100);
  }, []);

  const copyBookingPageUrl = useCallback(async () => {
    const origin = window.location.origin;
    const url = primaryTherapistId
      ? `${origin}/book?therapist=${encodeURIComponent(primaryTherapistId)}`
      : `${origin}/book`;
    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      window.setTimeout(() => setShareCopied(false), 2000);
    } catch {
      setShareCopied(false);
    }
  }, [primaryTherapistId]);

  const gridColsClass = view === "day" ? "grid-cols-[80px_1fr]" : "grid-cols-[80px_repeat(7,1fr)]";
  const showTeamReopen = !teamPanelOpen && Boolean(onOpenTeamPanel);

  return (
    <main className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <CreateAppointmentModal
        open={createOpen}
        draggable
        onClose={() => {
          setCreateOpen(false);
          setCreateInitialSchedule(null);
        }}
        therapistId={primaryTherapistId}
        therapistTimezone={timeZone}
        initialSchedule={createInitialSchedule}
        blockedTimeBlocks={timeBlocks.map((tb) => ({
          startUtc: tb.startUtc,
          endUtc: tb.endUtc,
          label: tb.label,
        }))}
        workingHours={workingHours}
        offHoursBookingEnabled={offHoursBookingEnabled}
        onCreated={(created) => {
          setReloadKey((k) => k + 1);
          if (created.emailSent === false) {
            setNoticeMsg(
              created.emailError
                ? `Appointment created, but the client could not be emailed: ${created.emailError}`
                : "Appointment created, but the client could not be emailed.",
            );
          } else {
            setNoticeMsg(null);
          }
        }}
      />
      {createServiceOpen ? (
        <EditTherapistServiceModal
          service={null}
          onClose={() => setCreateServiceOpen(false)}
          onSaved={() => setCreateServiceOpen(false)}
        />
      ) : null}
      {createClassOpen ? (
        <EditTherapistClassModal
          classItem={null}
          onClose={() => setCreateClassOpen(false)}
          onSaved={() => setCreateClassOpen(false)}
        />
      ) : null}
      {createCustomerOpen ? (
        <CreateCustomerModal
          onClose={() => setCreateCustomerOpen(false)}
          onCreate={async (draft) => {
            setErrorMsg(null);
            try {
              const res = await fetch("/api/v1/admin/clients", {
                method: "POST",
                cache: "no-store",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                  fullName: draft.fullName,
                  email: draft.email || undefined,
                  phone: draft.phone || undefined,
                }),
              });
              const json = (await res.json()) as { status?: string; message?: string };
              if (!res.ok || json?.status !== "success") {
                throw new Error(json?.message || `Create failed (HTTP ${res.status})`);
              }
            } catch (e) {
              setErrorMsg(e instanceof Error ? e.message : "Failed to create customer");
            }
          }}
        />
      ) : null}
      <CalendarPreferencesDrawer
        open={calendarPreferencesOpen}
        onClose={() => setCalendarPreferencesOpen(false)}
      />
      {editOpen && selected ? (
        <EditAppointmentModal
          appointment={selected}
          therapistTimezone={timeZone}
          viewFirst
          draggable
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
              prev.map((e) => {
                if (e.id !== next.sessionId) return e;
                return {
                  ...e,
                  title: next.title,
                  customerName: e.customerName,
                  appointmentTypeLine: e.appointmentTypeLine,
                  paymentBadge: calendarPaymentBadge(next.appointmentStatus ?? e.appointmentStatus ?? "pending_payment"),
                  therapistId: next.therapistId ?? e.therapistId,
                  therapistName: next.therapistName ?? e.therapistName,
                  proofUrl: next.proofUrl,
                  meetLink: next.videoLink ?? e.meetLink,
                  approvalStatus: next.approvalStatus,
                  appointmentStatus: next.appointmentStatus,
                };
              }),
            );
            setReloadKey((k) => k + 1);
          }}
        />
      ) : null}

      <section className="flex min-h-0 flex-1 flex-col overflow-hidden bg-mgmt-surface-container-lowest">
        <header className="z-40 grid min-h-[4.5rem] shrink-0 grid-cols-[15%_minmax(0,1fr)_auto] items-center gap-x-4 border-b border-mgmt-outline-variant/10 bg-white/80 px-8 py-4 backdrop-blur-xl">
          <div className="flex min-w-0 items-center">
            {showTeamReopen ? <TeamPanelOpenButton onClick={onOpenTeamPanel!} /> : null}
          </div>

          <div
            className={cx(
              "flex min-w-0 items-center gap-6",
              showTeamReopen ? "justify-center" : "justify-start",
            )}
          >
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

          <div className="flex items-center justify-end gap-3 sm:gap-4">
            <div className="relative" ref={viewMenuRef}>
              <button
                type="button"
                onClick={() => setViewMenuOpen((open) => !open)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full  text-mgmt-on-surface transition-colors hover:bg-mgmt-surface-container"
                aria-label="Calendar view"
                aria-haspopup="menu"
                aria-expanded={viewMenuOpen}
              >
                <CalendarViewGlyph view={view} className="h-5 w-5" />
              </button>

              {viewMenuOpen ? (
                <div
                  className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-xl border border-mgmt-outline-variant/20 bg-white py-1 shadow-lg"
                  role="menu"
                >
                  {CALENDAR_VIEW_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setView(option.value);
                        setViewMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm text-mgmt-on-surface hover:bg-mgmt-surface-container-low"
                    >
                      <span className="flex w-5 shrink-0 items-center justify-center">
                        {view === option.value ? (
                          <MaterialSymbol name="check" className="text-[18px]" />
                        ) : null}
                      </span>
                      <CalendarViewGlyph view={option.value} className="h-5 w-5 shrink-0" />
                      <span className="min-w-0 flex-1 font-medium">{option.label}</span>
                      <span className="shrink-0 text-xs font-semibold text-mgmt-on-surface-variant">
                        {option.shortcut}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

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
                    onClick={() => {
                      setActionsMenuOpen(false);
                      setCreateServiceOpen(true);
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-mgmt-on-surface hover:bg-mgmt-surface-container-low"
                  >
                    <MaterialSymbol name="medical_services" className="text-[18px] text-mgmt-on-surface-variant" />
                    Create service
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setActionsMenuOpen(false);
                      setCreateCustomerOpen(true);
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-mgmt-on-surface hover:bg-mgmt-surface-container-low"
                  >
                    <MaterialSymbol name="group_add" className="text-[18px] text-mgmt-on-surface-variant" />
                    Add customer
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setActionsMenuOpen(false);
                      setCreateClassOpen(true);
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-mgmt-on-surface hover:bg-mgmt-surface-container-low"
                  >
                    <MaterialSymbol name="school" className="text-[18px] text-mgmt-on-surface-variant" />
                    Create class
                  </button>
                </div>
              ) : null}
            </div>

            <div className="relative" ref={moreMenuRef}>
              <button
                type="button"
                onClick={() => setMoreMenuOpen((open) => !open)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-mgmt-on-surface-variant transition-colors hover:bg-mgmt-surface-container-low hover:text-mgmt-on-surface"
                aria-label="More options"
                aria-haspopup="menu"
                aria-expanded={moreMenuOpen}
              >
                <MaterialSymbol name="more_vert" className="text-[22px]" />
              </button>

              {moreMenuOpen ? (
                <div
                  className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-xl border border-mgmt-outline-variant/20 bg-white py-1 shadow-lg"
                  role="menu"
                >
                  <div className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-sm text-mgmt-on-surface">Enable off-hours booking</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={offHoursBookingEnabled}
                      onClick={() => setOffHoursBookingEnabled((on) => !on)}
                      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                        offHoursBookingEnabled ? "bg-mgmt-on-surface" : "bg-mgmt-surface-container-high"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                          offHoursBookingEnabled ? "left-5" : "left-0.5"
                        }`}
                      />
                    </button>
                  </div>
                  <div className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-sm text-mgmt-on-surface">Enable double booking</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={doubleBookingEnabled}
                      onClick={() => setDoubleBookingEnabled((on) => !on)}
                      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                        doubleBookingEnabled ? "bg-mgmt-on-surface" : "bg-mgmt-surface-container-high"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                          doubleBookingEnabled ? "left-5" : "left-0.5"
                        }`}
                      />
                    </button>
                  </div>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMoreMenuOpen(false);
                      setCalendarPreferencesOpen(true);
                    }}
                    className="flex w-full px-4 py-2.5 text-left text-sm text-mgmt-on-surface hover:bg-mgmt-surface-container-low"
                  >
                    Calendar preferences
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handlePrintCalendar}
                    className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm text-mgmt-on-surface hover:bg-mgmt-surface-container-low"
                  >
                    <span>Print calendar</span>
                    <span className="text-xs font-medium text-mgmt-on-surface-variant">CTRL + P</span>
                  </button>
                  <div>
                    <button
                      type="button"
                      onClick={() => setBookingStatsExpanded((open) => !open)}
                      className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm text-mgmt-on-surface ${
                        bookingStatsExpanded
                          ? "bg-mgmt-surface-container-low"
                          : "hover:bg-mgmt-surface-container-low"
                      }`}
                    >
                      <span>View booking stats</span>
                      <MaterialSymbol
                        name={bookingStatsExpanded ? "expand_less" : "expand_more"}
                        className="text-[20px] text-mgmt-on-surface-variant"
                      />
                    </button>
                    {bookingStatsExpanded ? (
                      <div className="border-t border-mgmt-outline-variant/10 bg-mgmt-surface-container-low px-4 pb-4 pt-3">
                        <p className="text-center text-sm text-mgmt-on-surface-variant">
                          {bookingStatsRangeLabel}
                        </p>
                        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                          <div>
                            <p className="text-xl font-bold text-mgmt-on-surface">
                              {bookingStats.bookings}
                            </p>
                            <p className="mt-1 text-xs text-mgmt-on-surface-variant">Bookings</p>
                          </div>
                          <div>
                            <p className="text-xl font-bold text-mgmt-on-surface">
                              {bookingStats.confirmed}
                            </p>
                            <p className="mt-1 text-xs text-mgmt-on-surface-variant">Confirmed</p>
                          </div>
                          <div>
                            <p className="text-xl font-bold text-mgmt-on-surface">
                              {bookingStats.rejected}
                            </p>
                            <p className="mt-1 text-xs text-mgmt-on-surface-variant">Rejected</p>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => void copyBookingPageUrl()}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-mgmt-outline-variant px-4 text-sm font-semibold text-mgmt-on-surface transition-colors hover:bg-mgmt-surface-container-low"
              aria-label="Share booking page"
            >
              <MaterialSymbol name="upload" className="text-[20px]" />
              {shareCopied ? "Copied" : "Share"}
            </button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
          {errorMsg ? (
            <div className="shrink-0 border-b border-mgmt-outline-variant/10 bg-red-50 px-6 py-3 text-sm text-red-700">
              {errorMsg}
            </div>
          ) : null}
          {noticeMsg ? (
            <div className="shrink-0 border-b border-amber-200 bg-amber-50 px-6 py-3 text-sm text-amber-900">
              {noticeMsg}
            </div>
          ) : null}
          {loading ? (
            <div className="shrink-0 border-b border-mgmt-outline-variant/10 bg-white/60 px-6 py-3 text-sm text-mgmt-on-surface-variant">
              Loading…
            </div>
          ) : null}
          {view === "month" ? (
            <div className="min-h-0 flex-1 overflow-auto">
              <MonthGrid
                anchor={anchor}
                timeZone={timeZone}
                todayYmd={todayYmd}
                onSelectDay={(d) => {
                  setAnchor(d);
                  setView("day");
                }}
              />
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="shrink-0 overflow-x-auto border-b border-mgmt-outline-variant/25 bg-white">
                <div className={`grid min-w-[800px] ${gridColsClass}`}>
                  <div className="bg-white" />
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
                      className="flex items-center justify-center gap-2 bg-white py-4"
                    >
                      <span
                        className={
                          isToday
                            ? "flex h-9 min-w-9 items-center justify-center rounded-lg bg-mgmt-primary px-2 text-lg font-bold text-mgmt-on-primary"
                            : "flex h-9 min-w-9 items-center justify-center px-2 text-xl font-bold text-mgmt-on-surface"
                        }
                      >
                        {dom}
                      </span>
                      <span
                        className={
                          isToday
                            ? "text-sm font-medium text-mgmt-on-surface"
                            : "text-sm font-medium text-mgmt-on-surface-variant"
                        }
                      >
                        {dow}
                      </span>
                    </div>
                  );
                  })}
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overflow-x-auto">
                <div className={`grid min-w-[800px] ${gridColsClass}`}>
                  {TIME_LABELS.map((timeLabel, hour) => (
                    <TimeRow
                      key={timeLabel}
                      timeLabel={timeLabel}
                      hour={hour}
                      timeZone={timeZone}
                      dayColumns={dayColumns}
                      events={events}
                      timeBlocks={timeBlocks}
                      workingHours={workingHours}
                      offHoursBookingEnabled={offHoursBookingEnabled}
                      onBlockedSlot={() => {
                        setErrorMsg("This time is blocked (break or time off).");
                      }}
                      onPastSlot={() => {
                        setErrorMsg(PAST_APPOINTMENT_MESSAGE);
                      }}
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
                          therapistId: ev.therapistId,
                          therapistName: ev.therapistName,
                          notes: "",
                          videoLink: ev.meetLink ?? "",
                          proofUrl: ev.proofUrl,
                          approvalStatus: ev.approvalStatus ?? "pending",
                          appointmentStatus: ev.appointmentStatus,
                          startAt: ev.startUtc.toISOString(),
                          endAt: ev.endUtc.toISOString(),
                          appointmentType: ev.appointmentType,
                        });
                        setEditOpen(true);
                      }}
                    />
                  ))}
                </div>
              </div>
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
  timeBlocks,
  workingHours,
  offHoursBookingEnabled,
  onEmptySlot,
  onBlockedSlot,
  onPastSlot,
  onSelectEvent,
}: {
  timeLabel: string;
  hour: number;
  timeZone: string;
  dayColumns: Date[];
  events: CalEvent[];
  timeBlocks: CalTimeBlock[];
  workingHours: WorkingHoursSlot[];
  offHoursBookingEnabled: boolean;
  onEmptySlot: (colDate: Date) => void;
  onBlockedSlot: () => void;
  onPastSlot: () => void;
  onSelectEvent: (ev: CalEvent) => void;
}) {
  return (
    <>
      <div className="border-b border-r border-mgmt-outline-variant/25 bg-white py-4 pr-4 text-right text-[0.65rem] font-bold uppercase tracking-tighter text-mgmt-on-surface-variant">
        {timeLabel}
      </div>
      {dayColumns.map((colDate) => {
        const colYmd = wallClockDateToYMD(colDate);
        const cellEvents = events.filter((ev) => {
          const evYmd = getYMDInTimeZone(ev.startUtc, timeZone);
          return sameYMD(evYmd, colYmd) && getHourInTimeZone(ev.startUtc, timeZone) === hour;
        });
        const slotStart = zonedLocalYmdTimeToUtc(colYmd, `${pad2(hour)}:00`, timeZone);
        const slotEnd = new Date(slotStart.getTime() + 60 * 60_000);
        const slotBlocked = isRangeBlocked(
          slotStart,
          slotEnd,
          timeBlocks.map((tb) => ({ startUtc: tb.startUtc, endUtc: tb.endUtc })),
        );
        const slotInPast = isAppointmentStartInPast(slotStart);
        const slotUnavailable = slotBlocked || slotInPast;
        const blockSegments = timeBlocks
          .map((tb) =>
            segmentsInHour(
              { startUtc: tb.startUtc, endUtc: tb.endUtc, label: tb.label },
              colYmd,
              hour,
              timeZone,
            ),
          )
          .filter((seg): seg is NonNullable<typeof seg> => seg !== null);

        const offHoursSegments =
          !offHoursBookingEnabled && workingHours.length
            ? offHoursSegmentsInHour(workingHours, colYmd, hour, timeZone)
            : [];

        function handleSlotActivate() {
          if (slotBlocked) {
            onBlockedSlot();
            return;
          }
          if (slotInPast) {
            onPastSlot();
            return;
          }
          onEmptySlot(colDate);
        }

        return (
          <div
            key={`${colDate.toISOString()}-${hour}`}
            role="button"
            tabIndex={0}
            onClick={handleSlotActivate}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleSlotActivate();
              }
            }}
            className={`group relative min-h-[80px] border-b border-r border-mgmt-outline-variant/5 bg-white last:border-r-0 text-left hover:bg-mgmt-surface-container-low cursor-pointer${
              slotUnavailable
                ? "cursor-not-allowed bg-mgmt-surface-container-low/40"
                : "cursor-pointer hover:bg-mgmt-surface-container-low"
            }`}
            
            aria-label={`Create appointment ${colDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} at ${timeLabel}`}
            aria-disabled={slotUnavailable}
          >
            {offHoursSegments.map((seg, idx) => (
              <OffHoursOverlay key={`${colDate.toISOString()}-${hour}-off-${idx}`} segment={seg} />
            ))}
            {blockSegments.map((seg, idx) => (
              <TimeBlockOverlay key={`${colDate.toISOString()}-${hour}-block-${idx}`} segment={seg} />
            ))}
            {layoutCellEvents(cellEvents).map(({ ev, column, columnCount }) => (
              <EventBlock
                key={`${ev.therapistId}:${ev.id}`}
                ev={ev}
                column={column}
                columnCount={columnCount}
                onClick={() => onSelectEvent(ev)}
              />
            ))}
          </div>
        );
      })}
    </>
  );
}

function OffHoursOverlay({ segment }: { segment: { topPct: number; heightPct: number } }) {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 z-[3] bg-mgmt-surface-container-low/60"
      style={{
        top: `${segment.topPct}%`,
        height: `${segment.heightPct}%`,
      }}
      aria-hidden
    />
  );
}

function TimeBlockOverlay({
  segment,
}: {
  segment: { topPct: number; heightPct: number; label?: string };
}) {
  const showLabel = segment.heightPct >= 35;
  return (
    <div
      className="pointer-events-none absolute inset-x-0 z-[5] border-y border-slate-200/80 bg-slate-100/90"
      style={{
        top: `${segment.topPct}%`,
        height: `${segment.heightPct}%`,
      }}
      aria-hidden
    >
      {showLabel && segment.label ? (
        <p className="truncate px-1.5 py-0.5 text-[0.6rem] font-medium text-slate-500">{segment.label}</p>
      ) : null}
    </div>
  );
}

function EventBlock({
  ev,
  onClick,
  column = 0,
  columnCount = 1,
}: {
  ev: CalEvent;
  onClick: () => void;
  column?: number;
  columnCount?: number;
}) {
  const styles = calendarEventStyles(ev);
  const widthPct = 100 / columnCount;
  const leftPct = column * widthPct;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cx(
        "absolute top-1 bottom-1 z-10 flex cursor-pointer flex-col overflow-hidden p-1.5 text-left transition active:scale-[0.995]",
        styles.container,
      )}
      style={{
        left: `calc(${leftPct}% + 4px)`,
        width: `calc(${widthPct}% - 8px)`,
      }}
      aria-label={`Edit appointment: ${ev.customerName}`}
    >
      <p className={cx("truncate text-[0.65rem] font-bold leading-tight", styles.title)}>
        {ev.customerName}
      </p>
      <p className={cx("mt-0.5 truncate text-[0.525rem] font-semibold leading-tight", styles.subtitle)}>
        {ev.title}
      </p>
      <div className="mt-auto flex w-full items-end justify-between gap-1">
        {isOnlineAppointment(ev.title, ev.appointmentType) ? (
          <MaterialSymbol
            name="videocam"
            size={15}
            className={cx("shrink-0", styles.title)}
          />
        ) : (
          <span className="shrink-0" aria-hidden />
        )}
        <span className="shrink-0 rounded-full bg-white px-1.5 py-0.5 text-[0.55rem] font-semibold leading-none text-mgmt-on-surface shadow-sm">
          {ev.paymentBadge}
        </span>
      </div>
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

