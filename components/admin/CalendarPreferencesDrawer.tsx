"use client";

import { useEffect, useId, useState } from "react";
import MaterialSymbol from "@/components/admin/MaterialSymbol";

const WEEK_START_OPTIONS = [
  { value: "monday", label: "Monday" },
  { value: "sunday", label: "Sunday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
  { value: "saturday", label: "Saturday" },
] as const;

const DAY_START_OPTIONS = [
  "12:00 AM",
  "1:00 AM",
  "2:00 AM",
  "3:00 AM",
  "4:00 AM",
  "5:00 AM",
  "6:00 AM",
  "7:00 AM",
  "8:00 AM",
  "9:00 AM",
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "1:00 PM",
  "2:00 PM",
  "3:00 PM",
  "4:00 PM",
  "5:00 PM",
  "6:00 PM",
  "7:00 PM",
  "8:00 PM",
  "9:00 PM",
  "10:00 PM",
  "11:00 PM",
] as const;

const SLOT_SIZE_OPTIONS = ["15 minutes", "30 minutes", "45 minutes", "60 minutes"] as const;
const DURATION_OPTIONS = ["15 minutes", "30 minutes", "45 minutes", "60 minutes", "90 minutes", "120 minutes"] as const;

const selectClass =
  "mt-2 h-10 w-full rounded-lg border border-mgmt-outline-variant/30 bg-white px-3 text-sm text-mgmt-on-surface outline-none focus:border-mgmt-primary/40 focus:ring-2 focus:ring-mgmt-primary/15";

function PreferenceToggle({
  checked,
  onChange,
  label,
  showInfo,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  showInfo?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="flex items-center gap-1.5 text-sm text-mgmt-on-surface">
        {label}
        {showInfo ? (
          <MaterialSymbol name="info" className="text-[16px] text-mgmt-on-surface-variant" />
        ) : null}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? "bg-mgmt-on-surface" : "bg-mgmt-surface-container-high"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
            checked ? "left-5" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}

function FieldLabel({
  children,
  showInfo,
  htmlFor,
}: {
  children: string;
  showInfo?: boolean;
  htmlFor?: string;
}) {
  return (
    <label htmlFor={htmlFor} className="flex items-center gap-1.5 text-sm font-medium text-mgmt-on-surface">
      <span>{children}</span>
      {showInfo ? (
        <MaterialSymbol name="info" className="text-[16px] text-mgmt-on-surface-variant" />
      ) : null}
    </label>
  );
}

export default function CalendarPreferencesDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const titleId = useId();
  const [weekStartsOn, setWeekStartsOn] = useState<(typeof WEEK_START_OPTIONS)[number]["value"]>("monday");
  const [dayStartsAt, setDayStartsAt] = useState<(typeof DAY_START_OPTIONS)[number]>("8:00 AM");
  const [calendarSlotSize, setCalendarSlotSize] =
    useState<(typeof SLOT_SIZE_OPTIONS)[number]>("15 minutes");
  const [showGridlines, setShowGridlines] = useState(false);
  const [eventDefaultDuration, setEventDefaultDuration] =
    useState<(typeof DURATION_OPTIONS)[number]>("60 minutes");
  const [slotFrequency, setSlotFrequency] = useState<(typeof SLOT_SIZE_OPTIONS)[number]>("15 minutes");
  const [showLabel, setShowLabel] = useState(false);

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

  return (
    <div
      className={`fixed inset-0 z-[120] ${open ? "pointer-events-auto" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      <button
        type="button"
        className={`absolute inset-0 bg-black/35 transition-opacity ${
          open ? "opacity-100" : "opacity-0"
        }`}
        aria-label="Close calendar preferences"
        onClick={onClose}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`absolute inset-y-0 right-0 flex w-full max-w-[400px] flex-col bg-white shadow-[-8px_0_24px_rgba(47,51,52,0.12)] transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-mgmt-outline-variant/15 px-6 py-5">
          <h2 id={titleId} className="text-lg font-bold text-mgmt-on-surface">
            Calendar preferences
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-mgmt-on-surface-variant transition-colors hover:bg-mgmt-surface-container-low hover:text-mgmt-on-surface"
            aria-label="Close"
          >
            <MaterialSymbol name="close" className="text-xl" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          <section>
            <h3 className="text-sm font-bold text-mgmt-on-surface">Calendar view</h3>
            <div className="mt-4 space-y-5">
              <div>
                <FieldLabel htmlFor="calendar-pref-week-start">Week starts on</FieldLabel>
                <select
                  id="calendar-pref-week-start"
                  value={weekStartsOn}
                  onChange={(e) =>
                    setWeekStartsOn(e.target.value as (typeof WEEK_START_OPTIONS)[number]["value"])
                  }
                  className={selectClass}
                >
                  {WEEK_START_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <FieldLabel htmlFor="calendar-pref-day-start">Day starts at</FieldLabel>
                <select
                  id="calendar-pref-day-start"
                  value={dayStartsAt}
                  onChange={(e) =>
                    setDayStartsAt(e.target.value as (typeof DAY_START_OPTIONS)[number])
                  }
                  className={selectClass}
                >
                  {DAY_START_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <FieldLabel htmlFor="calendar-pref-slot-size" showInfo>
                  Calendar slot size
                </FieldLabel>
                <select
                  id="calendar-pref-slot-size"
                  value={calendarSlotSize}
                  onChange={(e) =>
                    setCalendarSlotSize(e.target.value as (typeof SLOT_SIZE_OPTIONS)[number])
                  }
                  className={selectClass}
                >
                  {SLOT_SIZE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <PreferenceToggle
                label="Show gridlines"
                showInfo
                checked={showGridlines}
                onChange={setShowGridlines}
              />
            </div>
          </section>

          <section className="mt-8">
            <h3 className="text-sm font-bold text-mgmt-on-surface">Appointment window</h3>
            <div className="mt-4 space-y-5">
              <div>
                <FieldLabel htmlFor="calendar-pref-event-duration" showInfo>
                  Event default duration
                </FieldLabel>
                <select
                  id="calendar-pref-event-duration"
                  value={eventDefaultDuration}
                  onChange={(e) =>
                    setEventDefaultDuration(e.target.value as (typeof DURATION_OPTIONS)[number])
                  }
                  className={selectClass}
                >
                  {DURATION_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <FieldLabel htmlFor="calendar-pref-slot-frequency" showInfo>
                  Slot frequency
                </FieldLabel>
                <select
                  id="calendar-pref-slot-frequency"
                  value={slotFrequency}
                  onChange={(e) =>
                    setSlotFrequency(e.target.value as (typeof SLOT_SIZE_OPTIONS)[number])
                  }
                  className={selectClass}
                >
                  {SLOT_SIZE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <PreferenceToggle label="Show label" checked={showLabel} onChange={setShowLabel} />
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}
