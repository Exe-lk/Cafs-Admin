"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import MaterialSymbol from "@/components/admin/MaterialSymbol";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const fieldInputShell =
  "rounded-xl border border-mgmt-outline-variant/30 bg-mgmt-surface-container-lowest px-3 py-2.5 text-sm text-mgmt-on-surface outline-none transition-shadow focus:border-mgmt-primary/40 focus:ring-2 focus:ring-mgmt-primary/15";

const fieldSelectClass =
  "h-11 w-full min-w-[7rem] appearance-none rounded-xl border border-mgmt-outline-variant/30 bg-mgmt-surface-container-lowest px-3 pr-9 text-sm text-mgmt-on-surface outline-none transition-shadow focus:border-mgmt-primary/40 focus:ring-2 focus:ring-mgmt-primary/15";

const numberInputClass = cx(fieldInputShell, "w-20 text-center tabular-nums");

function Toggle({
  checked,
  onChange,
  disabled,
  ariaLabel,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  ariaLabel: string;
}) {
  return (
    <label
      className={cx(
        "relative inline-flex cursor-pointer items-center",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <input
        className="peer sr-only"
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        aria-label={ariaLabel}
      />
      <div
        className={cx(
          "relative h-6 w-11 shrink-0 rounded-full bg-mgmt-surface-container-high after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-mgmt-on-surface peer-checked:after:translate-x-full peer-disabled:opacity-50",
        )}
      />
    </label>
  );
}

function PolicyRow({
  label,
  description,
  infoTitle,
  children,
}: {
  label: string;
  description: string;
  infoTitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 py-6 sm:flex-row sm:items-start sm:justify-between sm:gap-10">
      <div className="min-w-0 max-w-xl">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-semibold text-mgmt-on-surface">{label}</p>
          {infoTitle ? (
            <span className="inline-flex text-mgmt-on-surface-variant" title={infoTitle}>
              <MaterialSymbol name="info" className="text-[18px]" />
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-sm leading-relaxed text-mgmt-on-surface-variant">{description}</p>
      </div>
      <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:max-w-sm sm:items-end">{children}</div>
    </div>
  );
}

function SectionToggleRow({
  label,
  checked,
  onChange,
  infoTitle,
  trailing,
  muted,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  infoTitle?: string;
  trailing?: ReactNode;
  muted?: boolean;
}) {
  return (
    <div
      className={cx(
        "flex items-center gap-4 border-b border-mgmt-outline-variant/10 py-4 last:border-b-0",
        muted && "opacity-60",
      )}
    >
      <Toggle checked={checked} onChange={onChange} disabled={muted} ariaLabel={label} />
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="text-sm font-medium text-mgmt-on-surface">{label}</span>
        {infoTitle ? (
          <span className="text-mgmt-on-surface-variant" title={infoTitle}>
            <MaterialSymbol name="info" className="text-[18px]" />
          </span>
        ) : null}
      </div>
      {trailing ? <div className="flex shrink-0 items-center gap-3">{trailing}</div> : null}
    </div>
  );
}

export default function AdminSettingsBookingPreferencesPage() {
  const [leadTime, setLeadTime] = useState("0");
  const [leadUnit, setLeadUnit] = useState("minutes");
  const [schedulingWindow, setSchedulingWindow] = useState("0");
  const [schedulingUnit, setSchedulingUnit] = useState("days");
  const [slotSize, setSlotSize] = useState("15");
  const [slotUnit, setSlotUnit] = useState("minutes");
  const [cancellationPolicy, setCancellationPolicy] = useState("anytime");
  const [policyText, setPolicyText] = useState("");
  const [policyOnHome, setPolicyOnHome] = useState(false);

  const [secBookAppointment, setSecBookAppointment] = useState(true);
  const [secBookClass, setSecBookClass] = useState(true);
  const [secAbout, setSecAbout] = useState(true);
  const [secTeam, setSecTeam] = useState(true);
  const [secServices, setSecServices] = useState(true);
  const [secClasses, setSecClasses] = useState(true);

  const [flowFirstAvailable, setFlowFirstAvailable] = useState(true);
  const [flowSkipTeam, setFlowSkipTeam] = useState(false);
  const [flowMultiService, setFlowMultiService] = useState(false);
  const [flowAnyMember, setFlowAnyMember] = useState(false);
  const [flowCustomerLogin, setFlowCustomerLogin] = useState(true);
  const [flowLoginRequired, setFlowLoginRequired] = useState(false);
  const [flowHideBranding, setFlowHideBranding] = useState(false);
  const [flowAccordion, setFlowAccordion] = useState(true);
  const [flowReschedule, setFlowReschedule] = useState(true);
  const [flowCancel, setFlowCancel] = useState(true);
  const [flowBookNewBtn, setFlowBookNewBtn] = useState(false);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-mgmt-surface-container-lowest">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        <header className="mb-2 flex flex-col gap-4 border-b border-mgmt-outline-variant/15 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-mgmt-on-surface">Booking preferences</h1>
          <button
            type="button"
            className="shrink-0 rounded-xl bg-mgmt-primary px-4 py-2 text-sm font-semibold text-mgmt-on-primary transition-opacity hover:opacity-90"
          >
            Save
          </button>
        </header>

        <section className="divide-y divide-mgmt-outline-variant/10">
          <div className="pt-2">
            <h2 className="text-lg font-bold text-mgmt-on-surface">Booking policies</h2>
          </div>

          <PolicyRow
            label="Lead time"
            description="How much notice do you require before an appointment?"
          >
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <input
                type="number"
                min={0}
                value={leadTime}
                onChange={(e) => setLeadTime(e.target.value)}
                className={numberInputClass}
                aria-label="Lead time amount"
              />
              <div className="relative">
                <select
                  value={leadUnit}
                  onChange={(e) => setLeadUnit(e.target.value)}
                  className={fieldSelectClass}
                  aria-label="Lead time unit"
                >
                  <option value="minutes">Minutes</option>
                  <option value="hours">Hours</option>
                  <option value="days">Days</option>
                </select>
                <MaterialSymbol
                  name="expand_more"
                  className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[20px] text-mgmt-on-surface-variant"
                />
              </div>
            </div>
          </PolicyRow>

          <PolicyRow
            label="Scheduling window"
            description="How far in advance can customers schedule an appointment?"
          >
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <input
                type="number"
                min={0}
                value={schedulingWindow}
                onChange={(e) => setSchedulingWindow(e.target.value)}
                className={numberInputClass}
                aria-label="Scheduling window amount"
              />
              <div className="relative">
                <select
                  value={schedulingUnit}
                  onChange={(e) => setSchedulingUnit(e.target.value)}
                  className={fieldSelectClass}
                  aria-label="Scheduling window unit"
                >
                  <option value="days">Days</option>
                  <option value="weeks">Weeks</option>
                  <option value="months">Months</option>
                </select>
                <MaterialSymbol
                  name="expand_more"
                  className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[20px] text-mgmt-on-surface-variant"
                />
              </div>
            </div>
          </PolicyRow>

          <PolicyRow
            label="Booking slot size"
            description="How often should available booking slots appear?"
            infoTitle="Determines the interval between start times shown to customers (e.g. every 15 minutes)."
          >
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <input
                type="number"
                min={5}
                step={5}
                value={slotSize}
                onChange={(e) => setSlotSize(e.target.value)}
                className={numberInputClass}
                aria-label="Slot size amount"
              />
              <div className="relative">
                <select
                  value={slotUnit}
                  onChange={(e) => setSlotUnit(e.target.value)}
                  className={fieldSelectClass}
                  aria-label="Slot size unit"
                >
                  <option value="minutes">Minutes</option>
                  <option value="hours">Hours</option>
                </select>
                <MaterialSymbol
                  name="expand_more"
                  className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[20px] text-mgmt-on-surface-variant"
                />
              </div>
            </div>
          </PolicyRow>

          <PolicyRow
            label="Cancellation policy"
            description="How soon before an appointment can customers reschedule or cancel?"
          >
            <div className="relative w-full sm:w-80">
              <select
                value={cancellationPolicy}
                onChange={(e) => setCancellationPolicy(e.target.value)}
                className={cx(fieldSelectClass, "w-full pr-10")}
                aria-label="Cancellation policy"
              >
                <option value="anytime">Anytime</option>
                <option value="24h">At least 24 hours before</option>
                <option value="48h">At least 48 hours before</option>
                <option value="72h">At least 72 hours before</option>
                <option value="none">No cancellation allowed</option>
              </select>
              <MaterialSymbol
                name="expand_more"
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[22px] text-mgmt-on-surface-variant"
              />
            </div>
          </PolicyRow>

          <PolicyRow
            label="Booking policy"
            description="Share need-to-know details — about amending bookings, refunds and more — before customers confirm their bookings."
          >
            <textarea
              value={policyText}
              onChange={(e) => setPolicyText(e.target.value)}
              rows={5}
              placeholder="Type your policy or share a link"
              className="w-full resize-y rounded-xl border border-mgmt-outline-variant/30 bg-mgmt-surface-container-lowest px-4 py-3 text-sm text-mgmt-on-surface outline-none placeholder:text-mgmt-on-surface-variant focus:border-mgmt-primary/40 focus:ring-2 focus:ring-mgmt-primary/15 sm:min-w-[20rem]"
            />
          </PolicyRow>

          <div className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:gap-10">
            <Toggle checked={policyOnHome} onChange={setPolicyOnHome} ariaLabel="Add policy to home" />
            <div className="min-w-0 flex-1 sm:pl-2">
              <p className="text-sm font-semibold text-mgmt-on-surface">Add policy to home</p>
              <p className="mt-1 text-sm text-mgmt-on-surface-variant">
                Display your booking policy at the top of your Booking Page to draw extra attention.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-14 border-t border-mgmt-outline-variant/15 pt-10">
          <h2 className="text-lg font-bold text-mgmt-on-surface">Booking setup</h2>

          <div className="mt-8">
            <h3 className="text-sm font-semibold text-mgmt-on-surface">Sections</h3>
            <p className="mt-1 text-sm text-mgmt-on-surface-variant">
              What sections will be visible to your Booking Page visitors?
            </p>
            <div className="mt-4 rounded-xl border border-mgmt-outline-variant/15 bg-mgmt-surface-container-lowest px-2">
              <SectionToggleRow
                label="Book appointment"
                checked={secBookAppointment}
                onChange={setSecBookAppointment}
              />
              <SectionToggleRow label="Book class" checked={secBookClass} onChange={setSecBookClass} />
              <SectionToggleRow label="About us" checked={secAbout} onChange={setSecAbout} />
              <SectionToggleRow label="Our team" checked={secTeam} onChange={setSecTeam} />
              <SectionToggleRow label="Services" checked={secServices} onChange={setSecServices} />
              <SectionToggleRow label="Classes" checked={secClasses} onChange={setSecClasses} />
            </div>
          </div>

          <div className="mt-10">
            <h3 className="text-sm font-semibold text-mgmt-on-surface">Booking flow</h3>
            <p className="mt-1 text-sm text-mgmt-on-surface-variant">
              Streamline the scheduling experience to fill your calendar faster.
            </p>
            <div className="mt-4 rounded-xl border border-mgmt-outline-variant/15 bg-mgmt-surface-container-lowest px-2">
              <SectionToggleRow
                label="First available appointment"
                checked={flowFirstAvailable}
                onChange={setFlowFirstAvailable}
                infoTitle="Surface the next open slot automatically."
              />
              <SectionToggleRow
                label="Skip team members"
                checked={flowSkipTeam}
                onChange={setFlowSkipTeam}
                infoTitle="Hide team selection when not needed."
              />
              <SectionToggleRow
                label="Provide multiple services"
                checked={flowMultiService}
                onChange={setFlowMultiService}
                infoTitle="Let customers add more than one service per visit."
              />
              <SectionToggleRow
                label="Any team member"
                checked={flowAnyMember}
                onChange={setFlowAnyMember}
                infoTitle="Assign any available provider."
              />
              <SectionToggleRow
                label="Customer login"
                checked={flowCustomerLogin}
                onChange={(v) => {
                  setFlowCustomerLogin(v);
                  if (!v) setFlowLoginRequired(false);
                }}
                infoTitle="Allow customers to sign in before booking."
                trailing={
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-mgmt-on-surface-variant">Required</span>
                    <Toggle
                      checked={flowLoginRequired}
                      onChange={setFlowLoginRequired}
                      disabled={!flowCustomerLogin}
                      ariaLabel="Require customer login"
                    />
                  </div>
                }
              />
              <SectionToggleRow
                label="Hide CAFS branding"
                checked={flowHideBranding}
                onChange={setFlowHideBranding}
                muted
                trailing={
                  <MaterialSymbol name="workspace_premium" className="text-[22px] text-mgmt-primary" />
                }
              />
              <SectionToggleRow
                label="Accordion view"
                checked={flowAccordion}
                onChange={setFlowAccordion}
                infoTitle="Collapse sections for a cleaner layout."
              />
              <SectionToggleRow
                label="Allow online rescheduling"
                checked={flowReschedule}
                onChange={setFlowReschedule}
                infoTitle="Let customers move appointments from the booking page."
              />
              <SectionToggleRow
                label="Allow online cancellations"
                checked={flowCancel}
                onChange={setFlowCancel}
                infoTitle="Let customers cancel without calling."
              />
              <SectionToggleRow
                label="'Book new appointment' button"
                checked={flowBookNewBtn}
                onChange={setFlowBookNewBtn}
                infoTitle="Show a shortcut to start a new booking after completion."
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
