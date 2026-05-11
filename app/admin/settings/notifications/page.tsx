"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import MaterialSymbol from "@/components/admin/MaterialSymbol";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const fieldSelectClass =
  "h-11 min-w-[7rem] appearance-none rounded-xl border border-mgmt-outline-variant/30 bg-mgmt-surface-container-lowest px-3 pr-9 text-sm text-mgmt-on-surface outline-none transition-shadow focus:border-mgmt-primary/40 focus:ring-2 focus:ring-mgmt-primary/15";

const numberInputClass =
  "w-20 rounded-xl border border-mgmt-outline-variant/30 bg-mgmt-surface-container-lowest px-3 py-2.5 text-center text-sm tabular-nums text-mgmt-on-surface outline-none focus:border-mgmt-primary/40 focus:ring-2 focus:ring-mgmt-primary/15";

const checkInputClass =
  "mt-0.5 h-4 w-4 shrink-0 rounded border-2 border-mgmt-outline-variant accent-mgmt-on-surface focus:outline-none focus:ring-2 focus:ring-mgmt-primary/25";

function RadioCard({
  name,
  value,
  selected,
  onChange,
  title,
  description,
}: {
  name: string;
  value: string;
  selected: boolean;
  onChange: (v: string) => void;
  title: string;
  description: string;
}) {
  return (
    <label className="flex cursor-pointer gap-3 rounded-xl border border-transparent py-3 transition-colors hover:bg-mgmt-surface-container-low/80 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-mgmt-primary/30">
      <input
        type="radio"
        name={name}
        value={value}
        checked={selected}
        onChange={() => onChange(value)}
        className="peer sr-only"
      />
      <span
        className={cx(
          "relative mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
          selected ? "border-mgmt-on-surface bg-mgmt-on-surface" : "border-mgmt-outline-variant bg-mgmt-surface-container-lowest",
        )}
        aria-hidden
      >
        {selected ? <span className="h-2 w-2 rounded-full bg-white" /> : null}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-mgmt-on-surface">{title}</span>
        <span className="mt-0.5 block text-sm text-mgmt-on-surface-variant">{description}</span>
      </span>
    </label>
  );
}

function LabeledCheck({
  checked,
  onChange,
  label,
  sublabel,
  trailing,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  sublabel?: string;
  trailing?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <label className="flex cursor-pointer gap-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className={checkInputClass}
        />
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-mgmt-on-surface">{label}</span>
          {sublabel ? (
            <span className="mt-0.5 block text-sm text-mgmt-on-surface-variant">{sublabel}</span>
          ) : null}
        </span>
      </label>
      {trailing ? <div className="flex shrink-0 items-center gap-2 pl-8 sm:pl-0">{trailing}</div> : null}
    </div>
  );
}

function CheckRow({
  checked,
  onChange,
  label,
  sublabel,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  sublabel: string;
}) {
  return (
    <label className="flex cursor-pointer gap-3 py-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className={checkInputClass}
      />
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-mgmt-on-surface">{label}</span>
        <span className="mt-0.5 block text-sm text-mgmt-on-surface-variant">{sublabel}</span>
      </span>
    </label>
  );
}

