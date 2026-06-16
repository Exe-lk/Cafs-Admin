"use client";

import { useEffect, useId, useMemo, useState } from "react";
import AppointmentHistoryPanel from "@/components/admin/AppointmentHistoryPanel";
import MaterialSymbol from "@/components/admin/MaterialSymbol";
import { useAdminTherapists } from "@/components/admin/useAdminTherapists";
import {
  approvalStatusForAppointmentStatus,
  type DbAppointmentStatus,
} from "@/lib/calendar/appointmentStatus";
import {
  isAppointmentStartInPast,
  minBookableDateInputInTimeZone,
  PAST_APPOINTMENT_MESSAGE,
  validateAppointmentSchedule,
} from "@/lib/calendar/scheduling";
import {
  formatDateInTimeZone,
  formatTimeInTimeZone,
  normalizeTimeZone,
  zonedLocalYmdTimeToUtc,
} from "@/lib/timezone";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export type AdminEditableAppointment = {
  dayId: string;
  sessionId: string;
  dateLine: string;
  timeRange: string;
  title: string;
  /** @deprecated Use therapistName — kept for legacy customer detail mock data */
  providerName?: string;
  therapistId?: string;
  therapistName?: string;
  providerAvatarUrl?: string | null;
  videoLink?: string;
  notes?: string;
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
  /** When present, modal will persist changes via admin appointments API. */
  startAt?: string;
  /** When present, modal will persist changes via admin appointments API. */
  endAt?: string;
  appointmentType?: "online" | "in_person";
};

const MIN_REJECT_REASON_LEN = 3;

const FIELD_SELECT_CLASS =
  "mt-1 h-10 w-full appearance-none rounded-lg border border-mgmt-outline-variant/20 bg-mgmt-surface-container-low py-2 pl-3 pr-9 text-sm text-mgmt-on-surface outline-none ring-1 ring-transparent focus:ring-mgmt-primary/30 disabled:cursor-default disabled:opacity-90";

