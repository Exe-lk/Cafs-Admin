"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import MaterialSymbol from "@/components/admin/MaterialSymbol";
import AppointmentActionsMenu from "@/components/admin/AppointmentActionsMenu";
import {
  APPOINTMENT_STATUS_OPTIONS,
  appointmentStatusFromSearchParams,
} from "@/components/admin/AppointmentsSubNav";
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

type AppointmentModalState = {
  mode: "view" | "edit";
  item: AppointmentItem;
} | null;

function titleForAppointmentType(t: "online" | "in_person") {
  if (t === "in_person") return "In-person appointment";
  return "Online appointment";
}

function appointmentTypeLabel(t: "online" | "in_person") {
  return t === "in_person" ? "In-person" : "Online";
}

function serviceLine(item: AppointmentItem) {
  const typeLabel = appointmentTypeLabel(item.appointmentType);
  const name = item.service.name || titleForAppointmentType(item.appointmentType);
  const serviceTitle = name.includes("(") ? name : `${name}(${typeLabel})`;
  return `${serviceTitle} by ${item.therapist.fullName || "—"}`;
}

function emptyMessage(statusFilter: StatusFilter) {
  if (statusFilter === "all") return "No appointments match the current filters.";
  if (statusFilter === "pending_payment") return "No awaiting appointments found.";
  if (statusFilter === "pending_confirmation") return "No appointments are awaiting confirmation.";
  return "No confirmed payment appointments found.";
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
  const searchParams = useSearchParams();
  const statusFilter = appointmentStatusFromSearchParams(searchParams.get("status"));

  const [items, setItems] = useState<AppointmentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [noticeMsg, setNoticeMsg] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [appointmentModal, setAppointmentModal] = useState<AppointmentModalState>(null);
  const [actionsMenuId, setActionsMenuId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  const activeStatusLabel = useMemo(() => {
    return (
      APPOINTMENT_STATUS_OPTIONS.find((item) => item.status === statusFilter)?.label ??
      APPOINTMENT_STATUS_OPTIONS[0]!.label
    );
  }, [statusFilter]);

  const openAppointmentModal = useCallback((item: AppointmentItem, mode: "view" | "edit") => {
    setActionsMenuId(null);
    setAppointmentModal({ item, mode });
  }, []);

  const closeAppointmentModal = useCallback(() => {
    setAppointmentModal(null);
  }, []);

  const handleDelete = useCallback(async (item: AppointmentItem) => {
    const ok = window.confirm("Delete this appointment? This action cannot be undone.");
    if (!ok) return;

    setDeletingId(item.appointmentId);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/v1/admin/appointments/${item.appointmentId}`, {
        method: "DELETE",
        cache: "no-store",
      });
      const json = (await res.json()) as { status?: string; message?: string };
      if (!res.ok || json.status !== "success") {
        throw new Error(json.message || `Delete failed (HTTP ${res.status})`);
      }
      setReloadKey((k) => k + 1);
      setNoticeMsg(null);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Failed to delete appointment");
    } finally {
      setDeletingId(null);
    }
  }, []);

  return (
    <main
      className="relative flex h-full min-h-0 flex-1 flex-col overflow-y-auto bg-mgmt-surface-container-lowest"
      data-purpose="main-content"
    >
      {appointmentModal ? (
        <EditAppointmentModal
          key={`${appointmentModal.item.appointmentId}-${appointmentModal.mode}`}
          appointment={toEditableAppointment(appointmentModal.item)}
          therapistTimezone={appointmentModal.item.therapist.timezone}
          readOnly={appointmentModal.mode === "view"}
          onClose={closeAppointmentModal}
          onDelete={() => {
            closeAppointmentModal();
            setReloadKey((k) => k + 1);
          }}
          onRejected={({ emailSent, emailError }) => {
            closeAppointmentModal();
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
            closeAppointmentModal();
            setReloadKey((k) => k + 1);
            setNoticeMsg(null);
          }}
        />
      ) : null}

      <header className="sticky top-12 z-10 flex shrink-0 items-center justify-between gap-3 bg-mgmt-surface-container-lowest px-4 py-5 sm:top-0 sm:px-6 lg:px-8 lg:py-6">
        <h1 className="min-w-0 truncate text-xl font-bold text-mgmt-on-surface sm:text-2xl">
          {activeStatusLabel}
        </h1>
      </header>

      <div className="px-4 pb-5 sm:px-6 lg:px-8">
        <div
          className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4"
          data-purpose="filters"
        >
          <div className="relative min-w-0 sm:min-w-[200px] sm:max-w-[240px]">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <MaterialSymbol name="calendar_today" className="text-[18px] text-mgmt-on-surface-variant" />
            </div>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="block h-10 w-full rounded-lg border border-mgmt-outline-variant bg-white py-2 pr-3 pl-10 text-sm text-mgmt-on-surface focus:border-mgmt-on-surface-variant focus:ring-1 focus:ring-mgmt-outline-variant focus:outline-none"
              aria-label="Filter by date"
            />
          </div>

          <div className="relative min-w-0 w-full max-w-sm flex-1 sm:min-w-[220px]">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <svg className="h-4 w-4 text-mgmt-on-surface-variant" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="block h-10 w-full rounded-lg border border-mgmt-outline-variant py-2 pr-3 pl-10 text-sm text-mgmt-on-surface placeholder:text-mgmt-on-surface-variant focus:border-mgmt-on-surface-variant focus:ring-1 focus:ring-mgmt-outline-variant focus:outline-none"
              placeholder="Search customer, therapist, or service"
              type="search"
              aria-label="Search appointments"
            />
          </div>

          <p className="text-sm text-mgmt-on-surface-variant sm:ml-auto">
            {total} appointment{total === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      {noticeMsg ? (
        <div className="mx-4 mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 sm:mx-6 lg:mx-8">
          {noticeMsg}
        </div>
      ) : null}

      {errorMsg ? (
        <div className="mx-4 mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:mx-6 lg:mx-8">
          {errorMsg}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 px-4 pb-8 sm:px-6 lg:px-8">
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
            <div className="hidden rounded-xl border border-mgmt-outline-variant/15 bg-white lg:block">
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
                      Service
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
                    const isDeleting = deletingId === item.appointmentId;
                    return (
                      <tr
                        key={item.appointmentId}
                        className={cx(
                          "hover:bg-mgmt-surface-container-low/60",
                          isDeleting && "opacity-50",
                        )}
                      >
                        <td className="px-4 py-4 text-sm text-mgmt-on-surface">{display}</td>
                        <td className="px-4 py-4">
                          <p className="text-sm font-medium text-mgmt-on-surface">{item.client.fullName || "—"}</p>
                          <p className="text-xs text-mgmt-on-surface-variant">{item.client.email || "—"}</p>
                        </td>
                        <td className="px-4 py-4 text-xs text-mgmt-on-surface">{serviceLine(item)}</td>
                        <td className="relative px-4 py-4 text-right">
                          <AppointmentActionsMenu
                            itemLabel={item.client.fullName || item.appointmentId}
                            open={actionsMenuId === item.appointmentId}
                            onOpenChange={(open) =>
                              setActionsMenuId(open ? item.appointmentId : null)
                            }
                            onView={() => openAppointmentModal(item, "view")}
                            onEdit={() => openAppointmentModal(item, "edit")}
                            onDelete={() => void handleDelete(item)}
                          />
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
                const isDeleting = deletingId === item.appointmentId;
                return (
                  <article
                    key={item.appointmentId}
                    className={cx(
                      "rounded-xl border border-mgmt-outline-variant/15 bg-white p-4 shadow-sm",
                      isDeleting && "opacity-50",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-mgmt-on-surface">{item.client.fullName || "—"}</p>
                        <p className="mt-0.5 text-xs text-mgmt-on-surface-variant">{display}</p>
                        <p className="mt-2 text-xs text-mgmt-on-surface">{serviceLine(item)}</p>
                      </div>
                      <AppointmentActionsMenu
                        itemLabel={item.client.fullName || item.appointmentId}
                        open={actionsMenuId === item.appointmentId}
                        onOpenChange={(open) => setActionsMenuId(open ? item.appointmentId : null)}
                        onView={() => openAppointmentModal(item, "view")}
                        onEdit={() => openAppointmentModal(item, "edit")}
                        onDelete={() => void handleDelete(item)}
                      />
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
