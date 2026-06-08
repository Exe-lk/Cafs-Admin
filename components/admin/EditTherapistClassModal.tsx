"use client";

import { useEffect, useId, useState } from "react";
import MaterialSymbol from "@/components/admin/MaterialSymbol";

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

const PLACEHOLDER_CLASSES = [
  { id: "cls-001", label: "Mindfulness Foundations" },
  { id: "cls-002", label: "Anxiety Support Group" },
  { id: "cls-003", label: "Parenting Skills Workshop" },
] as const;

const PLACEHOLDER_THERAPISTS = [
  { id: "th-001", label: "Dr. Anjali Perera" },
  { id: "th-002", label: "Dr. Ruwan Silva" },
  { id: "th-003", label: "Ms. Nethmi Fernando" },
] as const;

const PLACEHOLDER_TITLE = "Evening mindfulness group";
const PLACEHOLDER_DURATION = "90 mins";
const PLACEHOLDER_COST = "Rs 2,500";
const PLACEHOLDER_CAPACITY = "12";
const PLACEHOLDER_DESCRIPTION =
  "A supportive group class introducing mindfulness techniques, breathing exercises, and stress management strategies.";
const PLACEHOLDER_START_AT = "2026-06-15T18:00";
const PLACEHOLDER_END_AT = "2026-06-15T19:30";

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

type Props = {
  /** When `null`, the modal opens in “add new class” mode with empty defaults. */
  classItem: EditTherapistClassModalItem | null;
  onClose: () => void;
  onSaved?: () => void;
};

export default function EditTherapistClassModal({ classItem, onClose, onSaved }: Props) {
  const isCreate = classItem === null;
  const titleId = useId();

  const [selectedClassId, setSelectedClassId] = useState(
    () => classItem?.classId ?? classItem?.id ?? PLACEHOLDER_CLASSES[0]!.id,
  );
  const [title, setTitle] = useState(() => classItem?.title ?? (isCreate ? "" : PLACEHOLDER_TITLE));
  const [therapistId, setTherapistId] = useState(
    () => classItem?.therapistId ?? PLACEHOLDER_THERAPISTS[0]!.id,
  );
  const [duration, setDuration] = useState(
    () => classItem?.duration ?? (isCreate ? "" : PLACEHOLDER_DURATION),
  );
  const [cost, setCost] = useState(() => classItem?.cost ?? (isCreate ? "" : PLACEHOLDER_COST));
  const [startAt, setStartAt] = useState(
    () => toDateTimeLocalValue(classItem?.startAt) || (isCreate ? "" : PLACEHOLDER_START_AT),
  );
  const [endAt, setEndAt] = useState(
    () => toDateTimeLocalValue(classItem?.endAt) || (isCreate ? "" : PLACEHOLDER_END_AT),
  );
  const [capacity, setCapacity] = useState(
    () => classItem?.capacity ?? (isCreate ? "" : PLACEHOLDER_CAPACITY),
  );
  const [description, setDescription] = useState(
    () => classItem?.description ?? (isCreate ? "" : PLACEHOLDER_DESCRIPTION),
  );

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

  function onDelete() {
    if (isCreate || !classItem) return;
    const ok = window.confirm("Delete this class?");
    if (!ok) return;
    onSaved?.();
  }

  function onSave() {
    if (!selectedClassId || !title.trim() || !therapistId) return;
    onSaved?.();
  }

  const canSave = Boolean(
    selectedClassId &&
      title.trim() &&
      therapistId &&
      duration.trim() &&
      cost.trim() &&
      startAt &&
      endAt &&
      capacity.trim(),
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
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <label className={labelClass} htmlFor="therapist-class-select">
                  Select a class
                </label>
                <select
                  id="therapist-class-select"
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className={inputClass}
                >
                  {PLACEHOLDER_CLASSES.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.label}
                    </option>
                  ))}
                </select>
              </div>

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
                  className={inputClass}
                >
                  {PLACEHOLDER_THERAPISTS.map((therapist) => (
                    <option key={therapist.id} value={therapist.id}>
                      {therapist.label}
                    </option>
                  ))}
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
                  onClick={onDelete}
                  className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-50 active:scale-[0.99]"
                >
                  Delete
                </button>
              )}
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-mgmt-on-surface-variant hover:bg-mgmt-surface-container-low"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!canSave}
                onClick={onSave}
                className="rounded-xl bg-mgmt-primary px-5 py-2 text-sm font-bold text-mgmt-on-primary transition-transform active:scale-95 disabled:opacity-40"
              >
                Save
              </button>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
