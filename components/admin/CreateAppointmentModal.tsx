"use client";

import { useEffect, useId, useMemo, useState } from "react";
import MaterialSymbol from "@/components/admin/MaterialSymbol";
import { useDraggableModal } from "@/lib/admin/useDraggableModal";
import BankSlipUploadFields, {
  hasBankSlipUploadIntent,
  submitBankSlipTransfer,
  validateBankSlipFields,
} from "@/components/admin/BankSlipUploadFields";
import SearchableSelect from "@/components/admin/SearchableSelect";
import {
  isAppointmentStartInPast,
  minBookableDateInputInTimeZone,
  PAST_APPOINTMENT_MESSAGE,
} from "@/lib/calendar/scheduling";
import { isRangeBlocked } from "@/lib/calendar/timeBlocks";
import { isRangeWithinWorkingHours, type WorkingHoursSlot } from "@/lib/calendar/workingHours";
import {
  formatDateInTimeZone,
  formatTimeInTimeZone,
  normalizeTimeZone,
  zonedLocalYmdTimeToUtc,
} from "@/lib/timezone";

type TabKey = "service" | "class" | "event" | "reminder";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function pad2(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

function toDateInputValue(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function toTimeInputValue(d: Date) {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function addMinutes(d: Date, mins: number) {
  return new Date(d.getTime() + mins * 60_000);
}

const PLACEHOLDER_CLASSES = [
  { classId: "cls-001", title: "Mindfulness Foundations" },
  { classId: "cls-002", title: "Anxiety Support Group" },
  { classId: "cls-003", title: "Parenting Skills Workshop" },
] as const;

const EVENT_COLORS = [
  { id: "blue", value: "#3b82f6" },
  { id: "green", value: "#22c55e" },
  { id: "orange", value: "#f97316" },
  { id: "purple", value: "#a855f7" },
  { id: "red", value: "#ef4444" },
] as const;

const EVENT_RECURRENCE = [
  { value: "none", label: "Does not repeat" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
] as const;

const fieldClass =
  "h-10 w-full rounded-lg bg-mgmt-surface-container-low px-3 text-sm text-mgmt-on-surface outline-none ring-1 ring-transparent focus:ring-mgmt-primary/30 disabled:opacity-60";

const textareaFieldClass =
  "min-h-24 w-full resize-none rounded-lg bg-mgmt-surface-container-low px-3 py-2 text-sm text-mgmt-on-surface outline-none ring-1 ring-transparent focus:ring-mgmt-primary/30";

const gridFieldClass =
  "mt-1 h-10 w-full rounded-lg bg-mgmt-surface-container-low px-3 text-sm text-mgmt-on-surface outline-none ring-1 ring-transparent focus:ring-mgmt-primary/30";

function addMinutesToTime(time: string, mins: number): string {
  const [h, m] = time.split(":").map((x) => Number(x));
  const d = new Date();
  d.setHours(h ?? 0, m ?? 0, 0, 0);
  return toTimeInputValue(addMinutes(d, mins));
}

export type CreateAppointmentInitialSchedule = {
  date: string;
  startTime: string;
  durationMin: number;
};

export type BlockedTimeBlock = {
  startUtc: Date;
  endUtc: Date;
  label?: string;
};

export default function CreateAppointmentModal({
  open,
  onClose,
  therapistId,
  therapistTimezone,
  onCreated,
  initialSchedule,
  blockedTimeBlocks = [],
  workingHours = [],
  offHoursBookingEnabled = false,
  draggable = false,
}: {
  open: boolean;
  onClose: () => void;
  therapistId?: string;
  therapistTimezone?: string;
  initialSchedule?: CreateAppointmentInitialSchedule | null;
  blockedTimeBlocks?: BlockedTimeBlock[];
  workingHours?: WorkingHoursSlot[];
  offHoursBookingEnabled?: boolean;
  /** When true, the modal can be dragged by its header (e.g. admin calendar). */
  draggable?: boolean;
  onCreated?: (created: {
    appointmentId: string;
    therapistId: string;
    startAt: string;
    endAt: string;
    appointmentType: "online" | "in_person";
    emailSent?: boolean;
    emailError?: string;
  }) => void;
}) {
  const titleId = useId();
  const timeZone = normalizeTimeZone(therapistTimezone);
  const dragResetKey = open
    ? `${initialSchedule?.date ?? ""}|${initialSchedule?.startTime ?? ""}`
    : "closed";
  const drag = useDraggableModal(draggable, dragResetKey);
  const [tab, setTab] = useState<TabKey>("service");

  const [services, setServices] = useState<Array<{ serviceId: string; name: string }>>([]);
  const [classes, setClasses] = useState<Array<{ classId: string; title: string }>>([]);
  const [therapists, setTherapists] = useState<Array<{ therapistId: string; name: string }>>([]);
  const [clients, setClients] = useState<Array<{ clientId: string; fullName: string }>>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [serviceId, setServiceId] = useState("");
  const [selectedTherapistId, setSelectedTherapistId] = useState("");
  const [clientId, setClientId] = useState("");
  const [appointmentType, setAppointmentType] = useState<"online" | "in_person">("online");
  const [date, setDate] = useState(() => toDateInputValue(new Date()));
  const [startTime, setStartTime] = useState(() => {
    const now = new Date();
    now.setSeconds(0, 0);
    return toTimeInputValue(now);
  });
  const [durationMin, setDurationMin] = useState(15);
  const [notes, setNotes] = useState("");
  const [bankReference, setBankReference] = useState("");
  const [bankSlipUrl, setBankSlipUrl] = useState("");
  const [bankSlipFile, setBankSlipFile] = useState<File | null>(null);

  const [classId, setClassId] = useState("");
  const [classTitle, setClassTitle] = useState("");
  const [classTherapistId, setClassTherapistId] = useState("");
  const [classDuration, setClassDuration] = useState("");
  const [classCost, setClassCost] = useState("");
  const [classStartAt, setClassStartAt] = useState("");
  const [classEndAt, setClassEndAt] = useState("");
  const [classCapacity, setClassCapacity] = useState("");
  const [classDescription, setClassDescription] = useState("");

  const [eventName, setEventName] = useState("");
  const [eventColor, setEventColor] = useState<(typeof EVENT_COLORS)[number]["id"]>("blue");
  const [eventStartTime, setEventStartTime] = useState(() => {
    const now = new Date();
    now.setSeconds(0, 0);
    return toTimeInputValue(now);
  });
  const [eventEndTime, setEventEndTime] = useState(() => addMinutesToTime(toTimeInputValue(new Date()), 60));
  const [eventRecurrence, setEventRecurrence] = useState<(typeof EVENT_RECURRENCE)[number]["value"]>("none");
  const [eventTherapistId, setEventTherapistId] = useState("");
  const [eventClientId, setEventClientId] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [eventNotes, setEventNotes] = useState("");

  const [reminderTime, setReminderTime] = useState(() => {
    const now = new Date();
    now.setSeconds(0, 0);
    return toTimeInputValue(now);
  });
  const [reminderNotes, setReminderNotes] = useState("");

  const scheduleLabel = useMemo(() => {
    const [y, m, d] = date.split("-").map((x) => Number(x));
    const startUtc = zonedLocalYmdTimeToUtc(
      { year: y ?? 0, month: m ?? 1, day: d ?? 1 },
      startTime,
      timeZone,
    );
    const endUtc = addMinutes(startUtc, durationMin);
    const dayLabel = formatDateInTimeZone(startUtc, timeZone, {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
    return `${dayLabel} · ${formatTimeInTimeZone(startUtc, timeZone)} — ${formatTimeInTimeZone(endUtc, timeZone)}`;
  }, [date, durationMin, startTime, timeZone]);

  const serviceScheduleStart = useMemo(() => {
    const [y, m, d] = date.split("-").map((x) => Number(x));
    return zonedLocalYmdTimeToUtc(
      { year: y ?? 0, month: m ?? 1, day: d ?? 1 },
      startTime,
      timeZone,
    );
  }, [date, startTime, timeZone]);

  const serviceScheduleEnd = useMemo(
    () => addMinutes(serviceScheduleStart, durationMin),
    [serviceScheduleStart, durationMin],
  );

  const withinWorkingHours = useMemo(() => {
    if (offHoursBookingEnabled) return true;
    if (!workingHours.length) return false;
    return isRangeWithinWorkingHours(
      serviceScheduleStart,
      serviceScheduleEnd,
      workingHours,
      timeZone,
    );
  }, [
    offHoursBookingEnabled,
    workingHours,
    serviceScheduleStart,
    serviceScheduleEnd,
    timeZone,
  ]);

  const slotLockedFromCalendar =
    Boolean(initialSchedule) && !offHoursBookingEnabled && !withinWorkingHours;

  const workingHoursUnavailableMessage =
    "Therapist is not available at this time. This slot is outside their working hours.";

  const scheduleInPast = isAppointmentStartInPast(serviceScheduleStart);
  const minBookableDate = minBookableDateInputInTimeZone(timeZone);

  const eventScheduleLabel = useMemo(() => {
    const [y, m, d] = date.split("-").map((x) => Number(x));
    const startUtc = zonedLocalYmdTimeToUtc(
      { year: y ?? 0, month: m ?? 1, day: d ?? 1 },
      eventStartTime,
      timeZone,
    );
    const endUtc = zonedLocalYmdTimeToUtc(
      { year: y ?? 0, month: m ?? 1, day: d ?? 1 },
      eventEndTime,
      timeZone,
    );
    const dayLabel = formatDateInTimeZone(startUtc, timeZone, {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
    return `${dayLabel} · ${formatTimeInTimeZone(startUtc, timeZone)} — ${formatTimeInTimeZone(endUtc, timeZone)}`;
  }, [date, eventEndTime, eventStartTime, timeZone]);

  const reminderScheduleLabel = useMemo(() => {
    const [y, m, d] = date.split("-").map((x) => Number(x));
    const atUtc = zonedLocalYmdTimeToUtc(
      { year: y ?? 0, month: m ?? 1, day: d ?? 1 },
      reminderTime,
      timeZone,
    );
    const dayLabel = formatDateInTimeZone(atUtc, timeZone, {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
    return `${dayLabel} · ${formatTimeInTimeZone(atUtc, timeZone)}`;
  }, [date, reminderTime, timeZone]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    // Defer to avoid setState-in-effect lint rule.
    queueMicrotask(() => {
      setTab("service");
      setServiceId("");
      setSelectedTherapistId(therapistId ?? "");
      setClientId("");
      setAppointmentType("online");
      setNotes("");
      setBankReference("");
      setBankSlipUrl("");
      setBankSlipFile(null);
      setClassId("");
      setClassTitle("");
      setClassTherapistId(therapistId ?? "");
      setClassDuration("");
      setClassCost("");
      setClassStartAt("");
      setClassEndAt("");
      setClassCapacity("");
      setClassDescription("");
      setEventName("");
      setEventColor("blue");
      setEventRecurrence("none");
      setEventTherapistId(therapistId ?? "");
      setEventClientId("");
      setEventLocation("");
      setEventNotes("");
      setReminderNotes("");
      setErrorMsg(null);
      const nextStartTime = initialSchedule?.startTime ?? toTimeInputValue(new Date());
      if (initialSchedule) {
        setDate(initialSchedule.date);
        setStartTime(initialSchedule.startTime);
        setDurationMin(initialSchedule.durationMin);
        setEventStartTime(initialSchedule.startTime);
        setEventEndTime(addMinutesToTime(initialSchedule.startTime, initialSchedule.durationMin));
        setReminderTime(initialSchedule.startTime);
      } else {
        setEventStartTime(nextStartTime);
        setEventEndTime(addMinutesToTime(nextStartTime, 60));
        setReminderTime(nextStartTime);
      }
    });
  }, [open, initialSchedule, therapistId]);

  useEffect(() => {
    if (!open) return;
    const ac = new AbortController();
    setLoadingData(true);
    setErrorMsg(null);
    (async () => {
      try {
        const [servicesRes, classesRes, therapistsRes, clientsRes] = await Promise.all([
          fetch("/api/v1/admin/services", { method: "GET", cache: "no-store", signal: ac.signal }),
          fetch("/api/v1/admin/classes", { method: "GET", cache: "no-store", signal: ac.signal }),
          fetch("/api/v1/admin/therapists", { method: "GET", cache: "no-store", signal: ac.signal }),
          fetch("/api/v1/admin/clients?page=1&limit=100", {
            method: "GET",
            cache: "no-store",
            signal: ac.signal,
          }),
        ]);

        const servicesJson = (await servicesRes.json()) as any;
        const classesJson = (await classesRes.json()) as any;
        const therapistsJson = (await therapistsRes.json()) as any;
        const clientsJson = (await clientsRes.json()) as any;

        if (!servicesRes.ok || servicesJson?.status !== "success") {
          throw new Error(servicesJson?.message || "Failed to load services");
        }
        if (!therapistsRes.ok || therapistsJson?.status !== "success") {
          throw new Error(therapistsJson?.message || "Failed to load therapists");
        }
        if (!clientsRes.ok || clientsJson?.status !== "success") {
          throw new Error(clientsJson?.message || "Failed to load clients");
        }

        const nextServices = (servicesJson.data?.items ?? []).map((s: any) => ({
          serviceId: String(s.service_id),
          name: String(s.name),
        }));
        const apiClasses = (classesJson.data?.items ?? []).map((c: any) => ({
          classId: String(c.class_id),
          title: String(c.title ?? "Class"),
        }));
        const nextClasses = apiClasses.length > 0 ? apiClasses : [...PLACEHOLDER_CLASSES];
        const nextTherapists = (therapistsJson.data?.items ?? []).map((t: any) => ({
          therapistId: String(t.therapist_id),
          name: String(t.profiles?.full_name ?? "Therapist"),
        }));
        const nextClients = (clientsJson.data?.items ?? []).map((c: any) => ({
          clientId: String(c.clientId),
          fullName: String(c.fullName),
        }));

        setServices(nextServices);
        setClasses(nextClasses);
        setTherapists(nextTherapists);
        setClients(nextClients);
      } catch (e) {
        if ((e as any)?.name === "AbortError") return;
        setErrorMsg(e instanceof Error ? e.message : "Failed to load form data");
      } finally {
        setLoadingData(false);
      }
    })();

    return () => ac.abort();
  }, [open]);

  const clientOptions = useMemo(
    () =>
      clients.map((client) => ({
        value: client.clientId,
        label: client.fullName,
      })),
    [clients],
  );

  if (!open) return null;

  const canCreateService =
    tab === "service" &&
    Boolean(serviceId && clientId && selectedTherapistId) &&
    !scheduleInPast &&
    (offHoursBookingEnabled || withinWorkingHours);
  const canCreateClass =
    tab === "class" &&
    Boolean(
      classId &&
        classTitle.trim() &&
        classTherapistId &&
        classDuration.trim() &&
        classCost.trim() &&
        classStartAt &&
        classEndAt &&
        classCapacity.trim(),
    );
  const canCreateEvent =
    tab === "event" && Boolean(eventName.trim() && eventTherapistId);
  const canCreateReminder = tab === "reminder" && Boolean(date && reminderTime);
  const canCreate =
    canCreateService || canCreateClass || canCreateEvent || canCreateReminder;

  const tabBtn = (key: TabKey, label: string) => {
    const active = tab === key;
    return (
      <button
        key={key}
        type="button"
        onClick={() => setTab(key)}
        className={cx(
          "px-3 py-2.5 text-sm",
          active
            ? "font-semibold text-mgmt-primary border-b-2 border-mgmt-primary"
            : "font-medium text-mgmt-on-surface-variant hover:text-mgmt-on-surface",
        )}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-mgmt-inverse-surface/10 backdrop-blur-[2px]">
      <button
        type="button"
        aria-label="Close dialog"
        className="fixed inset-0"
        onClick={onClose}
      />

      <div
        className={cx(
          "relative z-[101] flex min-h-full items-start justify-center p-4 sm:items-center sm:p-6",
          drag.wrapperClassName,
        )}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className={cx(
            "flex w-full max-w-[640px] flex-col overflow-hidden rounded-xl bg-white shadow-[0_10px_40px_-10px_rgba(47,51,52,0.15)]",
            drag.dialogClassName,
          )}
          style={{
            maxHeight: "calc(100vh - 2rem)",
            transform: drag.dialogTransform,
          }}
        >
          <div
            className={cx("flex items-center justify-between px-6 pt-5 pb-3", drag.headerClassName)}
            {...drag.headerPointerHandlers}
          >
            <div className="flex min-w-0 items-center gap-1.5">
              {draggable ? (
                <MaterialSymbol
                  name="drag_indicator"
                  className="shrink-0 text-mgmt-on-surface-variant"
                  aria-hidden
                />
              ) : null}
              <h3 id={titleId} className="text-lg font-semibold text-mgmt-on-surface">
                Appointment
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1 text-mgmt-on-surface-variant transition-colors hover:bg-mgmt-surface-container-low"
              aria-label="Close"
            >
              <MaterialSymbol name="close" className="text-xl" />
            </button>
          </div>

          <div className="flex px-6 border-b border-mgmt-surface-container-low">
            {tabBtn("service", "Service")}
            {tabBtn("class", "Class")}
            {tabBtn("event", "Event")}
            {tabBtn("reminder", "Reminder")}
          </div>

          <div className="min-h-0 flex-1 space-y-7 overflow-y-auto px-6 py-6">
            {errorMsg ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMsg}
              </div>
            ) : null}
            {tab === "service" ? (
              <>
                {scheduleInPast ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    {PAST_APPOINTMENT_MESSAGE}
                  </div>
                ) : null}
                {!offHoursBookingEnabled && !withinWorkingHours ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    {workingHoursUnavailableMessage}
                  </div>
                ) : null}
                <div className="flex items-start gap-4">
                  <div className="mt-0.5">
                    <div className="h-5 w-5 rounded-full border-2 border-slate-300" />
                  </div>
                  <div className="flex-1 space-y-4">
                    <div>
                      <label className="text-sm font-medium text-mgmt-on-surface-variant">
                        Select a service
                      </label>
                      <div className="mt-2">
                        <select
                          value={serviceId}
                          onChange={(e) => setServiceId(e.target.value)}
                          className={fieldClass}
                          disabled={loadingData || services.length === 0}
                          aria-label="Service"
                        >
                          <option value="">
                            {loadingData ? "Loading services…" : "Select a service"}
                          </option>
                          {services.map((s) => (
                            <option key={s.serviceId} value={s.serviceId}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-mgmt-on-surface-variant">
                        Therapist
                      </label>
                      <div className="mt-2">
                        <select
                          value={selectedTherapistId}
                          onChange={(e) => setSelectedTherapistId(e.target.value)}
                          className={fieldClass}
                          disabled={loadingData || therapists.length === 0}
                          aria-label="Therapist"
                        >
                          <option value="">
                            {loadingData ? "Loading therapists…" : "Select a therapist"}
                          </option>
                          {therapists.map((t) => (
                            <option key={t.therapistId} value={t.therapistId}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <MaterialSymbol name="schedule" className="mt-0.5 text-slate-400" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-mgmt-on-surface">{scheduleLabel}</p>
                    <div className="mt-3 grid grid-cols-3 gap-3">
                      <div className="col-span-3 sm:col-span-1">
                        <label className="block text-[11px] font-semibold text-mgmt-on-surface-variant">
                          Appointment type
                        </label>
                        <select
                          value={appointmentType}
                          onChange={(e) =>
                            setAppointmentType(e.target.value as "online" | "in_person")
                          }
                          className="mt-1 h-10 w-full rounded-lg bg-mgmt-surface-container-low px-3 text-sm text-mgmt-on-surface outline-none ring-1 ring-transparent focus:ring-mgmt-primary/30"
                          aria-label="Appointment type"
                        >
                          <option value="online">Online</option>
                          <option value="in_person">In-person</option>
                        </select>
                      </div>
                      <div className="col-span-3 sm:col-span-1">
                        <label className="block text-[11px] font-semibold text-mgmt-on-surface-variant">
                          Date
                        </label>
                        <input
                          type="date"
                          value={date}
                          min={minBookableDate}
                          onChange={(e) => setDate(e.target.value)}
                          disabled={slotLockedFromCalendar}
                          className="mt-1 w-full rounded-lg bg-mgmt-surface-container-low px-3 py-2 text-sm text-mgmt-on-surface outline-none ring-1 ring-transparent focus:ring-mgmt-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
                        />
                      </div>
                      <div className="col-span-3 sm:col-span-1">
                        <label className="block text-[11px] font-semibold text-mgmt-on-surface-variant">
                          Start time
                        </label>
                        <input
                          type="time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          disabled={slotLockedFromCalendar}
                          className="mt-1 w-full rounded-lg bg-mgmt-surface-container-low px-3 py-2 text-sm text-mgmt-on-surface outline-none ring-1 ring-transparent focus:ring-mgmt-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
                        />
                      </div>
                      <div className="col-span-3 sm:col-span-1">
                        <label className="block text-[11px] font-semibold text-mgmt-on-surface-variant">
                          Duration
                        </label>
                        <select
                          value={durationMin}
                          onChange={(e) => setDurationMin(Number(e.target.value))}
                          disabled={slotLockedFromCalendar}
                          className="mt-1 w-full rounded-lg bg-mgmt-surface-container-low px-3 py-2 text-sm text-mgmt-on-surface outline-none ring-1 ring-transparent focus:ring-mgmt-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {[15, 30, 45, 60, 75, 90, 120].map((m) => (
                            <option key={m} value={m}>
                              {m} min
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <MaterialSymbol name="person" className="mt-0.5 text-slate-400" />
                  <div className="flex-1">
                    <label className="text-sm font-medium text-mgmt-on-surface-variant">
                      Add guest(s)
                    </label>
                    <div className="mt-2">
                      <SearchableSelect
                        value={clientId}
                        onChange={setClientId}
                        options={clientOptions}
                        placeholder="Search or select a client"
                        loading={loadingData}
                        disabled={!loadingData && clients.length === 0}
                        emptyLabel="No clients found"
                        ariaLabel="Client"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <MaterialSymbol name="notes" className="mt-0.5 text-slate-400" />
                  <div className="flex-1">
                    <label className="truncate text-sm font-medium text-mgmt-on-surface-variant">
                      Notes to provider and guest(s)
                    </label>
                    <div className="mt-2">
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Type notes…"
                        className={textareaFieldClass}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <MaterialSymbol name="payments" className="mt-0.5 text-slate-400" />
                  <div className="flex-1">
                    <label className="text-sm font-medium text-mgmt-on-surface-variant">
                      Bank slip (optional)
                    </label>
                    <p className="mt-1 text-xs text-mgmt-on-surface-variant">
                      Upload a bank transfer slip now, or leave blank for the client to pay later.
                    </p>
                    <div className="mt-3">
                      <BankSlipUploadFields
                        bankReference={bankReference}
                        onBankReferenceChange={setBankReference}
                        bankSlipUrl={bankSlipUrl}
                        onBankSlipUrlChange={setBankSlipUrl}
                        selectedFile={bankSlipFile}
                        onFileChange={setBankSlipFile}
                        disabled={submitting}
                      />
                    </div>
                  </div>
                </div>
              </>
            ) : null}

            {tab === "class" ? (
              <>
                <div className="flex items-start gap-4">
                  <div className="mt-0.5">
                    <div className="h-5 w-5 rounded-full border-2 border-slate-300" />
                  </div>
                  <div className="flex-1 space-y-4">
                    <div>
                      <label
                        className="text-sm font-medium text-mgmt-on-surface-variant"
                        htmlFor="booking-class-select"
                      >
                        Select a class
                      </label>
                      <div className="mt-2">
                        <select
                          id="booking-class-select"
                          value={classId}
                          onChange={(e) => setClassId(e.target.value)}
                          className={fieldClass}
                          disabled={loadingData || classes.length === 0}
                        >
                          <option value="">
                            {loadingData ? "Loading classes…" : "Select a class"}
                          </option>
                          {classes.map((c) => (
                            <option key={c.classId} value={c.classId}>
                              {c.title}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label
                        className="text-sm font-medium text-mgmt-on-surface-variant"
                        htmlFor="booking-class-title"
                      >
                        Title
                      </label>
                      <div className="mt-2">
                        <input
                          id="booking-class-title"
                          value={classTitle}
                          onChange={(e) => setClassTitle(e.target.value)}
                          className={fieldClass}
                          placeholder="Evening mindfulness group"
                        />
                      </div>
                    </div>
                    <div>
                      <label
                        className="text-sm font-medium text-mgmt-on-surface-variant"
                        htmlFor="booking-class-therapist"
                      >
                        Therapist
                      </label>
                      <div className="mt-2">
                        <select
                          id="booking-class-therapist"
                          value={classTherapistId}
                          onChange={(e) => setClassTherapistId(e.target.value)}
                          className={fieldClass}
                          disabled={loadingData || therapists.length === 0}
                        >
                          <option value="">
                            {loadingData ? "Loading therapists…" : "Select a therapist"}
                          </option>
                          {therapists.map((t) => (
                            <option key={t.therapistId} value={t.therapistId}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <MaterialSymbol name="schedule" className="mt-0.5 text-slate-400" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-mgmt-on-surface">Schedule & details</p>
                    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div>
                        <label
                          className="block text-[11px] font-semibold text-mgmt-on-surface-variant"
                          htmlFor="booking-class-duration"
                        >
                          Duration
                        </label>
                        <input
                          id="booking-class-duration"
                          value={classDuration}
                          onChange={(e) => setClassDuration(e.target.value)}
                          className="mt-1 h-10 w-full rounded-lg bg-mgmt-surface-container-low px-3 text-sm text-mgmt-on-surface outline-none ring-1 ring-transparent focus:ring-mgmt-primary/30"
                          placeholder="90 mins"
                        />
                      </div>
                      <div>
                        <label
                          className="block text-[11px] font-semibold text-mgmt-on-surface-variant"
                          htmlFor="booking-class-cost"
                        >
                          Cost
                        </label>
                        <input
                          id="booking-class-cost"
                          value={classCost}
                          onChange={(e) => setClassCost(e.target.value)}
                          className="mt-1 h-10 w-full rounded-lg bg-mgmt-surface-container-low px-3 text-sm text-mgmt-on-surface outline-none ring-1 ring-transparent focus:ring-mgmt-primary/30"
                          placeholder="Rs 2,500"
                        />
                      </div>
                      <div>
                        <label
                          className="block text-[11px] font-semibold text-mgmt-on-surface-variant"
                          htmlFor="booking-class-start"
                        >
                          Start at
                        </label>
                        <input
                          id="booking-class-start"
                          type="datetime-local"
                          value={classStartAt}
                          onChange={(e) => setClassStartAt(e.target.value)}
                          className="mt-1 h-10 w-full rounded-lg bg-mgmt-surface-container-low px-3 text-sm text-mgmt-on-surface outline-none ring-1 ring-transparent focus:ring-mgmt-primary/30"
                        />
                      </div>
                      <div>
                        <label
                          className="block text-[11px] font-semibold text-mgmt-on-surface-variant"
                          htmlFor="booking-class-end"
                        >
                          End at
                        </label>
                        <input
                          id="booking-class-end"
                          type="datetime-local"
                          value={classEndAt}
                          onChange={(e) => setClassEndAt(e.target.value)}
                          className="mt-1 h-10 w-full rounded-lg bg-mgmt-surface-container-low px-3 text-sm text-mgmt-on-surface outline-none ring-1 ring-transparent focus:ring-mgmt-primary/30"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label
                          className="block text-[11px] font-semibold text-mgmt-on-surface-variant"
                          htmlFor="booking-class-capacity"
                        >
                          Capacity
                        </label>
                        <input
                          id="booking-class-capacity"
                          type="number"
                          min={1}
                          value={classCapacity}
                          onChange={(e) => setClassCapacity(e.target.value)}
                          className="mt-1 h-10 w-full rounded-lg bg-mgmt-surface-container-low px-3 text-sm text-mgmt-on-surface outline-none ring-1 ring-transparent focus:ring-mgmt-primary/30"
                          placeholder="12"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <MaterialSymbol name="notes" className="mt-0.5 text-slate-400" />
                  <div className="flex-1">
                    <label
                      className="truncate text-sm font-medium text-mgmt-on-surface-variant"
                      htmlFor="booking-class-description"
                    >
                      Description
                    </label>
                    <div className="mt-2">
                      <textarea
                        id="booking-class-description"
                        value={classDescription}
                        onChange={(e) => setClassDescription(e.target.value)}
                        className={textareaFieldClass}
                        placeholder="Describe what participants can expect from this class…"
                        rows={4}
                      />
                    </div>
                  </div>
                </div>
              </>
            ) : null}

            {tab === "event" ? (
              <>
                <div className="flex items-start gap-4">
                  <div className="mt-0.5">
                    <div className="h-5 w-5 rounded-full border-2 border-slate-300" />
                  </div>
                  <div className="flex-1 space-y-4">
                    <div>
                      <label
                        className="text-sm font-medium text-mgmt-on-surface-variant"
                        htmlFor="booking-event-name"
                      >
                        Event name
                      </label>
                      <div className="mt-2">
                        <input
                          id="booking-event-name"
                          value={eventName}
                          onChange={(e) => setEventName(e.target.value)}
                          placeholder="Event name"
                          className={fieldClass}
                        />
                      </div>
                    </div>
                    <div>
                      <label
                        className="text-sm font-medium text-mgmt-on-surface-variant"
                        htmlFor="booking-event-color"
                      >
                        Event color
                      </label>
                      <div className="mt-2">
                        <select
                          id="booking-event-color"
                          value={eventColor}
                          onChange={(e) =>
                            setEventColor(e.target.value as (typeof EVENT_COLORS)[number]["id"])
                          }
                          className={fieldClass}
                        >
                          {EVENT_COLORS.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.id.charAt(0).toUpperCase() + c.id.slice(1)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label
                        className="text-sm font-medium text-mgmt-on-surface-variant"
                        htmlFor="booking-event-provider"
                      >
                        Provider
                      </label>
                      <div className="mt-2">
                        <select
                          id="booking-event-provider"
                          value={eventTherapistId}
                          onChange={(e) => setEventTherapistId(e.target.value)}
                          className={fieldClass}
                          disabled={loadingData || therapists.length === 0}
                        >
                          <option value="">
                            {loadingData ? "Loading therapists…" : "Select a provider"}
                          </option>
                          {therapists.map((t) => (
                            <option key={t.therapistId} value={t.therapistId}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <MaterialSymbol name="schedule" className="mt-0.5 text-slate-400" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-mgmt-on-surface">{eventScheduleLabel}</p>
                    <div className="mt-3 grid grid-cols-3 gap-3">
                      <div className="col-span-3 sm:col-span-1">
                        <label
                          className="block text-[11px] font-semibold text-mgmt-on-surface-variant"
                          htmlFor="booking-event-date"
                        >
                          Date
                        </label>
                        <input
                          id="booking-event-date"
                          type="date"
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                          className={gridFieldClass}
                        />
                      </div>
                      <div className="col-span-3 sm:col-span-1">
                        <label
                          className="block text-[11px] font-semibold text-mgmt-on-surface-variant"
                          htmlFor="booking-event-start"
                        >
                          Start time
                        </label>
                        <input
                          id="booking-event-start"
                          type="time"
                          value={eventStartTime}
                          onChange={(e) => setEventStartTime(e.target.value)}
                          className={gridFieldClass}
                        />
                      </div>
                      <div className="col-span-3 sm:col-span-1">
                        <label
                          className="block text-[11px] font-semibold text-mgmt-on-surface-variant"
                          htmlFor="booking-event-end"
                        >
                          End time
                        </label>
                        <input
                          id="booking-event-end"
                          type="time"
                          value={eventEndTime}
                          onChange={(e) => setEventEndTime(e.target.value)}
                          className={gridFieldClass}
                        />
                      </div>
                      <div className="col-span-3 sm:col-span-1">
                        <label
                          className="block text-[11px] font-semibold text-mgmt-on-surface-variant"
                          htmlFor="booking-event-recurrence"
                        >
                          Recurrence
                        </label>
                        <select
                          id="booking-event-recurrence"
                          value={eventRecurrence}
                          onChange={(e) =>
                            setEventRecurrence(
                              e.target.value as (typeof EVENT_RECURRENCE)[number]["value"],
                            )
                          }
                          className={gridFieldClass}
                        >
                          {EVENT_RECURRENCE.map((r) => (
                            <option key={r.value} value={r.value}>
                              {r.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <MaterialSymbol name="person" className="mt-0.5 text-slate-400" />
                  <div className="flex-1">
                    <label
                      className="text-sm font-medium text-mgmt-on-surface-variant"
                      htmlFor="booking-event-guests"
                    >
                      Add guest(s)
                    </label>
                    <div className="mt-2">
                      <SearchableSelect
                        id="booking-event-guests"
                        value={eventClientId}
                        onChange={setEventClientId}
                        options={clientOptions}
                        placeholder="Search or select a client"
                        loading={loadingData}
                        disabled={!loadingData && clients.length === 0}
                        emptyLabel="No clients found"
                        ariaLabel="Event guest"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <MaterialSymbol name="location_on" className="mt-0.5 text-slate-400" />
                  <div className="flex-1">
                    <label
                      className="text-sm font-medium text-mgmt-on-surface-variant"
                      htmlFor="booking-event-location"
                    >
                      Location or video link
                    </label>
                    <div className="mt-2">
                      <input
                        id="booking-event-location"
                        value={eventLocation}
                        onChange={(e) => setEventLocation(e.target.value)}
                        placeholder="Add location or video link"
                        className={fieldClass}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <MaterialSymbol name="notes" className="mt-0.5 text-slate-400" />
                  <div className="flex-1">
                    <label
                      className="truncate text-sm font-medium text-mgmt-on-surface-variant"
                      htmlFor="booking-event-notes"
                    >
                      Notes to provider and guest(s)
                    </label>
                    <div className="mt-2">
                      <textarea
                        id="booking-event-notes"
                        value={eventNotes}
                        onChange={(e) => setEventNotes(e.target.value)}
                        placeholder="Type notes…"
                        className={textareaFieldClass}
                        rows={4}
                      />
                    </div>
                  </div>
                </div>
              </>
            ) : null}

            {tab === "reminder" ? (
              <>
                <div className="flex items-start gap-4">
                  <MaterialSymbol name="schedule" className="mt-0.5 text-slate-400" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-mgmt-on-surface">{reminderScheduleLabel}</p>
                    <div className="mt-3 grid grid-cols-3 gap-3">
                      <div className="col-span-3 sm:col-span-1">
                        <label
                          className="block text-[11px] font-semibold text-mgmt-on-surface-variant"
                          htmlFor="booking-reminder-date"
                        >
                          Date
                        </label>
                        <input
                          id="booking-reminder-date"
                          type="date"
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                          className={gridFieldClass}
                        />
                      </div>
                      <div className="col-span-3 sm:col-span-1">
                        <label
                          className="block text-[11px] font-semibold text-mgmt-on-surface-variant"
                          htmlFor="booking-reminder-time"
                        >
                          Time
                        </label>
                        <input
                          id="booking-reminder-time"
                          type="time"
                          value={reminderTime}
                          onChange={(e) => setReminderTime(e.target.value)}
                          className={gridFieldClass}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <MaterialSymbol name="notes" className="mt-0.5 text-slate-400" />
                  <div className="flex-1">
                    <label
                      className="truncate text-sm font-medium text-mgmt-on-surface-variant"
                      htmlFor="booking-reminder-notes"
                    >
                      Notes
                    </label>
                    <div className="mt-2">
                      <textarea
                        id="booking-reminder-notes"
                        value={reminderNotes}
                        onChange={(e) => setReminderNotes(e.target.value)}
                        placeholder="Notes"
                        className={textareaFieldClass}
                        rows={4}
                      />
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </div>

          <div className="flex justify-end border-t border-mgmt-surface-container-low p-4">
            <button
              type="button"
              disabled={submitting || loadingData || !canCreate}
              className="rounded-xl bg-mgmt-primary px-4 py-2 text-sm font-semibold text-mgmt-on-primary transition-opacity hover:opacity-90 disabled:opacity-40"
              onClick={async () => {
                const blockedRangeError = "This time overlaps a therapist break or time off.";

                if (tab === "class") {
                  if (!canCreateClass) return;
                  if (classStartAt && classEndAt) {
                    const classStart = new Date(classStartAt);
                    const classEnd = new Date(classEndAt);
                    if (
                      !Number.isNaN(classStart.getTime()) &&
                      !Number.isNaN(classEnd.getTime()) &&
                      classEnd > classStart &&
                      isRangeBlocked(classStart, classEnd, blockedTimeBlocks)
                    ) {
                      setErrorMsg(blockedRangeError);
                      return;
                    }
                  }
                  onClose();
                  return;
                }
                if (tab === "event") {
                  if (!canCreateEvent) return;
                  const [y, m, d] = date.split("-").map((x) => Number(x));
                  const eventStart = zonedLocalYmdTimeToUtc(
                    { year: y ?? 0, month: m ?? 1, day: d ?? 1 },
                    eventStartTime,
                    timeZone,
                  );
                  const eventEnd = zonedLocalYmdTimeToUtc(
                    { year: y ?? 0, month: m ?? 1, day: d ?? 1 },
                    eventEndTime,
                    timeZone,
                  );
                  if (eventEnd > eventStart && isRangeBlocked(eventStart, eventEnd, blockedTimeBlocks)) {
                    setErrorMsg(blockedRangeError);
                    return;
                  }
                  onClose();
                  return;
                }
                if (tab === "reminder") {
                  if (!canCreateReminder) return;
                  onClose();
                  return;
                }
                if (!selectedTherapistId) {
                  setErrorMsg("Select a therapist.");
                  return;
                }
                if (!serviceId || !clientId) {
                  setErrorMsg("Select a service and a client.");
                  return;
                }
                if (!offHoursBookingEnabled && !withinWorkingHours) {
                  setErrorMsg(workingHoursUnavailableMessage);
                  return;
                }
                if (isAppointmentStartInPast(serviceScheduleStart)) {
                  setErrorMsg(PAST_APPOINTMENT_MESSAGE);
                  return;
                }

                const bankSlipFields = {
                  bankReference,
                  bankSlipUrl,
                  selectedFile: bankSlipFile,
                };
                const bankSlipValidationError = validateBankSlipFields(bankSlipFields);
                if (bankSlipValidationError) {
                  setErrorMsg(bankSlipValidationError);
                  return;
                }
                const slipIntent = hasBankSlipUploadIntent(bankSlipFields);

                setSubmitting(true);
                setErrorMsg(null);
                try {
                  const start = serviceScheduleStart;
                  const end = serviceScheduleEnd;

                  if (isRangeBlocked(start, end, blockedTimeBlocks)) {
                    setErrorMsg(blockedRangeError);
                    setSubmitting(false);
                    return;
                  }

                  const res = await fetch("/api/v1/admin/appointments", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({
                      client: { clientId },
                      therapistId: selectedTherapistId,
                      serviceId,
                      appointmentType,
                      startAt: start.toISOString(),
                      endAt: end.toISOString(),
                      allowOffHours: offHoursBookingEnabled,
                      note: notes || undefined,
                      ...(slipIntent ? { payment: { method: "bank_transfer" } } : {}),
                    }),
                  });
                  const json = (await res.json()) as any;
                  if (!res.ok || json?.status !== "success") {
                    throw new Error(json?.message || `Create failed (HTTP ${res.status})`);
                  }
                  const appointmentId = String(json?.data?.appointmentId ?? "");
                  if (!appointmentId) throw new Error("Create succeeded but no appointmentId returned");

                  if (slipIntent) {
                    const slipResult = await submitBankSlipTransfer(appointmentId, bankSlipFields);
                    if (!slipResult.ok) {
                      onCreated?.({
                        appointmentId,
                        therapistId: selectedTherapistId,
                        startAt: start.toISOString(),
                        endAt: end.toISOString(),
                        appointmentType,
                        emailSent: false,
                        emailError: undefined,
                      });
                      setErrorMsg(
                        `Appointment created, but bank slip upload failed: ${slipResult.message}. Open the appointment to retry.`,
                      );
                      return;
                    }
                  }

                  onCreated?.({
                    appointmentId,
                    therapistId: selectedTherapistId,
                    startAt: start.toISOString(),
                    endAt: end.toISOString(),
                    appointmentType,
                    emailSent: json?.data?.emailSent === true,
                    emailError:
                      typeof json?.data?.emailError === "string"
                        ? json.data.emailError
                        : undefined,
                  });
                  onClose();
                } catch (e) {
                  setErrorMsg(e instanceof Error ? e.message : "Failed to create appointment");
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              {tab === "reminder" ? "Set" : "Create"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

