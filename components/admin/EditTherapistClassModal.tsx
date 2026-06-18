"use client";

import { useEffect, useId, useState } from "react";
import MaterialSymbol from "@/components/admin/MaterialSymbol";
import ConfirmationModal from "@/components/admin/ConfirmationModal";
import { useAdminTherapists } from "@/components/admin/useAdminTherapists";
import { formatApiErrorMessage } from "@/lib/api/formatApiError";

export type EditTherapistClassModalItem = {
  id: string;
  title: string;
  meta: string;
  classId?: string;
  durationMinutes?: number;
  priceLkr?: number;
  therapistId?: string;
  description?: string;
  startAt?: string;
  endAt?: string;
  capacity?: string;
};

const DURATION_MIN = 10;
const DURATION_MAX = 1000;
const PRICE_MIN = 100;
const PRICE_MAX = 100_000;
const CAPACITY_MIN = 1;
const CAPACITY_MAX = 10_000;
const TITLE_MAX_LEN = 200;
const DESCRIPTION_MAX_LEN = 2000;

function digitsOnly(value: string, maxDigits: number): string {
  return value.replace(/\D/g, "").slice(0, maxDigits);
}

function toWholeNumber(value: unknown): number | undefined {
  if (value == null || value === "") return undefined;
  const n = Number(value);
  if (!Number.isFinite(n)) return undefined;
  return Math.floor(n);
}

