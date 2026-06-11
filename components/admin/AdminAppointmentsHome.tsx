"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import MaterialSymbol from "@/components/admin/MaterialSymbol";
import EditAppointmentModal, {
  type AdminEditableAppointment,
} from "@/components/admin/EditAppointmentModal";
import { approvalStatusForAppointmentStatus } from "@/lib/calendar/appointmentStatus";
import {
  formatDateInTimeZone,
  formatTimeInTimeZone,
  normalizeTimeZone,
  parseDbUtcTimestamp,
} from "@/lib/timezone";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type AppointmentStatus = "pending_payment" | "pending_confirmation" | "confirmed";

type AppointmentItem = {
  appointmentId: string;
  status: AppointmentStatus;
  appointmentType: "online" | "in_person";
  startAt: string;
  endAt: string;
  paymentDueAt: string | null;
  createdAt: string;
  proofUrl: string | null;
  client: {
    clientId: string;
    fullName: string;
    email: string;
    phone: string;
  };
  therapist: {
    therapistId: string;
    fullName: string;
    timezone: string;
    profilePhotoUrl: string | null;
  };
  service: {
    serviceId: string;
    name: string;
    basePriceLkr: number | null;
  };
  payment: {
    method: "gateway" | "bank_transfer" | "cash" | null;
    status: string;
    amount: number | null;
    currency: string;
    paidAt: string | null;
  } | null;
};

type StatusFilter = "all" | AppointmentStatus;

function titleForAppointmentType(t: "online" | "in_person") {
  if (t === "in_person") return "In-person appointment";
  return "Online appointment";
}

function statusLabel(status: AppointmentStatus) {
  if (status === "pending_payment") return "Awaiting payment";
  if (status === "pending_confirmation") return "Awaiting confirmation";
  return "Confirmed payment";
}

function statusBadgeClass(status: AppointmentStatus) {
  if (status === "pending_payment") return "bg-amber-100 text-amber-800";
  if (status === "pending_confirmation") return "bg-sky-100 text-sky-800";
  return "bg-emerald-100 text-emerald-800";
}

function emptyMessage(statusFilter: StatusFilter) {
  if (statusFilter === "all") return "No appointments match the current filters.";
  if (statusFilter === "pending_payment") return "No appointments are awaiting payment.";
  if (statusFilter === "pending_confirmation") return "No appointments are awaiting confirmation.";
  return "No confirmed appointments found.";
}

