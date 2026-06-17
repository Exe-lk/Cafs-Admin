"use client";

import { useEffect, useId, useState } from "react";
import MaterialSymbol from "@/components/admin/MaterialSymbol";
import { useAdminTherapists } from "@/components/admin/useAdminTherapists";

export type EditTherapistClassModalItem = {
  id: string;
  title: string;
  meta: string;
  classId?: string;
  duration?: string;
  cost?: string;
  therapistId?: string;
  description?: string;
  startAt?: string;
  endAt?: string;
  capacity?: string;
};

const inputClass =
  "h-12 w-full rounded-xl border-none bg-mgmt-surface-container-low px-4 text-mgmt-on-surface transition-all focus:bg-mgmt-surface-container-lowest focus:ring-2 focus:ring-mgmt-primary/20 focus:outline-none";

const textareaClass =
  "min-h-[120px] w-full resize-y rounded-xl border-none bg-mgmt-surface-container-low px-4 py-3 text-mgmt-on-surface transition-all focus:bg-mgmt-surface-container-lowest focus:ring-2 focus:ring-mgmt-primary/20 focus:outline-none";

const labelClass = "text-sm font-semibold text-mgmt-on-surface";

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

function parseCapacity(value: string): number | null {
  const n = Number.parseInt(value.trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
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
  const [duration, setDuration] = useState(() => classItem?.duration ?? "");
  const [cost, setCost] = useState(() => classItem?.cost ?? "");
  const [startAt, setStartAt] = useState(() => toDateTimeLocalValue(classItem?.startAt));
  const [endAt, setEndAt] = useState(() => toDateTimeLocalValue(classItem?.endAt));
  const [capacity, setCapacity] = useState(() => classItem?.capacity ?? "");
  const [description, setDescription] = useState(() => classItem?.description ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

  async function onDelete() {
    if (isCreate || !classItem) return;
    const ok = window.confirm("Delete this class?");
    if (!ok) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/v1/admin/classes/${encodeURIComponent(classItem.id)}`, {
        method: "DELETE",
        cache: "no-store",
      });
      const json = (await res.json()) as { status?: string; message?: string };
      if (!res.ok || json?.status !== "success") {
        throw new Error(json?.message || `Delete failed (HTTP ${res.status})`);
      }
      onSaved?.();
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Failed to delete class");
    } finally {
      setSubmitting(false);
    }
  }

  async function onSave() {
    if (!canSave) return;

    const startIso = dateTimeLocalToIso(startAt);
    const endIso = dateTimeLocalToIso(endAt);
    if (!startIso || !endIso) {
      setErrorMsg("Invalid start or end time");
      return;
    }
    if (new Date(endIso) <= new Date(startIso)) {
      setErrorMsg("End time must be after start time");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        startAt: startIso,
        endAt: endIso,
        capacity: parseCapacity(capacity),
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

      const json = (await res.json()) as { status?: string; message?: string };
      if (!res.ok || json?.status !== "success") {
        throw new Error(json?.message || `Save failed (HTTP ${res.status})`);
      }
      onSaved?.();
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Failed to save class");
    } finally {
      setSubmitting(false);
    }
  }

  const canSave = Boolean(
    title.trim() &&
      therapistId &&
      duration.trim() &&
      cost.trim() &&
      startAt &&
      endAt &&
      capacity.trim() &&
      !submitting,
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
                  onChange={(e) => setTitle(e.target.value)}
                  className={inputClass}
                  placeholder="Evening mindfulness group"
                />
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
                <input
                  id="therapist-class-duration"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className={inputClass}
                  placeholder="90 mins"
                />
              </div>

              <div className="space-y-2">
                <label className={labelClass} htmlFor="therapist-class-cost">
                  Cost
                </label>
                <input
                  id="therapist-class-cost"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  className={inputClass}
                  placeholder="Rs 2,500"
                />
              </div>

              <div className="space-y-2">
                <label className={labelClass} htmlFor="therapist-class-start-at">
                  Start at
                </label>
                <input
                  id="therapist-class-start-at"
                  type="datetime-local"
                  value={startAt}
                  onChange={(e) => setStartAt(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="space-y-2">
                <label className={labelClass} htmlFor="therapist-class-end-at">
                  End at
                </label>
                <input
                  id="therapist-class-end-at"
                  type="datetime-local"
                  value={endAt}
                  onChange={(e) => setEndAt(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className={labelClass} htmlFor="therapist-class-capacity">
                  Capacity
                </label>
                <input
                  id="therapist-class-capacity"
                  type="number"
                  min={1}
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  className={inputClass}
                  placeholder="12"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className={labelClass} htmlFor="therapist-class-description">
                  Description
                </label>
                <textarea
                  id="therapist-class-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={textareaClass}
                  placeholder="Describe what participants can expect from this class…"
                  rows={4}
                />
              </div>
            </div>
          </div>

          <footer className="flex items-center justify-between gap-3 border-t border-mgmt-outline-variant/20 bg-white px-8 py-5">
            <div>
              {!isCreate && (
                <button
                  type="button"
                  onClick={() => void onDelete()}
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
    </div>
  );
}
