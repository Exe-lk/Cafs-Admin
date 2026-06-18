"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import MaterialSymbol from "@/components/admin/MaterialSymbol";
import ConfirmationModal from "@/components/admin/ConfirmationModal";
import AdminCustomerFormDetailsTab from "@/components/admin/AdminCustomerFormDetailsTab";
import CreateAppointmentModal from "@/components/admin/CreateAppointmentModal";
import CustomerAppointmentUpdatesPanel from "@/components/admin/CustomerAppointmentUpdatesPanel";
import EditCustomerModal, { type AdminCustomerProfile } from "@/components/admin/EditCustomerModal";
import ProfileAvatarUpload from "@/components/admin/ProfileAvatarUpload";
import EditAppointmentModal, {
  type AdminEditableAppointment,
} from "@/components/admin/EditAppointmentModal";

export type AdminCustomerNoteHistoryItem = {
  id: string;
  title: string;
  date: string;
  description: string;
};

export type AdminAppointmentSession = {
  id: string;
  title: string;
  providerName: string;
  providerAvatarUrl?: string | null;
  videoLink?: string;
  notes?: string;
};

export type AdminAppointmentDay =
  | {
      id: string;
      kind: "list";
      /** e.g. "6 JAN, TUE" */
      dateLine: string;
      /** e.g. "2:00PM – 3:00PM" */
      timeRange: string;
      sessions: AdminAppointmentSession[];
    }
  | {
      id: string;
      kind: "no_sessions";
      /** Shown inside the date pill, e.g. "30 MAR, MON" */
      dateLine: string;
    };

export type AdminCustomerStats = {
  totalBookings: number;
  cancellations: number;
  ltvUsd: number;
};

export type AdminCustomerModel = AdminCustomerProfile & {
  memberSinceLine: string;
  statusLabel: string;
  tierLabel: string;
  stats: AdminCustomerStats;
  cityStateLine: string;
  /** Optional (for therapist-like detail experience). */
  localTimeDisplay?: string;
  /** Optional (for therapist-like detail experience). */
  lastActivity?: string;
  /** Notes tab: newest-first when combined with unsaved session adds. */
  notesHistory?: AdminCustomerNoteHistoryItem[];
  /** Appointments tab: chronological day rows (as provided). */
  appointmentDays?: AdminAppointmentDay[];
};