function formatAppointmentRange(
  startAt: string,
  endAt: string,
  timeZone: string,
): { dateLine: string; timeRange: string; display: string } {
  const startUtc = parseDbUtcTimestamp(startAt);
  const endUtc = parseDbUtcTimestamp(endAt);
  if (!startUtc || !endUtc) {
    return { dateLine: startAt, timeRange: "", display: startAt };
  }

  const dateLine = formatDateInTimeZone(startUtc, timeZone, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const dow = formatDateInTimeZone(startUtc, timeZone, { weekday: "short" });
  const timeRange = `${formatTimeInTimeZone(startUtc, timeZone)} – ${formatTimeInTimeZone(endUtc, timeZone)}`;

  return {
    dateLine: `${dateLine}, ${dow}`,
    timeRange,
    display: `${dateLine} · ${timeRange}`,
  };
}

function toEditableAppointment(item: AppointmentItem): AdminEditableAppointment {
  const timeZone = normalizeTimeZone(item.therapist.timezone);
  const { dateLine, timeRange } = formatAppointmentRange(item.startAt, item.endAt, timeZone);

  return {
    dayId: item.startAt,
    sessionId: item.appointmentId,
    dateLine,
    timeRange,
    title: item.service.name || titleForAppointmentType(item.appointmentType),
    providerName: item.therapist.fullName,
    notes: "",
    videoLink: "",
    proofUrl: item.proofUrl ?? undefined,
    approvalStatus: approvalStatusForAppointmentStatus(item.status),
    appointmentStatus: item.status,
    startAt: item.startAt,
    endAt: item.endAt,
    appointmentType: item.appointmentType,
  };
}

export default function AdminAppointmentsHome() {
  const [items, setItems] = useState<AppointmentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [noticeMsg, setNoticeMsg] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [selected, setSelected] = useState<AdminEditableAppointment | null>(null);
  const [selectedItem, setSelectedItem] = useState<AppointmentItem | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const loadItems = useCallback(async (signal: AbortSignal) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const sp = new URLSearchParams();
      if (statusFilter !== "all") sp.set("status", statusFilter);
      if (query.trim()) sp.set("q", query.trim());

      const res = await fetch(`/api/v1/admin/appointments/list?${sp.toString()}`, {
        method: "GET",
        cache: "no-store",
        signal,
      });
      const json = (await res.json()) as {
        status?: string;
        message?: string;
        data?: { items?: AppointmentItem[]; total?: number };
      };
      if (!res.ok || json.status !== "success" || !json.data) {
        throw new Error(json.message || `Failed to load appointments (HTTP ${res.status})`);
      }

      setItems(json.data.items ?? []);
      setTotal(json.data.total ?? json.data.items?.length ?? 0);
    } catch (e) {
      if ((e as { name?: string })?.name === "AbortError") return;
      setErrorMsg(e instanceof Error ? e.message : "Failed to load appointments");
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [query, statusFilter]);

  useEffect(() => {
    const ac = new AbortController();
    void loadItems(ac.signal);
    return () => ac.abort();
  }, [loadItems, reloadKey]);

  const filteredItems = useMemo(() => items, [items]);

  const openReview = useCallback((item: AppointmentItem) => {
    setSelectedItem(item);
    setSelected(toEditableAppointment(item));
    setEditOpen(true);
  }, []);

  const statusFilters: Array<{ id: StatusFilter; label: string }> = [
    { id: "all", label: "All Appointments" },
    { id: "pending_payment", label: "Awaiting payment" },
    { id: "pending_confirmation", label: "Awaiting confirmation" },
    { id: "confirmed", label: "Confirmed payment" },
  ];

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-mgmt-surface-container-lowest">
      <header className="shrink-0 border-b border-mgmt-outline-variant/10 bg-white/80 px-6 py-6 backdrop-blur-xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-mgmt-on-surface">Appointments</h1>
              <span className="rounded-full bg-mgmt-primary/10 px-2.5 py-0.5 text-xs font-bold text-mgmt-primary">
                {total}
              </span>
            </div>
            <p className="mt-1 text-sm text-mgmt-on-surface-variant">
              Review payment proofs, approve or reject pending bookings, and view confirmed appointments.
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {statusFilters.map((filter) => {
              const active = statusFilter === filter.id;
              return (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setStatusFilter(filter.id)}
                  className={cx(
                    "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                    active
                      ? "bg-mgmt-primary text-mgmt-on-primary"
                      : "bg-mgmt-surface-container-low text-mgmt-on-surface-variant hover:text-mgmt-on-surface",
                  )}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>

          <div className="relative w-full lg:max-w-sm">
            <MaterialSymbol
              name="search"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg text-mgmt-on-surface-variant"
            />
            <input
              className="h-10 w-full rounded-lg border border-mgmt-outline-variant/30 bg-mgmt-surface-container-lowest py-2 pr-4 pl-10 text-sm text-mgmt-on-surface transition-all placeholder:text-mgmt-on-surface-variant focus:border-mgmt-primary/40 focus:ring-2 focus:ring-mgmt-primary/15 focus:outline-none"
              placeholder="Search customer, therapist, or service"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search appointments"
            />
          </div>
        </div>
      </header>

      {noticeMsg ? (
        <div className="mx-6 mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {noticeMsg}
        </div>
      ) : null}

      {errorMsg ? (
        <div className="mx-6 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMsg}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
        {loading ? (
          <p className="py-12 text-center text-sm text-mgmt-on-surface-variant">Loading…</p>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <MaterialSymbol name="event_note" className="text-5xl text-mgmt-on-surface-variant/50" />
            <p className="mt-4 text-sm font-medium text-mgmt-on-surface">No appointments</p>
            <p className="mt-1 text-sm text-mgmt-on-surface-variant">{emptyMessage(statusFilter)}</p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-hidden rounded-xl border border-mgmt-outline-variant/15 bg-white lg:block">
              <table className="min-w-full divide-y divide-mgmt-outline-variant/10">
                <thead className="bg-mgmt-surface-container-low">
                  <tr>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold tracking-wider text-mgmt-on-surface-variant uppercase">
                      Date &amp; time
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold tracking-wider text-mgmt-on-surface-variant uppercase">
                      Customer
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold tracking-wider text-mgmt-on-surface-variant uppercase">
                      Therapist
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold tracking-wider text-mgmt-on-surface-variant uppercase">
                      Service
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold tracking-wider text-mgmt-on-surface-variant uppercase">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold tracking-wider text-mgmt-on-surface-variant uppercase">
                      Proof
                    </th>
                    <th className="px-4 py-3 text-right text-[11px] font-semibold tracking-wider text-mgmt-on-surface-variant uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-mgmt-outline-variant/10">
                  {filteredItems.map((item) => {
                    const timeZone = normalizeTimeZone(item.therapist.timezone);
                    const { display } = formatAppointmentRange(item.startAt, item.endAt, timeZone);
                    return (
                      <tr key={item.appointmentId} className="hover:bg-mgmt-surface-container-low/60">
                        <td className="px-4 py-4 text-sm text-mgmt-on-surface">{display}</td>
                        <td className="px-4 py-4">
                          <p className="text-sm font-medium text-mgmt-on-surface">{item.client.fullName || "—"}</p>
                          <p className="text-xs text-mgmt-on-surface-variant">{item.client.email || "—"}</p>
                        </td>
                        <td className="px-4 py-4 text-sm text-mgmt-on-surface">
                          {item.therapist.fullName || "—"}
                        </td>
                        <td className="px-4 py-4 text-sm text-mgmt-on-surface">{item.service.name || "—"}</td>
                        <td className="px-4 py-4">
                          <span
                            className={cx(
                              "inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold",
                              statusBadgeClass(item.status),
                            )}
                          >
                            {statusLabel(item.status)}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          {item.proofUrl ? (
                            <a
                              href={item.proofUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-semibold text-mgmt-primary hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MaterialSymbol name="receipt_long" className="text-base" />
                              View proof
                            </a>
                          ) : (
                            <span className="text-xs text-mgmt-on-surface-variant">No proof</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => openReview(item)}
                            className="rounded-lg bg-mgmt-primary px-3 py-1.5 text-xs font-bold tracking-wider text-mgmt-on-primary uppercase transition-opacity hover:opacity-90"
                          >
                            Review
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="space-y-4 lg:hidden">
              {filteredItems.map((item) => {
                const timeZone = normalizeTimeZone(item.therapist.timezone);
                const { display } = formatAppointmentRange(item.startAt, item.endAt, timeZone);
                return (
                  <article
                    key={item.appointmentId}
                    className="rounded-xl border border-mgmt-outline-variant/15 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-mgmt-on-surface">{item.client.fullName || "—"}</p>
                        <p className="mt-0.5 text-xs text-mgmt-on-surface-variant">{display}</p>
                      </div>
                      <span
                        className={cx(
                          "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                          statusBadgeClass(item.status),
                        )}
                      >
                        {statusLabel(item.status)}
                      </span>
                    </div>

                    <dl className="mt-4 grid grid-cols-1 gap-2 text-sm">
                      <div className="flex justify-between gap-3">
                        <dt className="text-mgmt-on-surface-variant">Therapist</dt>
                        <dd className="text-right font-medium text-mgmt-on-surface">
                          {item.therapist.fullName || "—"}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-mgmt-on-surface-variant">Service</dt>
                        <dd className="text-right font-medium text-mgmt-on-surface">{item.service.name || "—"}</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-mgmt-on-surface-variant">Proof</dt>
                        <dd className="text-right">
                          {item.proofUrl ? (
                            <a
                              href={item.proofUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="font-semibold text-mgmt-primary hover:underline"
                            >
                              View proof
                            </a>
                          ) : (
                            <span className="text-mgmt-on-surface-variant">No proof</span>
                          )}
                        </dd>
                      </div>
                    </dl>

                    <button
                      type="button"
                      onClick={() => openReview(item)}
                      className="mt-4 w-full rounded-lg bg-mgmt-primary px-3 py-2 text-xs font-bold tracking-wider text-mgmt-on-primary uppercase transition-opacity hover:opacity-90"
                    >
                      Review
                    </button>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </div>

      {editOpen && selected && selectedItem ? (
        <EditAppointmentModal
          appointment={selected}
          therapistTimezone={selectedItem.therapist.timezone}
          onClose={() => {
            setEditOpen(false);
            setSelected(null);
            setSelectedItem(null);
          }}
          onDelete={() => {
            setEditOpen(false);
            setSelected(null);
            setSelectedItem(null);
            setReloadKey((k) => k + 1);
          }}
          onRejected={({ emailSent, emailError }) => {
            setEditOpen(false);
            setSelected(null);
            setSelectedItem(null);
            setReloadKey((k) => k + 1);
            if (!emailSent && emailError) {
              setNoticeMsg(
                `Appointment cancelled, but the client could not be emailed: ${emailError}`,
              );
            } else {
              setNoticeMsg(null);
            }
          }}
          onSave={() => {
            setEditOpen(false);
            setSelected(null);
            setSelectedItem(null);
            setReloadKey((k) => k + 1);
            setNoticeMsg(null);
          }}
        />
      ) : null}
    </div>
  );
}