const EDIT_APPOINTMENT_STATUS_OPTIONS: Array<{ value: DbAppointmentStatus; label: string }> = [
  { value: "pending_payment", label: "Awaiting payment" },
  { value: "pending_confirmation", label: "Awaiting confirmation" },
  { value: "confirmed", label: "Confirmed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "completed", label: "Completed" },
  { value: "no_show", label: "No show" },
  { value: "expired", label: "Expired" },
];

export function appointmentStatusLabel(status?: string): string {
  const match = EDIT_APPOINTMENT_STATUS_OPTIONS.find((o) => o.value === status);
  return match?.label ?? status?.replaceAll("_", " ") ?? "";
}

type TabKey = "details" | "history";

export default function EditAppointmentModal({
  appointment,
  therapistTimezone,
  readOnly = false,
  onClose,
  onSave,
  onDelete,
  onRejected,
}: {
  appointment: AdminEditableAppointment;
  therapistTimezone?: string;
  readOnly?: boolean;
  onClose: () => void;
  onSave: (next: AdminEditableAppointment) => void;
  onDelete: (args: { dayId: string; sessionId: string }) => void;
  onRejected?: (args: {
    dayId: string;
    sessionId: string;
    emailSent: boolean;
    emailError?: string;
  }) => void;
}) {
  const titleId = useId();
  const rejectTitleId = useId();
  const timeZone = normalizeTimeZone(therapistTimezone);
  const [draft, setDraft] = useState<AdminEditableAppointment>(appointment);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectSubmitting, setRejectSubmitting] = useState(false);
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("details");
  const [historyReloadKey, setHistoryReloadKey] = useState(0);
  const { therapists, loading: therapistsLoading } = useAdminTherapists();

  const isApiBacked = Boolean(appointment.startAt && appointment.endAt);
  const busy = submitting || rejectSubmitting;
  const minBookableDate = minBookableDateInputInTimeZone(timeZone);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (rejectOpen) {
        setRejectOpen(false);
        setRejectReason("");
        setRejectError(null);
        return;
      }
      onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, rejectOpen]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    setDraft(appointment);
    setRescheduleOpen(false);
    setRescheduleDate("");
    setRescheduleTime("");
    setSubmitting(false);
    setErrorMsg(null);
    setRejectOpen(false);
    setRejectReason("");
    setRejectSubmitting(false);
    setRejectError(null);
    setTab("details");
    setHistoryReloadKey(0);
  }, [appointment]);

  const canConfirmReject =
    rejectReason.trim().length >= MIN_REJECT_REASON_LEN && !rejectSubmitting;

  async function confirmReject() {
    if (!canConfirmReject) return;
    const reason = rejectReason.trim();
    setRejectSubmitting(true);
    setRejectError(null);
    setErrorMsg(null);

    try {
      if (isApiBacked) {
        const res = await fetch(
          `/api/v1/admin/appointments/${appointment.sessionId}/reject`,
          {
            method: "POST",
            cache: "no-store",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ reason }),
          },
        );
        const json = (await res.json()) as {
          status?: string;
          message?: string;
          data?: { emailSent?: boolean; emailError?: string };
        };
        if (!res.ok || json.status !== "success") {
          throw new Error(json.message || `Reject failed (HTTP ${res.status})`);
        }
        const emailSent = Boolean(json.data?.emailSent);
        const emailError =
          typeof json.data?.emailError === "string" ? json.data.emailError : undefined;
        setHistoryReloadKey((k) => k + 1);
        onRejected?.({
          dayId: appointment.dayId,
          sessionId: appointment.sessionId,
          emailSent,
          emailError,
        });
        onClose();
        return;
      }

      const next: AdminEditableAppointment = {
        ...draft,
        approvalStatus: "rejected",
        appointmentStatus: "cancelled",
      };
      onSave(next);
      onRejected?.({
        dayId: appointment.dayId,
        sessionId: appointment.sessionId,
        emailSent: false,
        emailError: "Email is only sent for calendar appointments",
      });
      onClose();
    } catch (e) {
      setRejectError(e instanceof Error ? e.message : "Failed to reject appointment");
    } finally {
      setRejectSubmitting(false);
    }
  }

  const canSave = useMemo(() => {
    const hasBasics = Boolean(
      draft.title.trim() && draft.dateLine.trim() && draft.timeRange.trim(),
    );
    if (!hasBasics) return false;
    if (isApiBacked) {
      return Boolean(draft.therapistId && draft.appointmentStatus);
    }
    return true;
  }, [
    draft.appointmentStatus,
    draft.dateLine,
    draft.therapistId,
    draft.timeRange,
    draft.title,
    isApiBacked,
  ]);

  const therapistOptions = useMemo(() => {
    const opts = therapists.map((t) => ({ id: t.id, name: t.name }));
    if (
      draft.therapistId &&
      !opts.some((o) => o.id === draft.therapistId) &&
      (draft.therapistName || draft.providerName)
    ) {
      opts.unshift({
        id: draft.therapistId,
        name: draft.therapistName ?? draft.providerName ?? "Therapist",
      });
    }
    return opts;
  }, [draft.providerName, draft.therapistId, draft.therapistName, therapists]);

  const approvalLabel =
    draft.approvalStatus === "accepted"
      ? "Accepted"
      : draft.approvalStatus === "rejected"
        ? "Rejected"
        : "Pending";
  const showApprovalActions =
    !readOnly &&
    (draft.appointmentStatus === "pending_payment" ||
      draft.appointmentStatus === "pending_confirmation");

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

      <div className="relative z-[101] flex min-h-full items-start justify-center p-4 sm:items-center sm:p-6">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="flex w-full max-w-[520px] flex-col overflow-hidden rounded-xl bg-white shadow-[0_10px_40px_-10px_rgba(47,51,52,0.15)]"
          style={{ maxHeight: "calc(100vh - 2rem)" }}
        >
          <div className="flex items-center justify-between px-6 pt-5 pb-3">
            <h3 id={titleId} className="text-lg font-semibold text-mgmt-on-surface">
              {readOnly ? "View appointment" : "Edit appointment"}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1 text-mgmt-on-surface-variant transition-colors hover:bg-mgmt-surface-container-low"
              aria-label="Close"
            >
              <MaterialSymbol name="close" className="text-xl" />
            </button>
          </div>

          <div className="flex border-b border-mgmt-surface-container-low px-6">
            {tabBtn("details", "Details")}
            {tabBtn("history", "History")}
          </div>

          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-6">
            {tab === "history" ? (
              <AppointmentHistoryPanel
                appointmentId={appointment.sessionId}
                enabled={isApiBacked}
                reloadKey={historyReloadKey}
              />
            ) : null}
            {tab === "details" && errorMsg ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMsg}
              </div>
            ) : null}
            {tab === "details" ? (
            <>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-mgmt-surface-container-low px-4 py-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-mgmt-on-surface-variant">Approval status</p>
                <p className="truncate text-sm font-bold text-mgmt-on-surface">{approvalLabel}</p>
              </div>
              {showApprovalActions ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const hasProof = Boolean((draft.proofUrl ?? "").trim());
                      if (!hasProof) {
                        setErrorMsg(
                          "Cannot approve appointment without a bank slip. Please upload or attach a proof link first.",
                        );
                        return;
                      }
                      setErrorMsg(null);
                      setDraft((p) => ({
                        ...p,
                        approvalStatus: "accepted",
                        appointmentStatus: "confirmed",
                      }));
                    }}
                    className="rounded-xl bg-mgmt-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-mgmt-on-primary transition-opacity hover:opacity-90"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setRejectReason("");
                      setRejectError(null);
                      setRejectOpen(true);
                    }}
                    className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-red-600 transition-transform active:scale-95 disabled:opacity-40 dark:text-red-400"
                  >
                    Reject
                  </button>
                </div>
              ) : null}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-[11px] font-semibold text-mgmt-on-surface-variant">
                  Title
                </label>
                <input
                  value={draft.title}
                  readOnly={readOnly}
                  disabled={readOnly}
                  onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))}
                  className="mt-1 w-full rounded-lg bg-mgmt-surface-container-low px-3 py-2 text-sm text-mgmt-on-surface outline-none ring-1 ring-transparent focus:ring-mgmt-primary/30 disabled:cursor-default disabled:opacity-90"
                  placeholder="Appointment title…"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-mgmt-on-surface-variant">
                  Therapists
                </label>
                <div className="relative">
                  <select
                    value={draft.therapistId ?? ""}
                    disabled={readOnly || therapistsLoading}
                    onChange={(e) => {
                      const therapistId = e.target.value;
                      const therapistName =
                        therapistOptions.find((t) => t.id === therapistId)?.name ?? "";
                      setDraft((p) => ({ ...p, therapistId, therapistName }));
                    }}
                    className={FIELD_SELECT_CLASS}
                  >
                    <option value="" disabled>
                      {therapistsLoading ? "Loading therapists…" : "Select therapist…"}
                    </option>
                    {therapistOptions.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  <MaterialSymbol
                    name="expand_more"
                    className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-[20px] text-mgmt-on-surface-variant"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-mgmt-on-surface-variant">
                  Appointment state
                </label>
                <div className="relative">
                  <select
                    value={draft.appointmentStatus ?? ""}
                    disabled={readOnly}
                    onChange={(e) => {
                      const appointmentStatus = e.target.value as DbAppointmentStatus;
                      setDraft((p) => ({
                        ...p,
                        appointmentStatus,
                        approvalStatus: approvalStatusForAppointmentStatus(appointmentStatus),
                      }));
                    }}
                    className={FIELD_SELECT_CLASS}
                  >
                    <option value="" disabled>
                      Select state…
                    </option>
                    {EDIT_APPOINTMENT_STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <MaterialSymbol
                    name="expand_more"
                    className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-[20px] text-mgmt-on-surface-variant"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-mgmt-on-surface-variant">
                  Time range
                </label>
                <input
                  value={draft.timeRange}
                  readOnly={readOnly}
                  disabled={readOnly}
                  onChange={(e) => setDraft((p) => ({ ...p, timeRange: e.target.value }))}
                  className="mt-1 w-full rounded-lg bg-mgmt-surface-container-low px-3 py-2 text-sm text-mgmt-on-surface outline-none ring-1 ring-transparent focus:ring-mgmt-primary/30 disabled:cursor-default disabled:opacity-90"
                  placeholder="e.g. 2:00PM – 3:00PM"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-mgmt-on-surface-variant">
                  Date label
                </label>
                <input
                  value={draft.dateLine}
                  readOnly={readOnly}
                  disabled={readOnly}
                  onChange={(e) => setDraft((p) => ({ ...p, dateLine: e.target.value }))}
                  className="mt-1 w-full rounded-lg bg-mgmt-surface-container-low px-3 py-2 text-sm text-mgmt-on-surface outline-none ring-1 ring-transparent focus:ring-mgmt-primary/30 disabled:cursor-default disabled:opacity-90"
                  placeholder="e.g. 6 JAN, TUE"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-mgmt-on-surface-variant">
                  Video link (optional)
                </label>
                <input
                  value={draft.videoLink ?? ""}
                  readOnly={readOnly}
                  disabled={readOnly}
                  onChange={(e) => setDraft((p) => ({ ...p, videoLink: e.target.value }))}
                  className="mt-1 w-full rounded-lg bg-mgmt-surface-container-low px-3 py-2 text-sm text-mgmt-on-surface outline-none ring-1 ring-transparent focus:ring-mgmt-primary/30 disabled:cursor-default disabled:opacity-90"
                  placeholder="Paste meeting URL…"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-mgmt-on-surface-variant">
                  Proof link (optional)
                </label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    value={draft.proofUrl ?? ""}
                    readOnly={readOnly}
                    disabled={readOnly}
                    onChange={(e) => setDraft((p) => ({ ...p, proofUrl: e.target.value }))}
                    className="w-full rounded-lg bg-mgmt-surface-container-low px-3 py-2 text-sm text-mgmt-on-surface outline-none ring-1 ring-transparent focus:ring-mgmt-primary/30 disabled:cursor-default disabled:opacity-90"
                    placeholder="Paste proof URL…"
                  />
                  <a
                    href={draft.proofUrl || undefined}
                    target="_blank"
                    rel="noreferrer"
                    aria-disabled={!draft.proofUrl}
                    className={cx(
                      "shrink-0 rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wider transition-colors",
                      draft.proofUrl
                        ? "bg-mgmt-primary text-mgmt-on-primary transition-opacity hover:opacity-90"
                        : "cursor-not-allowed bg-mgmt-outline-variant/10 text-mgmt-on-surface-variant/60",
                    )}
                    onClick={(e) => {
                      if (!draft.proofUrl) e.preventDefault();
                    }}
                  >
                    View proof
                  </a>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-mgmt-on-surface-variant">
                  Notes (optional)
                </label>
                <textarea
                  value={draft.notes ?? ""}
                  readOnly={readOnly}
                  disabled={readOnly}
                  onChange={(e) => setDraft((p) => ({ ...p, notes: e.target.value }))}
                  className="mt-1 min-h-24 w-full resize-none rounded-lg bg-mgmt-surface-container-low px-3 py-2 text-sm text-mgmt-on-surface outline-none ring-1 ring-transparent focus:ring-mgmt-primary/30 disabled:cursor-default disabled:opacity-90"
                  placeholder="Type notes…"
                />
              </div>
            </div>

            {!readOnly ? (
            <div className="rounded-xl border border-mgmt-outline-variant/15 bg-white">
              <button
                type="button"
                onClick={() => setRescheduleOpen((v) => !v)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                aria-expanded={rescheduleOpen}
              >
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-mgmt-on-surface">Reschedule</span>
                  <span className="mt-0.5 block text-xs text-mgmt-on-surface-variant">
                    Pick a new date and time, then apply.
                  </span>
                </span>
                <MaterialSymbol
                  name="expand_more"
                  className={cx(
                    "text-xl text-mgmt-on-surface-variant transition-transform",
                    rescheduleOpen && "rotate-180",
                  )}
                />
              </button>

              {rescheduleOpen ? (
                <div className="border-t border-mgmt-outline-variant/10 px-4 py-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-mgmt-on-surface-variant">
                        Date
                      </label>
                      <input
                        type="date"
                        value={rescheduleDate}
                        min={minBookableDate}
                        onChange={(e) => setRescheduleDate(e.target.value)}
                        className="mt-1 w-full rounded-lg bg-mgmt-surface-container-low px-3 py-2 text-sm text-mgmt-on-surface outline-none ring-1 ring-transparent focus:ring-mgmt-primary/30"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-mgmt-on-surface-variant">
                        Time
                      </label>
                      <input
                        type="time"
                        value={rescheduleTime}
                        onChange={(e) => setRescheduleTime(e.target.value)}
                        className="mt-1 w-full rounded-lg bg-mgmt-surface-container-low px-3 py-2 text-sm text-mgmt-on-surface outline-none ring-1 ring-transparent focus:ring-mgmt-primary/30"
                      />
                    </div>
                    <button
                      type="button"
                      className="sm:col-span-2 rounded-xl bg-mgmt-primary px-4 py-2 text-sm font-semibold text-mgmt-on-primary transition-opacity hover:opacity-90 disabled:opacity-40"
                      disabled={!rescheduleDate || !rescheduleTime || busy}
                      onClick={() => {
                        if (!rescheduleDate || !rescheduleTime) return;
                        const next = applyReschedule(draft, rescheduleDate, rescheduleTime, timeZone);
                        if (next.startAt && isAppointmentStartInPast(new Date(next.startAt))) {
                          setErrorMsg(PAST_APPOINTMENT_MESSAGE);
                          return;
                        }
                        setErrorMsg(null);
                        setDraft(next);
                      }}
                    >
                      Apply reschedule
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
            ) : null}
            </>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-mgmt-surface-container-low p-4">
            {readOnly || tab === "history" ? (
              <div className="flex w-full justify-end">
                <button
                  type="button"
                  className="rounded-xl bg-mgmt-primary px-4 py-2.5 text-sm font-semibold text-mgmt-on-primary transition-opacity hover:opacity-90"
                  onClick={onClose}
                >
                  Close
                </button>
              </div>
            ) : (
            <>
            <button
              type="button"
              className={cx(
                "rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors",
                "border-red-500/30 bg-red-500/10 text-red-600 hover:bg-red-500/15 dark:text-red-400",
              )}
              disabled={busy}
              onClick={() => {
                const ok = window.confirm("Delete this appointment? This action cannot be undone.");
                if (!ok) return;
                setSubmitting(true);
                setErrorMsg(null);
                (async () => {
                  try {
                    // If this is a real appointment from the admin calendar API, sessionId is appointmentId.
                    if (appointment.startAt && appointment.endAt) {
                      const res = await fetch(`/api/v1/admin/appointments/${appointment.sessionId}`, {
                        method: "DELETE",
                        cache: "no-store",
                      });
                      const json = (await res.json()) as any;
                      if (!res.ok || json?.status !== "success") {
                        throw new Error(json?.message || `Delete failed (HTTP ${res.status})`);
                      }
                    }
                    onDelete({ dayId: appointment.dayId, sessionId: appointment.sessionId });
                    onClose();
                  } catch (e) {
                    setErrorMsg(e instanceof Error ? e.message : "Failed to delete appointment");
                  } finally {
                    setSubmitting(false);
                  }
                })();
              }}
            >
              Delete Appointment
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-mgmt-on-surface-variant transition-colors hover:bg-mgmt-surface-container-low"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-xl bg-mgmt-primary px-4 py-2 text-sm font-semibold text-mgmt-on-primary transition-opacity hover:opacity-90 disabled:opacity-40"
                disabled={!canSave || busy}
                onClick={() => {
                  if (!canSave) return;
                  setSubmitting(true);
                  setErrorMsg(null);
                  (async () => {
                    try {
                      // Persist to API when we have ISO times available (i.e. opened from real calendar data).
                      if (appointment.startAt && appointment.endAt) {
                        const nextStartAt = draft.startAt ?? appointment.startAt;
                        const nextEndAt = draft.endAt ?? appointment.endAt;
                        const hasTimeChange =
                          nextStartAt !== appointment.startAt || nextEndAt !== appointment.endAt;
                        const body: Record<string, unknown> = {
                          appointmentType: draft.appointmentType ?? appointment.appointmentType,
                          status: draft.appointmentStatus ?? appointment.appointmentStatus,
                          note: draft.notes ?? "",
                        };
                        if (
                          draft.therapistId &&
                          draft.therapistId !== appointment.therapistId
                        ) {
                          body.therapistId = draft.therapistId;
                        }
                        if (hasTimeChange) {
                          const scheduleCheck = validateAppointmentSchedule({
                            startUtc: new Date(nextStartAt),
                            endUtc: new Date(nextEndAt),
                          });
                          if (!scheduleCheck.ok) {
                            setErrorMsg(scheduleCheck.message);
                            setSubmitting(false);
                            return;
                          }
                          body.startAt = nextStartAt;
                          body.endAt = nextEndAt;
                        }
                        const res = await fetch(`/api/v1/admin/appointments/${appointment.sessionId}`, {
                          method: "PUT",
                          cache: "no-store",
                          headers: { "content-type": "application/json" },
                          body: JSON.stringify(body),
                        });
                        const json = (await res.json()) as any;
                        if (!res.ok || json?.status !== "success") {
                          throw new Error(json?.message || `Save failed (HTTP ${res.status})`);
                        }
                      }
                      onSave(draft);
                      onClose();
                    } catch (e) {
                      setErrorMsg(e instanceof Error ? e.message : "Failed to save appointment");
                    } finally {
                      setSubmitting(false);
                    }
                  })();
                }}
              >
                Save
              </button>
            </div>
            </>
            )}
          </div>
        </div>
      </div>

      {rejectOpen ? (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close reject dialog"
            className="absolute inset-0 bg-mgmt-inverse-surface/20"
            onClick={() => {
              if (rejectSubmitting) return;
              setRejectOpen(false);
              setRejectReason("");
              setRejectError(null);
            }}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={rejectTitleId}
            className="relative z-[111] w-full max-w-md rounded-xl bg-white p-6 shadow-[0_10px_40px_-10px_rgba(47,51,52,0.2)]"
          >
            <h4 id={rejectTitleId} className="text-base font-semibold text-mgmt-on-surface">
              Reject appointment
            </h4>
            <p className="mt-1 text-sm text-mgmt-on-surface-variant">
              The appointment will be cancelled and the time slot freed. The client will receive
              your reason by email{isApiBacked ? "" : " (calendar appointments only)"}.
            </p>
            {rejectError ? (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {rejectError}
              </div>
            ) : null}
            <label className="mt-4 block text-[11px] font-semibold text-mgmt-on-surface-variant">
              Reason for rejection
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              disabled={rejectSubmitting}
              className="mt-1 min-h-28 w-full resize-none rounded-lg bg-mgmt-surface-container-low px-3 py-2 text-sm text-mgmt-on-surface outline-none ring-1 ring-transparent focus:ring-mgmt-primary/30 disabled:opacity-60"
              placeholder="Explain why this appointment cannot be confirmed…"
              autoFocus
            />
            <p className="mt-1 text-xs text-mgmt-on-surface-variant">
              At least {MIN_REJECT_REASON_LEN} characters required.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                disabled={rejectSubmitting}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-mgmt-on-surface-variant hover:bg-mgmt-surface-container-low disabled:opacity-40"
                onClick={() => {
                  setRejectOpen(false);
                  setRejectReason("");
                  setRejectError(null);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!canConfirmReject}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white transition-transform active:scale-95 disabled:opacity-40"
                onClick={() => {
                  void confirmReject();
                }}
              >
                {rejectSubmitting ? "Rejecting…" : "Confirm reject"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function applyReschedule(
  appt: AdminEditableAppointment,
  isoDate: string,
  isoTime: string,
  timeZone: string,
): AdminEditableAppointment {
  const [y, m, d] = isoDate.split("-").map((x) => Number(x));
  const start = zonedLocalYmdTimeToUtc(
    { year: y ?? 0, month: m ?? 1, day: d ?? 1 },
    isoTime,
    timeZone,
  );
  const existingStart = appt.startAt ? new Date(appt.startAt) : null;
  const existingEnd = appt.endAt ? new Date(appt.endAt) : null;
  const durMs =
    existingStart && existingEnd && existingEnd.getTime() > existingStart.getTime()
      ? existingEnd.getTime() - existingStart.getTime()
      : 60 * 60000;
  const end = new Date(start.getTime() + durMs);

  const dateLine = formatDateInTimeZone(start, timeZone, {
    day: "2-digit",
    month: "short",
  }).toUpperCase();
  const dow = formatDateInTimeZone(start, timeZone, { weekday: "short" }).toUpperCase();
  const timeRange = `${formatTimeInTimeZone(start, timeZone)} – ${formatTimeInTimeZone(end, timeZone)}`;

  return {
    ...appt,
    dateLine: `${dateLine}, ${dow}`,
    timeRange,
    startAt: start.toISOString(),
    endAt: end.toISOString(),
  };
}