function moneyUsd(v: number) {
  return v.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

type DetailTabId = "about" | "notes" | "appointments" | "updates";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function firstName(name: string) {
  const t = name.trim();
  if (!t) return "this client";
  return t.split(/\s+/)[0] ?? t;
}

function formatNoteDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function providerInitial(name: string) {
  const t = name.trim();
  return t ? t[0]!.toUpperCase() : "?";
}

function CustomerDetailRow({
  icon,
  children,
  trailing,
}: {
  icon: string;
  children: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <div className="flex items-start gap-4 border-b border-mgmt-outline-variant/10 py-3 last:border-b-0">
      <MaterialSymbol
        name={icon}
        className="mt-0.5 shrink-0 text-[20px] text-mgmt-on-surface-variant"
      />
      <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
        <div className="min-w-0 flex-1 text-sm text-mgmt-on-surface">{children}</div>
        {trailing ? <div className="flex shrink-0 items-center gap-1">{trailing}</div> : null}
      </div>
    </div>
  );
}

export default function AdminCustomerDetail({
  customer,
  onUpdateCustomer,
  onDeleteCustomer,
  onPersistProfile,
}: {
  customer: AdminCustomerModel;
  onUpdateCustomer: (next: AdminCustomerModel) => void;
  onDeleteCustomer?: (customerId: string) => void | Promise<void>;
  onPersistProfile?: (args: { clientId: string; fullName: string; phone: string }) => Promise<void>;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [bookAppointmentOpen, setBookAppointmentOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<DetailTabId>("about");
  const [mobileTabOpen, setMobileTabOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [sessionNoteHistory, setSessionNoteHistory] = useState<AdminCustomerNoteHistoryItem[]>(
    [],
  );
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [editingAppt, setEditingAppt] = useState<AdminEditableAppointment | null>(null);
  const [formSheet, setFormSheet] = useState<unknown>(null);
  const [formSheetLoading, setFormSheetLoading] = useState(false);
  const [formSheetError, setFormSheetError] = useState<string | null>(null);
  const [updatesReloadKey, setUpdatesReloadKey] = useState(0);

  const profile: AdminCustomerProfile = useMemo(
    () => ({
      id: customer.id,
      fullName: customer.fullName,
      phone: customer.phone,
      email: customer.email,
      company: customer.company,
      address: customer.address,
      country: customer.country,
      avatarUrl: customer.avatarUrl ?? null,
    }),
    [customer],
  );

  const notesHistoryCombined = useMemo(() => {
    const fromProps = customer.notesHistory ?? [];
    return [...sessionNoteHistory, ...fromProps];
  }, [customer.notesHistory, sessionNoteHistory]);

  const tabs: { id: DetailTabId; label: string }[] = useMemo(
    () => [
      { id: "about", label: "About" },
      { id: "notes", label: "Notes" },
      { id: "appointments", label: "Appointments" },
      { id: "updates", label: "Updates" },
    ],
    [],
  );

  const activeTab = useMemo(() => tabs.find((t) => t.id === tab) ?? tabs[0]!, [tab, tabs]);

  const locationLine = useMemo(() => {
    const parts = [customer.cityStateLine, customer.country].map((p) => p?.trim()).filter(Boolean);
    return parts.join(", ") || "—";
  }, [customer.cityStateLine, customer.country]);

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
    if (!tabs.some((t) => t.id === tab)) {
      setTab("about");
    }
  }, [tab, tabs]);

  useEffect(() => {
    if (tab !== "about" || !customer.id) return;

    const ac = new AbortController();

    void (async () => {
      setFormSheetLoading(true);
      setFormSheetError(null);
      try {
        const res = await fetch(`/api/v1/admin/clients/${customer.id}`, {
          method: "GET",
          cache: "no-store",
          signal: ac.signal,
        });
        const json = (await res.json()) as {
          status?: string;
          message?: string;
          data?: { clientInformationSheetJson?: unknown };
        };
        if (!res.ok || json?.status !== "success") {
          throw new Error(json?.message || `Failed to load form details (HTTP ${res.status})`);
        }
        setFormSheet(json.data?.clientInformationSheetJson ?? null);
      } catch (e) {
        if ((e as { name?: string })?.name === "AbortError") return;
        setFormSheet(null);
        setFormSheetError(e instanceof Error ? e.message : "Failed to load form details");
      } finally {
        if (!ac.signal.aborted) setFormSheetLoading(false);
      }
    })();

    return () => {
      ac.abort();
    };
  }, [tab, customer.id]);

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-mgmt-surface-container-lowest">
      <div className="shrink-0 px-6 pt-6 sm:px-8 sm:pt-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-4 sm:gap-6">
            <ProfileAvatarUpload
              imageUrl={customer.avatarUrl}
              alt={customer.fullName}
              onImageChange={(avatarUrl) => {
                onUpdateCustomer({ ...customer, avatarUrl });
              }}
            />
            <div className="min-w-0">
              <h3 className="truncate text-[1.6rem] font-bold tracking-tight text-mgmt-on-background sm:text-[2rem]">
                {customer.fullName}
              </h3>
              {/* <div className="mt-1 flex flex-col gap-1 text-mgmt-on-surface-variant sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
                <div className="flex items-center gap-2">
                  <MaterialSymbol name="location_on" className="text-[18px]" />
                  <span className="text-sm">{locationLine}</span>
                </div>
                <div className="hidden h-4 w-px bg-mgmt-outline-variant/30 sm:block" aria-hidden />
                <div className="flex items-center gap-2">
                  <MaterialSymbol name="schedule" className="text-[18px]" />
                  <span className="text-sm font-medium">{customer.localTimeDisplay ?? "—"}</span>
                </div>
              </div> */}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-mgmt-on-surface transition-colors hover:bg-mgmt-surface-container-low"
              onClick={() => setEditOpen(true)}
              aria-label="Edit profile"
            >
              <MaterialSymbol name="edit" className="text-[22px]" />
            </button>

            <div className="relative" ref={moreMenuRef}>
              <button
                type="button"
                onClick={() => setMoreMenuOpen((open) => !open)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-mgmt-on-surface transition-colors hover:bg-mgmt-surface-container-low"
                aria-label="More options"
                aria-haspopup="menu"
                aria-expanded={moreMenuOpen}
              >
                <MaterialSymbol name="more_vert" className="text-[22px]" />
              </button>

              {moreMenuOpen ? (
                <div
                  className="absolute right-0 top-full z-50 mt-1 w-52 overflow-hidden rounded-xl border border-mgmt-outline-variant/20 bg-white py-1 shadow-lg"
                  role="menu"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMoreMenuOpen(false);
                      onUpdateCustomer({ ...customer, statusLabel: "Blocked" });
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-mgmt-on-surface hover:bg-mgmt-surface-container-low"
                  >
                    <MaterialSymbol name="block" className="text-[20px] text-mgmt-on-surface-variant" />
                    Block customer
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMoreMenuOpen(false);
                      setDeleteError(null);
                      setDeleteConfirmOpen(true);
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-red-600 hover:bg-mgmt-surface-container-low"
                  >
                    <MaterialSymbol name="delete" className="text-[20px]" />
                    Delete customer
                  </button>
                </div>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => setBookAppointmentOpen(true)}
              className="whitespace-nowrap rounded-full border border-mgmt-outline-variant bg-white px-5 py-2.5 text-sm font-semibold text-mgmt-on-surface transition-colors hover:bg-mgmt-surface-container-low"
            >
              Book appointment
            </button>
          </div>
        </div>

        {/* Mobile: dropdown navigation */}
        <div className="mt-8 border-b border-mgmt-surface-container pb-4 md:hidden">
          <div className="relative">
            <button
              type="button"
              onClick={() => setMobileTabOpen((o) => !o)}
              className="flex h-11 w-full items-center justify-between rounded-xl border border-mgmt-outline-variant bg-white/70 px-4 text-sm font-semibold text-mgmt-on-surface"
              aria-haspopup="menu"
              aria-expanded={mobileTabOpen}
            >
              <span className="min-w-0 truncate">{activeTab.label}</span>
              <MaterialSymbol
                name="expand_more"
                className={cx(
                  "text-[20px] text-mgmt-on-surface-variant transition-transform",
                  mobileTabOpen && "rotate-180",
                )}
              />
            </button>
            <div
              className={cx(
                "absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-xl border border-mgmt-outline-variant bg-white shadow-lg",
                mobileTabOpen ? "block" : "hidden",
              )}
              role="menu"
            >
              {tabs.map((t) => {
                const isActive = t.id === tab;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setTab(t.id);
                      setMobileTabOpen(false);
                    }}
                    className={cx(
                      "flex w-full items-center justify-between px-4 py-3 text-left text-sm",
                      isActive
                        ? "bg-mgmt-surface-container-low text-mgmt-on-surface font-semibold"
                        : "text-mgmt-on-surface hover:bg-mgmt-surface-container-low",
                    )}
                    role="menuitem"
                  >
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Desktop: tabs */}
        <div className="mt-12 hidden gap-6 overflow-x-auto border-b border-mgmt-surface-container sm:gap-8 md:flex">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cx(
                "shrink-0 pb-4 text-sm transition-colors",
                tab === t.id
                  ? "border-b-2 border-mgmt-primary font-bold text-mgmt-primary"
                  : "font-semibold text-mgmt-on-surface-variant hover:text-mgmt-primary",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 sm:px-8 sm:pb-8">
        {tab === "about" && (
          <div className="py-10">
            <section className="mb-0">
              <h4 className="mb-3 text-sm font-semibold text-mgmt-on-surface">User Details</h4>
              <div className="max-w-2xl">
                <CustomerDetailRow icon="call">
                  {customer.phone.trim() ? (
                    <a
                      href={`tel:${customer.phone.replace(/\s/g, "")}`}
                      className="hover:underline"
                    >
                      {customer.phone}
                    </a>
                  ) : (
                    <span className="text-mgmt-on-surface-variant underline decoration-mgmt-outline-variant/60 underline-offset-2">
                      Add phone
                    </span>
                  )}
                </CustomerDetailRow>

                <CustomerDetailRow icon="mail">
                  {customer.email.trim() ? (
                    <a href={`mailto:${customer.email}`} className="break-all hover:underline">
                      {customer.email}
                    </a>
                  ) : (
                    <span className="text-mgmt-on-surface-variant">—</span>
                  )}
                </CustomerDetailRow>

                {/* <CustomerDetailRow icon="business">
                  {customer.company.trim() ? customer.company : "—"}
                </CustomerDetailRow>

                <CustomerDetailRow icon="verified">
                  {customer.statusLabel}
                </CustomerDetailRow>

                <CustomerDetailRow icon="schedule">
                  {customer.lastActivity ?? customer.memberSinceLine}
                </CustomerDetailRow>

                <CustomerDetailRow icon="workspace_premium">
                  {customer.tierLabel}
                </CustomerDetailRow>

                <CustomerDetailRow icon="insights">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-mgmt-on-surface-variant">Total bookings</span>
                      <span className="font-semibold">{customer.stats.totalBookings}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-mgmt-on-surface-variant">Cancellations</span>
                      <span className="font-semibold">{customer.stats.cancellations}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-mgmt-on-surface-variant">LTV</span>
                      <span className="font-semibold text-mgmt-primary">
                        {moneyUsd(customer.stats.ltvUsd)}
                      </span>
                    </div>
                  </div>
                </CustomerDetailRow>

                <CustomerDetailRow icon="location_on">
                  {customer.address.trim() ? customer.address : "—"}
                </CustomerDetailRow> */}
              </div>
            </section>

            <section className="mt-6 border-t border-mgmt-surface-container pt-8">
              <h4 className="mb-3 text-sm font-semibold text-mgmt-on-surface">Form Details</h4>
              <div className="max-w-2xl">
                <AdminCustomerFormDetailsTab
                  sheet={formSheet}
                  loading={formSheetLoading}
                  error={formSheetError}
                  embedded
                />
              </div>
            </section>
          </div>
        )}

        {tab === "notes" && (
          <div className="py-10">
            <div>
              <h4 className="mb-3 text-[0.7rem] font-bold uppercase tracking-widest text-mgmt-on-surface-variant">
                Internal notes
              </h4>
              <div className="rounded-xl bg-mgmt-surface-container-low p-4">
                <textarea
                  className="min-h-[128px] w-full resize-none bg-transparent text-sm text-mgmt-on-surface placeholder:text-mgmt-on-surface-variant/80 focus:outline-none"
                  placeholder={`Add a note about ${firstName(customer.fullName)}'s preferences or recent requests...`}
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  aria-label="Internal note"
                />
                <div className="mt-4 flex justify-end gap-3">
                  <button
                    type="button"
                    className="text-sm font-medium text-mgmt-on-surface-variant transition-colors hover:text-mgmt-on-surface"
                    onClick={() => setNoteDraft("")}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="rounded-xl bg-mgmt-primary px-4 py-2 text-sm font-semibold text-mgmt-on-primary transition-opacity hover:opacity-90 disabled:opacity-40"
                    disabled={!noteDraft.trim()}
                    onClick={() => {
                      const text = noteDraft.trim();
                      if (!text) return;
                      const firstLine = text.split(/\n/)[0] ?? text;
                      const title =
                        firstLine.length > 90 ? `${firstLine.slice(0, 87)}…` : firstLine;
                      setSessionNoteHistory((prev) => [
                        {
                          id: `note-${Date.now()}`,
                          title,
                          date: formatNoteDate(new Date()),
                          description: text,
                        },
                        ...prev,
                      ]);
                      setNoteDraft("");
                    }}
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-12">
              <h4 className="mb-4 text-[0.7rem] font-bold uppercase tracking-widest text-mgmt-on-surface-variant">
                Recent history
              </h4>
              {notesHistoryCombined.length === 0 ? (
                <p className="text-sm text-mgmt-on-surface-variant">No history yet.</p>
              ) : (
                <ul className="space-y-8">
                  {notesHistoryCombined.map((item) => (
                    <li key={item.id} className="flex gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-mgmt-primary-container">
                        <MaterialSymbol name="note" className="text-[22px] text-mgmt-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-2 gap-y-1">
                          <p className="text-sm font-semibold text-mgmt-on-surface">{item.title}</p>
                          <time className="shrink-0 text-xs text-mgmt-on-surface-variant">
                            {item.date}
                          </time>
                        </div>
                        <p className="mt-1 text-sm leading-relaxed text-mgmt-on-surface-variant">
                          {item.description}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {tab === "appointments" && (
          <div className="py-10">
            {(customer.appointmentDays?.length ?? 0) === 0 ? (
              <p className="text-center text-sm text-mgmt-on-surface-variant">
                No appointments scheduled.
              </p>
            ) : (
              <ul className="space-y-10">
                {(customer.appointmentDays ?? []).map((day) => (
                  <li
                    key={day.id}
                    className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(7rem,0.2fr)_1fr] md:items-start md:gap-10"
                  >
                    {day.kind === "list" ? (
                      <>
                        <div className="shrink-0 md:pt-0.5">
                          <p className="text-xs font-bold uppercase tracking-wide text-mgmt-on-surface">
                            {day.dateLine}
                          </p>
                          <p className="mt-1 text-xs text-mgmt-on-surface-variant">{day.timeRange}</p>
                        </div>
                        <div className="min-w-0 space-y-4">
                          {day.sessions.map((session) => (
                            <div
                              key={session.id}
                              className="flex gap-3 rounded-2xl bg-mgmt-surface-container-low p-4"
                            >
                              <div
                                className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-mgmt-primary"
                                aria-hidden
                              />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium leading-snug text-mgmt-on-surface">
                                  {session.title}
                                </p>
                                <div className="mt-3 flex items-center justify-between gap-3">
                                  <div className="flex min-w-0 items-center gap-2">
                                    {session.providerAvatarUrl ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img
                                        src={session.providerAvatarUrl}
                                        alt=""
                                        className="h-6 w-6 shrink-0 rounded-full object-cover"
                                      />
                                    ) : (
                                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-mgmt-surface-container-high text-[10px] font-bold text-mgmt-on-surface-variant">
                                        {providerInitial(session.providerName)}
                                      </div>
                                    )}
                                    <span className="truncate text-xs text-mgmt-on-surface-variant">
                                      {session.providerName}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    className="shrink-0 rounded-lg bg-mgmt-surface-container-high px-3 py-1.5 text-xs font-semibold text-mgmt-on-surface transition-colors hover:bg-mgmt-surface-container"
                                    onClick={() => {
                                      setEditingAppt({
                                        dayId: day.id,
                                        sessionId: session.id,
                                        dateLine: day.dateLine,
                                        timeRange: day.timeRange,
                                        title: session.title,
                                        providerName: session.providerName,
                                        providerAvatarUrl: session.providerAvatarUrl ?? null,
                                        videoLink: session.videoLink ?? "",
                                        notes: session.notes ?? "",
                                      });
                                    }}
                                  >
                                    Edit
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="shrink-0">
                          <span className="inline-block rounded-full bg-mgmt-surface-container-high px-3 py-1.5 text-[0.65rem] font-bold uppercase tracking-wide text-mgmt-on-surface">
                            {day.dateLine}
                          </span>
                          <p className="mt-2 text-xs text-mgmt-on-surface-variant">No appointments</p>
                        </div>
                        <div className="flex min-h-[104px] items-center justify-center rounded-2xl border border-dashed border-mgmt-outline-variant bg-mgmt-surface-container-lowest px-4 py-8 text-center text-sm text-mgmt-on-surface-variant">
                          No sessions scheduled for this day
                        </div>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {tab === "updates" && (
          <div className="py-10">
            <h4 className="mb-4 text-[0.7rem] font-bold uppercase tracking-widest text-mgmt-on-surface-variant">
              Appointment updates
            </h4>
            <CustomerAppointmentUpdatesPanel
              clientId={customer.id}
              enabled={tab === "updates"}
              reloadKey={updatesReloadKey}
            />
          </div>
        )}
      </div>

      <CreateAppointmentModal
        open={bookAppointmentOpen}
        onClose={() => setBookAppointmentOpen(false)}
      />

      {editOpen ? (
        <EditCustomerModal
          customer={profile}
          onClose={() => setEditOpen(false)}
          onSave={async (next) => {
            // Persist only fields the current admin API supports.
            if (onPersistProfile) {
              try {
                await onPersistProfile({
                  clientId: customer.id,
                  fullName: next.fullName,
                  phone: next.phone,
                });
              } catch {
                // Parent is responsible for surfacing errors if desired.
              }
            }
            onUpdateCustomer({
              ...customer,
              fullName: next.fullName,
              phone: next.phone,
              email: next.email,
              company: next.company,
              address: next.address,
              country: next.country,
              avatarUrl: next.avatarUrl ?? null,
            });
          }}
          onDelete={
            onDeleteCustomer
              ? async (customerId) => {
                  await onDeleteCustomer(customerId);
                }
              : undefined
          }
        />
      ) : null}

      {editingAppt ? (
        <EditAppointmentModal
          appointment={editingAppt}
          onClose={() => setEditingAppt(null)}
          onSave={(next) => {
            const updatedDays = (customer.appointmentDays ?? []).map((day) => {
              if (day.kind !== "list") return day;
              if (day.id !== next.dayId) return day;
              return {
                ...day,
                dateLine: next.dateLine,
                timeRange: next.timeRange,
                sessions: day.sessions.map((s) =>
                  s.id === next.sessionId
                    ? {
                        ...s,
                        title: next.title,
                        providerName: next.therapistName ?? next.providerName ?? s.providerName,
                        providerAvatarUrl: next.providerAvatarUrl ?? null,
                        videoLink: next.videoLink ?? "",
                        notes: next.notes ?? "",
                      }
                    : s,
                ),
              };
            });
            onUpdateCustomer({ ...customer, appointmentDays: updatedDays });
            setUpdatesReloadKey((k) => k + 1);
            setEditingAppt(null);
          }}
          onDelete={({ dayId, sessionId }) => {
            const updatedDays = (customer.appointmentDays ?? [])
              .map((day) => {
                if (day.kind !== "list") return day;
                if (day.id !== dayId) return day;
                const nextSessions = day.sessions.filter((s) => s.id !== sessionId);
                if (nextSessions.length === 0) return null;
                return { ...day, sessions: nextSessions };
              })
              .filter((x): x is NonNullable<typeof x> => Boolean(x));
            onUpdateCustomer({ ...customer, appointmentDays: updatedDays });
            setUpdatesReloadKey((k) => k + 1);
            setEditingAppt(null);
          }}
          onRejected={({ dayId, sessionId }) => {
            const updatedDays = (customer.appointmentDays ?? [])
              .map((day) => {
                if (day.kind !== "list") return day;
                if (day.id !== dayId) return day;
                const nextSessions = day.sessions.filter((s) => s.id !== sessionId);
                if (nextSessions.length === 0) return null;
                return { ...day, sessions: nextSessions };
              })
              .filter((x): x is NonNullable<typeof x> => Boolean(x));
            onUpdateCustomer({ ...customer, appointmentDays: updatedDays });
            setUpdatesReloadKey((k) => k + 1);
            setEditingAppt(null);
          }}
        />
      ) : null}

      {deleteConfirmOpen && onDeleteCustomer ? (
        <ConfirmationModal
          title="Delete customer"
          description={
            deleteError ??
            `Are you sure you want to delete "${customer.fullName}"? This cannot be undone.`
          }
          confirmLabel="Yes, delete"
          disableDismiss={Boolean(deleteError)}
          onClose={() => {
            setDeleteConfirmOpen(false);
            setDeleteError(null);
          }}
          onConfirm={async () => {
            try {
              setDeleteError(null);
              await onDeleteCustomer(customer.id);
              setDeleteConfirmOpen(false);
            } catch (e) {
              setDeleteError(
                e instanceof Error ? e.message : "Failed to delete customer",
              );
            }
          }}
        />
      ) : null}
    </div>
  );
}