function durationMinutesFromRange(startAt?: string, endAt?: string): string {
  if (!startAt || !endAt) return "";
  const start = new Date(startAt);
  const end = new Date(endAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "";
  const mins = Math.round((end.getTime() - start.getTime()) / 60_000);
  return mins > 0 ? String(mins) : "";
}

function initialDuration(classItem: EditTherapistClassModalItem | null): string {
  const fromApi = toWholeNumber(classItem?.durationMinutes);
  if (fromApi != null && fromApi > 0) return String(fromApi);
  return durationMinutesFromRange(classItem?.startAt, classItem?.endAt);
}

function initialCost(classItem: EditTherapistClassModalItem | null): string {
  const fromApi = toWholeNumber(classItem?.priceLkr);
  if (fromApi != null && fromApi > 0) return String(fromApi);
  return "";
}

function initialCapacity(classItem: EditTherapistClassModalItem | null): string {
  const raw = classItem?.capacity?.trim() ?? "";
  if (!raw) return "";
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? String(n) : "";
}

const inputClass =
  "h-12 w-full rounded-xl border-none bg-mgmt-surface-container-low px-4 text-mgmt-on-surface transition-all focus:bg-mgmt-surface-container-lowest focus:ring-2 focus:ring-mgmt-primary/20 focus:outline-none";

const textareaClass =
  "min-h-[120px] w-full resize-y rounded-xl border-none bg-mgmt-surface-container-low px-4 py-3 text-mgmt-on-surface transition-all focus:bg-mgmt-surface-container-lowest focus:ring-2 focus:ring-mgmt-primary/20 focus:outline-none";

const labelClass = "text-sm font-semibold text-mgmt-on-surface";

const prefixInputWrapClass =
  "flex h-12 overflow-hidden rounded-xl border-none bg-mgmt-surface-container-low ring-1 ring-transparent transition-all focus-within:bg-mgmt-surface-container-lowest focus-within:ring-2 focus-within:ring-mgmt-primary/20";

const prefixLabelClass =
  "flex shrink-0 items-center border-r border-mgmt-outline-variant/25 bg-mgmt-surface-container-low px-3 text-sm font-medium text-mgmt-on-surface-variant";

const prefixInputClass =
  "min-w-0 flex-1 bg-transparent px-4 text-sm text-mgmt-on-surface outline-none disabled:opacity-60";

const fieldHintClass = "text-xs text-mgmt-on-surface-variant";

const fieldErrorClass = "text-xs text-red-600";

function toDateTimeLocalValue(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function dateTimeLocalToIso(value: string): string | null {
  if (!value.trim()) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function validateTitleValue(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Title is required.";
  if (trimmed.length > TITLE_MAX_LEN) {
    return `Title must be at most ${TITLE_MAX_LEN} characters.`;
  }
  return null;
}

function validateDurationValue(value: string): string | null {
  if (!value.trim()) return "Duration is required.";
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return "Enter a valid duration.";
  if (n < DURATION_MIN || n > DURATION_MAX) {
    return `Duration must be between ${DURATION_MIN} and ${DURATION_MAX} minutes.`;
  }
  return null;
}

function validatePriceValue(value: string): string | null {
  if (!value.trim()) return "Cost is required.";
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return "Enter a valid cost.";
  if (n < PRICE_MIN || n > PRICE_MAX) {
    return `Cost must be between Rs. ${PRICE_MIN.toLocaleString("en-LK")} and Rs. ${PRICE_MAX.toLocaleString("en-LK")}.`;
  }
  return null;
}

function validateCapacityValue(value: string): string | null {
  if (!value.trim()) return "Capacity is required.";
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return "Enter a valid capacity.";
  if (n < CAPACITY_MIN || n > CAPACITY_MAX) {
    return `Capacity must be between ${CAPACITY_MIN.toLocaleString("en-LK")} and ${CAPACITY_MAX.toLocaleString("en-LK")}.`;
  }
  return null;
}

function validateStartAtValue(value: string): string | null {
  if (!value.trim()) return "Start time is required.";
  if (!dateTimeLocalToIso(value)) return "Enter a valid start time.";
  return null;
}

function validateEndAtValue(startAt: string, endAt: string): string | null {
  if (!endAt.trim()) return "End time is required.";
  const startIso = dateTimeLocalToIso(startAt);
  const endIso = dateTimeLocalToIso(endAt);
  if (!endIso) return "Enter a valid end time.";
  if (!startIso) return null;
  if (new Date(endIso) <= new Date(startIso)) {
    return "End time must be after start time.";
  }
  return null;
}

type Props = {
  /** When `null`, the modal opens in “add new class” mode with empty defaults. */
  classItem: EditTherapistClassModalItem | null;
  onClose: () => void;
  onSaved?: () => void;
};

export default function EditTherapistClassModal({ classItem, onClose, onSaved }: Props) {
  const isCreate = classItem === null;
  const titleId = useId();

  const [title, setTitle] = useState(() => classItem?.title ?? "");
  const [therapistId, setTherapistId] = useState(() => classItem?.therapistId ?? "");
  const [duration, setDuration] = useState(() => initialDuration(classItem));
  const [cost, setCost] = useState(() => initialCost(classItem));
  const [startAt, setStartAt] = useState(() => toDateTimeLocalValue(classItem?.startAt));
  const [endAt, setEndAt] = useState(() => toDateTimeLocalValue(classItem?.endAt));
  const [capacity, setCapacity] = useState(() => initialCapacity(classItem));
  const [description, setDescription] = useState(() => classItem?.description ?? "");
  const [fieldErrors, setFieldErrors] = useState<{
    title?: string;
    duration?: string;
    cost?: string;
    startAt?: string;
    endAt?: string;
    capacity?: string;
  }>({});
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const { therapists, loading: therapistsLoading } = useAdminTherapists();

  useEffect(() => {
    if (therapistId || therapists.length === 0) return;
    setTherapistId(therapists[0]!.id);
  }, [therapistId, therapists]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  async function confirmDelete() {
    if (isCreate || !classItem) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/v1/admin/classes/${encodeURIComponent(classItem.id)}`, {
        method: "DELETE",
        cache: "no-store",
      });
      const json = (await res.json()) as {
        status?: string;
        message?: string;
        errors?: Array<{ field?: string; message?: string }>;
      };
      if (!res.ok || json?.status !== "success") {
        throw new Error(formatApiErrorMessage(json, `Delete failed (HTTP ${res.status})`));
      }
      setDeleteConfirmOpen(false);
      onSaved?.();
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Failed to delete class");
    } finally {
      setSubmitting(false);
    }
  }

  async function onSave() {
    if (!canSave) return;

    const nextFieldErrors = {
      title: validateTitleValue(title) ?? undefined,
      duration: validateDurationValue(duration) ?? undefined,
      cost: validatePriceValue(cost) ?? undefined,
      startAt: validateStartAtValue(startAt) ?? undefined,
      endAt: validateEndAtValue(startAt, endAt) ?? undefined,
      capacity: validateCapacityValue(capacity) ?? undefined,
    };
    const firstError = Object.values(nextFieldErrors).find(Boolean);
    if (firstError) {
      setFieldErrors(nextFieldErrors);
      setErrorMsg(firstError);
      return;
    }

    const startIso = dateTimeLocalToIso(startAt)!;
    const endIso = dateTimeLocalToIso(endAt)!;

    setSubmitting(true);
    setErrorMsg(null);
    setFieldErrors({});
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        startAt: startIso,
        endAt: endIso,
        capacity: Number.parseInt(capacity, 10),
        isActive: true,
      };

      const res = isCreate
        ? await fetch("/api/v1/admin/classes", {
            method: "POST",
            cache: "no-store",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch(`/api/v1/admin/classes/${encodeURIComponent(classItem!.id)}`, {
            method: "PUT",
            cache: "no-store",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(payload),
          });

      const json = (await res.json()) as {
        status?: string;
        message?: string;
        errors?: Array<{ field?: string; message?: string }>;
      };
      if (!res.ok || json?.status !== "success") {
        throw new Error(formatApiErrorMessage(json, `Save failed (HTTP ${res.status})`));
      }
      onSaved?.();
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Failed to save class");
    } finally {
      setSubmitting(false);
    }
  }

  const canSave = Boolean(
    therapistId &&
      title.trim() &&
      duration.trim() &&
      cost.trim() &&
      startAt &&
      endAt &&
      capacity.trim() &&
      !validateTitleValue(title) &&
      !validateDurationValue(duration) &&
      !validatePriceValue(cost) &&
      !validateStartAtValue(startAt) &&
      !validateEndAtValue(startAt, endAt) &&
      !validateCapacityValue(capacity) &&
      !submitting &&
      !therapistsLoading,
  );

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-mgmt-inverse-surface/10 backdrop-blur-[2px]">
      <button type="button" className="fixed inset-0" aria-label="Close dialog" onClick={onClose} />

      <div className="relative z-[101] flex min-h-full items-start justify-center p-4 sm:items-center sm:p-6">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="flex w-full max-w-[640px] flex-col overflow-hidden rounded-2xl bg-white shadow-[0_10px_40px_-10px_rgba(47,51,52,0.15)]"
          style={{ maxHeight: "calc(100vh - 2rem)" }}
        >
          <header className="flex items-start gap-4 border-b border-mgmt-outline-variant/20 px-8 py-6">
            <div className="flex-1">
              <h2 id={titleId} className="text-xl font-bold text-mgmt-on-surface">
                {isCreate ? "New class" : "Edit class"}
              </h2>
              <p className="mt-1 text-sm text-mgmt-on-surface-variant">
                Set class details, schedule, therapist assignment, and capacity.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-mgmt-on-surface-variant hover:bg-mgmt-surface-container-low"
              aria-label="Close"
            >
              <MaterialSymbol name="close" className="text-xl" />
            </button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-8 py-6">
            {errorMsg ? (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMsg}
              </div>
            ) : null}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <label className={labelClass} htmlFor="therapist-class-title">
                  Title
                </label>
                <input
                  id="therapist-class-title"
                  value={title}
                  maxLength={TITLE_MAX_LEN}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, title: undefined }));
                  }}
                  onBlur={() => {
                    const message = validateTitleValue(title);
                    setFieldErrors((prev) => ({ ...prev, title: message ?? undefined }));
                  }}
                  className={inputClass}
                  placeholder="Evening mindfulness group"
                  aria-invalid={Boolean(fieldErrors.title)}
                />
                {fieldErrors.title ? (
                  <p className={fieldErrorClass}>{fieldErrors.title}</p>
                ) : (
                  <p className={fieldHintClass}>Up to {TITLE_MAX_LEN} characters</p>
                )}
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className={labelClass} htmlFor="therapist-class-therapist">
                  Therapist
                </label>
                <select
                  id="therapist-class-therapist"
                  value={therapistId}
                  onChange={(e) => setTherapistId(e.target.value)}
                  disabled={therapistsLoading}
                  className={inputClass}
                >
                  {therapistsLoading ? (
                    <option value="">Loading therapists…</option>
                  ) : therapists.length === 0 ? (
                    <option value="">No therapists available</option>
                  ) : (
                    therapists.map((therapist) => (
                      <option key={therapist.id} value={therapist.id}>
                        {therapist.name}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="space-y-2">
                <label className={labelClass} htmlFor="therapist-class-duration">
                  Duration
                </label>
                <div className={prefixInputWrapClass}>
                  <span className={prefixLabelClass}>mins</span>
                  <input
                    id="therapist-class-duration"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    value={duration}
                    onChange={(e) => {
                      setDuration(digitsOnly(e.target.value, 4));
                      setFieldErrors((prev) => ({ ...prev, duration: undefined }));
                    }}
                    onBlur={() => {
                      const message = validateDurationValue(duration);
                      setFieldErrors((prev) => ({ ...prev, duration: message ?? undefined }));
                    }}
                    className={prefixInputClass}
                    placeholder="90"
                    aria-invalid={Boolean(fieldErrors.duration)}
                    aria-describedby="therapist-class-duration-hint"
                  />
                </div>
                <p id="therapist-class-duration-hint" className={fieldHintClass}>
                  {DURATION_MIN}–{DURATION_MAX} minutes
                </p>
                {fieldErrors.duration ? (
                  <p className={fieldErrorClass}>{fieldErrors.duration}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <label className={labelClass} htmlFor="therapist-class-cost">
                  Cost
                </label>
                <div className={prefixInputWrapClass}>
                  <span className={prefixLabelClass}>Rs.</span>
                  <input
                    id="therapist-class-cost"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    value={cost}
                    onChange={(e) => {
                      setCost(digitsOnly(e.target.value, 6));
                      setFieldErrors((prev) => ({ ...prev, cost: undefined }));
                    }}
                    onBlur={() => {
                      const message = validatePriceValue(cost);
                      setFieldErrors((prev) => ({ ...prev, cost: message ?? undefined }));
                    }}
                    className={prefixInputClass}
                    placeholder="2500"
                    aria-invalid={Boolean(fieldErrors.cost)}
                    aria-describedby="therapist-class-cost-hint"
                  />
                </div>
                <p id="therapist-class-cost-hint" className={fieldHintClass}>
                  Rs. {PRICE_MIN.toLocaleString("en-LK")}–{PRICE_MAX.toLocaleString("en-LK")}
                </p>
                {fieldErrors.cost ? <p className={fieldErrorClass}>{fieldErrors.cost}</p> : null}
              </div>

              <div className="space-y-2">
                <label className={labelClass} htmlFor="therapist-class-start-at">
                  Start at
                </label>
                <input
                  id="therapist-class-start-at"
                  type="datetime-local"
                  value={startAt}
                  onChange={(e) => {
                    setStartAt(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, startAt: undefined, endAt: undefined }));
                  }}
                  onBlur={() => {
                    setFieldErrors((prev) => ({
                      ...prev,
                      startAt: validateStartAtValue(startAt) ?? undefined,
                      endAt: validateEndAtValue(startAt, endAt) ?? undefined,
                    }));
                  }}
                  className={inputClass}
                  aria-invalid={Boolean(fieldErrors.startAt)}
                />
                {fieldErrors.startAt ? (
                  <p className={fieldErrorClass}>{fieldErrors.startAt}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <label className={labelClass} htmlFor="therapist-class-end-at">
                  End at
                </label>
                <input
                  id="therapist-class-end-at"
                  type="datetime-local"
                  value={endAt}
                  onChange={(e) => {
                    setEndAt(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, endAt: undefined }));
                  }}
                  onBlur={() => {
                    const message = validateEndAtValue(startAt, endAt);
                    setFieldErrors((prev) => ({ ...prev, endAt: message ?? undefined }));
                  }}
                  className={inputClass}
                  aria-invalid={Boolean(fieldErrors.endAt)}
                />
                {fieldErrors.endAt ? (
                  <p className={fieldErrorClass}>{fieldErrors.endAt}</p>
                ) : null}
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className={labelClass} htmlFor="therapist-class-capacity">
                  Capacity
                </label>
                <input
                  id="therapist-class-capacity"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={capacity}
                  onChange={(e) => {
                    setCapacity(digitsOnly(e.target.value, 5));
                    setFieldErrors((prev) => ({ ...prev, capacity: undefined }));
                  }}
                  onBlur={() => {
                    const message = validateCapacityValue(capacity);
                    setFieldErrors((prev) => ({ ...prev, capacity: message ?? undefined }));
                  }}
                  className={inputClass}
                  placeholder="12"
                  aria-invalid={Boolean(fieldErrors.capacity)}
                  aria-describedby="therapist-class-capacity-hint"
                />
                <p id="therapist-class-capacity-hint" className={fieldHintClass}>
                  {CAPACITY_MIN.toLocaleString("en-LK")}–{CAPACITY_MAX.toLocaleString("en-LK")} spots
                </p>
                {fieldErrors.capacity ? (
                  <p className={fieldErrorClass}>{fieldErrors.capacity}</p>
                ) : null}
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className={labelClass} htmlFor="therapist-class-description">
                  Description
                </label>
                <textarea
                  id="therapist-class-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={DESCRIPTION_MAX_LEN}
                  className={textareaClass}
                  placeholder="Describe what participants can expect from this class…"
                  rows={4}
                />
                <p className={fieldHintClass}>
                  {description.length}/{DESCRIPTION_MAX_LEN} characters
                </p>
              </div>
            </div>
          </div>

          <footer className="flex items-center justify-between gap-3 border-t border-mgmt-outline-variant/20 bg-white px-8 py-5">
            <div>
              {!isCreate && (
                <button
                  type="button"
                  onClick={() => setDeleteConfirmOpen(true)}
                  disabled={submitting}
                  className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-50 active:scale-[0.99] disabled:opacity-40"
                >
                  Delete
                </button>
              )}
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-mgmt-on-surface-variant hover:bg-mgmt-surface-container-low disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!canSave}
                onClick={() => void onSave()}
                className="rounded-xl bg-mgmt-primary px-5 py-2 text-sm font-bold text-mgmt-on-primary transition-transform active:scale-95 disabled:opacity-40"
              >
                {submitting ? "Saving…" : "Save"}
              </button>
            </div>
          </footer>
        </div>
      </div>

      {deleteConfirmOpen && classItem ? (
        <ConfirmationModal
          title="Delete class"
          description={`Are you sure you want to delete "${classItem.title}"? This cannot be undone.`}
          confirmLabel="Yes, delete"
          disableDismiss={submitting}
          onClose={() => {
            if (submitting) return;
            setDeleteConfirmOpen(false);
          }}
          onConfirm={confirmDelete}
        />
      ) : null}
    </div>
  );
}