export default function AdminSettingsNotificationsPage() {
  const [yourNotifMode, setYourNotifMode] = useState<"all" | "focus" | "none">("all");
  const [soundReminder, setSoundReminder] = useState(true);
  const [soundTone, setSoundTone] = useState("chime");

  const [teamConfirm, setTeamConfirm] = useState(true);
  const [teamChanges, setTeamChanges] = useState(true);
  const [teamCancel, setTeamCancel] = useState(true);
  const [teamReminderEmail, setTeamReminderEmail] = useState(true);
  const [teamReminderAmount, setTeamReminderAmount] = useState("1");
  const [teamReminderUnit, setTeamReminderUnit] = useState("days");
  const [ccEmails, setCcEmails] = useState<string[]>([]);

  const [custConfirm, setCustConfirm] = useState(true);
  const [custChanges, setCustChanges] = useState(true);
  const [custCancel, setCustCancel] = useState(true);
  const [custReminderEmail, setCustReminderEmail] = useState(true);
  const [custReminderAmount, setCustReminderAmount] = useState("1");
  const [custReminderUnit, setCustReminderUnit] = useState("days");

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-mgmt-surface-container-lowest">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        <header className="mb-2 flex flex-col gap-4 border-b border-mgmt-outline-variant/15 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-mgmt-on-surface">Notifications</h1>
          <button
            type="button"
            className="shrink-0 rounded-xl bg-black px-8 py-2.5 text-sm font-bold text-white transition-transform hover:opacity-90 active:scale-[0.98]"
          >
            Save
          </button>
        </header>

        <section className="mt-8 border-b border-mgmt-outline-variant/15 pb-10">
          <h2 className="text-lg font-bold text-mgmt-on-surface">Your notifications</h2>
          <p className="mt-2 text-sm text-mgmt-on-surface-variant">Select the real-time updates to receive.</p>

          <div className="mt-6 space-y-1 rounded-xl border border-mgmt-outline-variant/15 bg-mgmt-surface-container-lowest px-3">
            <RadioCard
              name="your-notif"
              value="all"
              selected={yourNotifMode === "all"}
              onChange={(v) => setYourNotifMode(v as "all" | "focus" | "none")}
              title="All"
              description="All chats, mentions and booking updates"
            />
            <RadioCard
              name="your-notif"
              value="focus"
              selected={yourNotifMode === "focus"}
              onChange={(v) => setYourNotifMode(v as "all" | "focus" | "none")}
              title="Focus mode"
              description="Only your chats, mentions and booking updates"
            />
            <RadioCard
              name="your-notif"
              value="none"
              selected={yourNotifMode === "none"}
              onChange={(v) => setYourNotifMode(v as "all" | "focus" | "none")}
              title="None"
              description="Switch off notifications"
            />
          </div>

          <div className="mt-10">
            <h3 className="text-sm font-semibold text-mgmt-on-surface">Sound</h3>
            <p className="mt-1 text-sm text-mgmt-on-surface-variant">Choose how notifications sound</p>
            <div className="mt-4 rounded-xl border border-mgmt-outline-variant/15 bg-mgmt-surface-container-lowest px-3">
              <LabeledCheck
                checked={soundReminder}
                onChange={setSoundReminder}
                label="Appointment Reminders"
                sublabel="10 minutes prior to each appointment"
                trailing={
                  <div className="relative">
                    <select
                      value={soundTone}
                      onChange={(e) => setSoundTone(e.target.value)}
                      className={fieldSelectClass}
                      aria-label="Notification sound"
                      disabled={!soundReminder}
                    >
                      <option value="chime">Chime</option>
                      <option value="bell">Bell</option>
                      <option value="ping">Ping</option>
                      <option value="none">None</option>
                    </select>
                    <MaterialSymbol
                      name="expand_more"
                      className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[20px] text-mgmt-on-surface-variant"
                    />
                  </div>
                }
              />
            </div>
          </div>
        </section>

        <section className="mt-10 border-b border-mgmt-outline-variant/15 pb-10">
          <h2 className="text-lg font-bold text-mgmt-on-surface">Team notifications</h2>
          <p className="mt-2 text-sm text-mgmt-on-surface-variant">
            Select the real-time updates your team will receive.
          </p>

          <div className="mt-6">
            <h3 className="text-sm font-semibold text-mgmt-on-surface">Updates</h3>
            <p className="mt-1 text-sm text-mgmt-on-surface-variant">
              Automate notifications for new, edited and cancelled bookings
            </p>
            <div className="mt-3 divide-y divide-mgmt-outline-variant/10 rounded-xl border border-mgmt-outline-variant/15 bg-mgmt-surface-container-lowest px-3">
              <CheckRow
                checked={teamConfirm}
                onChange={setTeamConfirm}
                label="Confirmations"
                sublabel="Automate notifications for new bookings"
              />
              <CheckRow
                checked={teamChanges}
                onChange={setTeamChanges}
                label="Changes"
                sublabel="Automate notifications for edited or rescheduled bookings"
              />
              <CheckRow
                checked={teamCancel}
                onChange={setTeamCancel}
                label="Cancellations"
                sublabel="Automate notifications for cancelled bookings"
              />
            </div>
          </div>

          <div className="mt-8">
            <h3 className="text-sm font-semibold text-mgmt-on-surface">Reminders</h3>
            <p className="mt-1 text-sm text-mgmt-on-surface-variant">
              Keep team members in the loop with automatic booking reminders.
            </p>
            <div className="mt-3 rounded-xl border border-mgmt-outline-variant/15 bg-mgmt-surface-container-lowest px-3">
              <LabeledCheck
                checked={teamReminderEmail}
                onChange={setTeamReminderEmail}
                label="Email"
                sublabel="Prior to each appointment"
                trailing={
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      value={teamReminderAmount}
                      onChange={(e) => setTeamReminderAmount(e.target.value)}
                      className={numberInputClass}
                      disabled={!teamReminderEmail}
                      aria-label="Reminder amount before appointment"
                    />
                    <div className="relative">
                      <select
                        value={teamReminderUnit}
                        onChange={(e) => setTeamReminderUnit(e.target.value)}
                        className={fieldSelectClass}
                        disabled={!teamReminderEmail}
                        aria-label="Reminder time unit"
                      >
                        <option value="hours">Hours</option>
                        <option value="days">Days</option>
                      </select>
                      <MaterialSymbol
                        name="expand_more"
                        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[20px] text-mgmt-on-surface-variant"
                      />
                    </div>
                  </div>
                }
              />
            </div>
          </div>

          <div className="mt-8">
            <h3 className="text-sm font-semibold text-mgmt-on-surface">CC email notifications</h3>
            <p className="mt-1 text-sm text-mgmt-on-surface-variant">
              Send all team appointment updates to additional email addresses.
            </p>
            <div className="mt-4 space-y-3">
              {ccEmails.map((em, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="email"
                    value={em}
                    onChange={(e) =>
                      setCcEmails((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))
                    }
                    className="min-w-0 flex-1 rounded-xl border border-mgmt-outline-variant/30 bg-mgmt-surface-container-lowest px-4 py-2.5 text-sm outline-none focus:border-mgmt-primary/40 focus:ring-2 focus:ring-mgmt-primary/15"
                    placeholder="email@example.com"
                  />
                  <button
                    type="button"
                    onClick={() => setCcEmails((prev) => prev.filter((_, j) => j !== i))}
                    className="shrink-0 rounded-xl px-3 text-sm text-mgmt-on-surface-variant hover:text-red-600"
                    aria-label="Remove email"
                  >
                    <MaterialSymbol name="close" className="text-[20px]" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setCcEmails((prev) => [...prev, ""])}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-mgmt-primary hover:underline"
              >
                <MaterialSymbol name="add_circle" className="text-[20px] text-mgmt-primary" />
                Add an email
              </button>
            </div>
          </div>
        </section>

        <section className="mt-10 pb-8">
          <h2 className="text-lg font-bold text-mgmt-on-surface">Customer notifications</h2>
          <p className="mt-2 text-sm text-mgmt-on-surface-variant">
            Select the real-time updates your customers will receive.
          </p>

          <div className="mt-6">
            <h3 className="text-sm font-semibold text-mgmt-on-surface">Updates</h3>
            <p className="mt-1 text-sm text-mgmt-on-surface-variant">
              Automate notifications for new, edited and cancelled bookings
            </p>
            <div className="mt-3 divide-y divide-mgmt-outline-variant/10 rounded-xl border border-mgmt-outline-variant/15 bg-mgmt-surface-container-lowest px-3">
              <CheckRow
                checked={custConfirm}
                onChange={setCustConfirm}
                label="Confirmations"
                sublabel="Automate notifications for new bookings"
              />
              <CheckRow
                checked={custChanges}
                onChange={setCustChanges}
                label="Changes"
                sublabel="Automate notifications for edited or rescheduled bookings"
              />
              <CheckRow
                checked={custCancel}
                onChange={setCustCancel}
                label="Cancellations"
                sublabel="Automate notifications for cancelled bookings"
              />
            </div>
          </div>

          <div className="mt-8">
            <h3 className="text-sm font-semibold text-mgmt-on-surface">Reminders</h3>
            <p className="mt-1 text-sm text-mgmt-on-surface-variant">
              Reduce no-shows and rescheduling with automatic booking reminders.
            </p>
            <div className="mt-3 rounded-xl border border-mgmt-outline-variant/15 bg-mgmt-surface-container-lowest px-3">
              <LabeledCheck
                checked={custReminderEmail}
                onChange={setCustReminderEmail}
                label="Email"
                sublabel="Prior to each appointment"
                trailing={
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      value={custReminderAmount}
                      onChange={(e) => setCustReminderAmount(e.target.value)}
                      className={numberInputClass}
                      disabled={!custReminderEmail}
                      aria-label="Customer reminder amount"
                    />
                    <div className="relative">
                      <select
                        value={custReminderUnit}
                        onChange={(e) => setCustReminderUnit(e.target.value)}
                        className={fieldSelectClass}
                        disabled={!custReminderEmail}
                        aria-label="Customer reminder unit"
                      >
                        <option value="hours">Hours</option>
                        <option value="days">Days</option>
                      </select>
                      <MaterialSymbol
                        name="expand_more"
                        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[20px] text-mgmt-on-surface-variant"
                      />
                    </div>
                  </div>
                }
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
