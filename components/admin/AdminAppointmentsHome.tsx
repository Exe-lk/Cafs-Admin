"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import MaterialSymbol from "@/components/admin/MaterialSymbol";
import AppointmentActionsMenu from "@/components/admin/AppointmentActionsMenu";
import {
  APPOINTMENT_STATUS_OPTIONS,
  appointmentStatusFromSearchParams,
} from "@/components/admin/AppointmentsSubNav";
import {
  type AppointmentCounts,
  usePublishAppointmentCounts,
} from "@/components/admin/useAppointmentCounts";
import EditAppointmentModal, {
  type AdminEditableAppointment,
} from "@/components/admin/EditAppointmentModal";
import { approvalStatusForAppointmentStatus } from "@/lib/calendar/appointmentStatus";
import { labelForPaymentMethod } from "@/lib/calendar/notificationLabels";
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

type TimeScope = "upcoming" | "past" | "all";

type FilterOption = { id: string; name: string };

type AppointmentModalState = {
  mode: "view" | "edit";
  item: AppointmentItem;
} | null;

const PAGE_SIZE_OPTIONS = [15, 30, 40, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 30;

const PAYMENT_FILTER_OPTIONS = [
  { value: "gateway", label: labelForPaymentMethod("gateway") },
  { value: "bank_transfer", label: labelForPaymentMethod("bank_transfer") },
  { value: "cash", label: labelForPaymentMethod("cash") },
  { value: "none", label: "No payment method" },
] as const;

const TIME_SCOPE_OPTIONS = [
  { value: "upcoming", label: "Upcoming" },
  { value: "past", label: "Past" },
  { value: "all", label: "All time" },
] as const;

const SEARCH_DEBOUNCE_MS = 300;

const FILTER_SELECT_CLASS =
  "h-10 w-full appearance-none rounded-lg border border-mgmt-outline-variant bg-white py-2 pl-3 pr-9 text-sm text-mgmt-on-surface shadow-sm transition-colors hover:border-mgmt-on-surface-variant/80 focus:border-mgmt-on-surface-variant focus:ring-1 focus:ring-mgmt-outline-variant focus:outline-none";

const PLACEHOLDER_APPOINTMENT_ID_BASE = 10292019;

function placeholderAppointmentDisplayId(index: number, page: number, pageSize: number): string {
  return String(PLACEHOLDER_APPOINTMENT_ID_BASE + (page - 1) * pageSize + index);
}

function AppointmentsTablePagination({
  totalResults,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: {
  totalResults: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize));
  const safePage = Math.min(page, totalPages);
  const rangeStart = totalResults === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const rangeEnd = totalResults === 0 ? 0 : Math.min(safePage * pageSize, totalResults);
  const canGoBack = safePage > 1;
  const canGoNext = safePage < totalPages;

  return (
    <div className="flex flex-col gap-3 border-t border-mgmt-outline-variant/10 bg-mgmt-surface-container-low px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-mgmt-on-surface-variant">
        {totalResults === 0
          ? "Showing 0 results"
          : `Showing ${rangeStart} to ${rangeEnd} of ${totalResults} results`}
      </p>

      <div className="flex flex-wrap items-center gap-3 sm:justify-end">
        <label className="flex items-center gap-2 text-sm text-mgmt-on-surface-variant">
          <span>Per page</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className=" h-9 rounded-lg border border-mgmt-outline-variant bg-white pl-2 pr-2.5 text-sm text-mgmt-on-surface focus:border-mgmt-on-surface-variant focus:ring-1 focus:ring-mgmt-outline-variant focus:outline-none"
            aria-label="Rows per page"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!canGoBack}
            onClick={() => onPageChange(safePage - 1)}
            className="rounded-lg border border-mgmt-outline-variant bg-white px-2 py-1.5 text-sm font-medium text-mgmt-on-surface transition-colors hover:bg-mgmt-surface-container-lowest disabled:cursor-not-allowed disabled:opacity-40"
          >
            Back
          </button>
          <span className="text-sm text-mgmt-on-surface-variant">
            Page {safePage} of {totalPages}
          </span>
          <button
            type="button"
            disabled={!canGoNext}
            onClick={() => onPageChange(safePage + 1)}
            className="rounded-lg border border-mgmt-outline-variant bg-white px-3 py-1.5 text-sm font-medium text-mgmt-on-surface transition-colors hover:bg-mgmt-surface-container-lowest disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

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

function hasPaymentProof(proofUrl: string | null) {
  return Boolean(proofUrl?.trim());
}

function ViewProofButton({ proofUrl }: { proofUrl: string | null }) {
  const available = hasPaymentProof(proofUrl);

  if (available) {
    return (
      <a
        href={proofUrl!.trim()}
        target="_blank"
        rel="noreferrer"
        aria-label="View payment proof"
        className="inline-flex shrink-0 items-center justify-center rounded-lg border border-mgmt-outline-variant p-1.5 text-mgmt-primary transition-colors hover:bg-mgmt-surface-container-low"
        onClick={(e) => e.stopPropagation()}
      >
        <MaterialSymbol name="receipt_long" className="text-[18px]" />
      </a>
    );
  }

  return (
    <button
      type="button"
      disabled
      className="inline-flex shrink-0 cursor-not-allowed items-center justify-center rounded-lg border border-mgmt-outline-variant/40 p-1.5 text-mgmt-on-surface-variant/50"
      aria-label="Payment proof not available"
    >
      <MaterialSymbol name="receipt_long" className="text-[18px]" />
    </button>
  );
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
    therapistId: item.therapist.therapistId,
    therapistName: item.therapist.fullName,
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
  const publishAppointmentCounts = usePublishAppointmentCounts();

  const [items, setItems] = useState<AppointmentItem[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [timeScope, setTimeScope] = useState<TimeScope>("upcoming");
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState("");
  const [therapistFilter, setTherapistFilter] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [therapistOptions, setTherapistOptions] = useState<FilterOption[]>([]);
  const [serviceOptions, setServiceOptions] = useState<FilterOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [noticeMsg, setNoticeMsg] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [appointmentModal, setAppointmentModal] = useState<AppointmentModalState>(null);
  const [actionsMenuId, setActionsMenuId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const refreshAppointments = useCallback(() => {
    setReloadKey((k) => k + 1);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const ac = new AbortController();

    void (async () => {
      try {
        const [therapistsRes, servicesRes] = await Promise.all([
          fetch("/api/v1/admin/therapists", { method: "GET", cache: "no-store", signal: ac.signal }),
          fetch("/api/v1/admin/services", { method: "GET", cache: "no-store", signal: ac.signal }),
        ]);

        const therapistsJson = (await therapistsRes.json()) as {
          status?: string;
          data?: {
            items?: Array<{
              therapist_id?: string;
              profiles?: { full_name?: string | null } | Array<{ full_name?: string | null }>;
            }>;
          };
        };
        const servicesJson = (await servicesRes.json()) as {
          status?: string;
          data?: { items?: Array<{ service_id?: string; name?: string | null }> };
        };

        if (therapistsRes.ok && therapistsJson.status === "success") {
          const options = (therapistsJson.data?.items ?? [])
            .map((row) => {
              const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
              return {
                id: row.therapist_id ?? "",
                name: profile?.full_name?.trim() || "Therapist",
              };
            })
            .filter((option) => option.id)
            .sort((a, b) => a.name.localeCompare(b.name));
          setTherapistOptions(options);
        }

        if (servicesRes.ok && servicesJson.status === "success") {
          const options = (servicesJson.data?.items ?? [])
            .map((row) => ({
              id: row.service_id ?? "",
              name: row.name?.trim() || "Service",
            }))
            .filter((option) => option.id)
            .sort((a, b) => a.name.localeCompare(b.name));
          setServiceOptions(options);
        }
      } catch (e) {
        if ((e as { name?: string })?.name === "AbortError") return;
      }
    })();

    return () => ac.abort();
  }, []);

  const loadItems = useCallback(async (signal: AbortSignal) => {
    setLoading(true);
    publishAppointmentCounts(null, true);
    setErrorMsg(null);
    try {
      const sp = new URLSearchParams();
      sp.set("timeScope", timeScope);
      sp.set("page", String(page));
      sp.set("limit", String(pageSize));
      if (statusFilter !== "all") sp.set("status", statusFilter);
      if (debouncedQuery.trim()) sp.set("q", debouncedQuery.trim());
      if (dateFilter) sp.set("date", dateFilter);
      if (therapistFilter) sp.set("therapistId", therapistFilter);
      if (serviceFilter) sp.set("serviceId", serviceFilter);
      if (paymentFilter) sp.set("paymentMethod", paymentFilter);

      const res = await fetch(`/api/v1/admin/appointments/list?${sp.toString()}`, {
        method: "GET",
        cache: "no-store",
        signal,
      });
      const json = (await res.json()) as {
        status?: string;
        message?: string;
        data?: {
          items?: AppointmentItem[];
          total?: number;
          pagination?: { totalItems?: number; page?: number; totalPages?: number };
          statusCounts?: AppointmentCounts;
        };
      };
      if (!res.ok || json.status !== "success" || !json.data) {
        throw new Error(json.message || `Failed to load appointments (HTTP ${res.status})`);
      }

      setItems(json.data.items ?? []);
      setTotalResults(json.data.pagination?.totalItems ?? json.data.total ?? json.data.items?.length ?? 0);

      if (json.data.statusCounts) {
        publishAppointmentCounts(json.data.statusCounts, false);
      } else {
        publishAppointmentCounts(null, false);
      }
    } catch (e) {
      if ((e as { name?: string })?.name === "AbortError") return;
      setErrorMsg(e instanceof Error ? e.message : "Failed to load appointments");
      setItems([]);
      setTotalResults(0);
      publishAppointmentCounts(null, false);
    } finally {
      setLoading(false);
    }
  }, [
    dateFilter,
    debouncedQuery,
    page,
    pageSize,
    paymentFilter,
    publishAppointmentCounts,
    serviceFilter,
    statusFilter,
    therapistFilter,
    timeScope,
  ]);

  useEffect(() => {
    const ac = new AbortController();
    void loadItems(ac.signal);
    return () => ac.abort();
  }, [loadItems, reloadKey]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  const resetToFirstPage = useCallback(() => {
    setPage(1);
  }, []);

  const hasActiveAdvancedFilters = Boolean(
    timeScope !== "upcoming" ||
      dateFilter ||
      therapistFilter ||
      serviceFilter ||
      paymentFilter,
  );

  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize));
  const safePage = Math.min(page, totalPages);

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [page, safePage]);

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
      refreshAppointments();
      setNoticeMsg(null);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Failed to delete appointment");
    } finally {
      setDeletingId(null);
    }
  }, [refreshAppointments]);

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
            refreshAppointments();
          }}
          onRejected={({ emailSent, emailError }) => {
            closeAppointmentModal();
            refreshAppointments();
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
            refreshAppointments();
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
        <div className="flex flex-col gap-3" data-purpose="filters">
          <div className="flex items-center gap-3">
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
                onChange={(e) => {
                  setQuery(e.target.value);
                  resetToFirstPage();
                }}
                className="block h-10 w-full rounded-lg border border-mgmt-outline-variant py-2 pr-3 pl-10 text-sm text-mgmt-on-surface placeholder:text-mgmt-on-surface-variant focus:border-mgmt-on-surface-variant focus:ring-1 focus:ring-mgmt-outline-variant focus:outline-none"
                placeholder="Search customer, therapist, or service"
                type="search"
                aria-label="Search appointments"
              />
            </div>

            <button
              type="button"
              onClick={() => setAdvancedFiltersOpen((open) => !open)}
              className={cx(
                "relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-mgmt-outline-variant bg-white text-mgmt-on-surface-variant transition-colors hover:bg-mgmt-surface-container-low hover:text-mgmt-on-surface",
                advancedFiltersOpen && "border-mgmt-on-surface-variant bg-mgmt-surface-container-low text-mgmt-on-surface",
                hasActiveAdvancedFilters && !advancedFiltersOpen && "text-mgmt-primary",
              )}
              aria-label="Advanced filters"
              aria-expanded={advancedFiltersOpen}
            >
              <MaterialSymbol name="tune" className="text-[20px]" />
              {hasActiveAdvancedFilters ? (
                <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-mgmt-primary" aria-hidden />
              ) : null}
            </button>
          </div>

          {advancedFiltersOpen ? (
            <div
              className="flex flex-col gap-3 rounded-xl border border-mgmt-outline-variant/20 bg-mgmt-surface-container-low/50 p-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-4"
              data-purpose="advanced-filters"
            >
              <label className="flex min-w-0 flex-1 flex-col gap-1.5 sm:min-w-[180px] sm:max-w-[220px]">
                <span className="text-xs font-semibold text-mgmt-on-surface-variant">Time period</span>
                <div className="relative">
                  <select
                    value={timeScope}
                    onChange={(e) => {
                      setTimeScope(e.target.value as TimeScope);
                      resetToFirstPage();
                    }}
                    className={FILTER_SELECT_CLASS}
                  >
                    {TIME_SCOPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <MaterialSymbol
                    name="expand_more"
                    className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-[18px] text-mgmt-on-surface-variant"
                    aria-hidden
                  />
                </div>
              </label>

              <label className="flex min-w-0 flex-1 flex-col gap-1.5 sm:min-w-[180px] sm:max-w-[220px]">
                <span className="text-xs font-semibold text-mgmt-on-surface-variant">Filter by date</span>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <MaterialSymbol name="calendar_today" className="text-[18px] text-mgmt-on-surface-variant" />
                  </div>
                  <input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => {
                      setDateFilter(e.target.value);
                      resetToFirstPage();
                    }}
                    className="block h-10 w-full rounded-lg border border-mgmt-outline-variant bg-white py-2 pr-3 pl-10 text-sm text-mgmt-on-surface shadow-sm transition-colors hover:border-mgmt-on-surface-variant/80 focus:border-mgmt-on-surface-variant focus:ring-1 focus:ring-mgmt-outline-variant focus:outline-none"
                  />
                </div>
              </label>

              <label className="flex min-w-0 flex-1 flex-col gap-1.5 sm:min-w-[180px] sm:max-w-[240px]">
                <span className="text-xs font-semibold text-mgmt-on-surface-variant">Filter by therapist</span>
                <div className="relative">
                  <select
                    value={therapistFilter}
                    onChange={(e) => {
                      setTherapistFilter(e.target.value);
                      resetToFirstPage();
                    }}
                    className={FILTER_SELECT_CLASS}
                  >
                    <option value="">All therapists</option>
                    {therapistOptions.map((therapist) => (
                      <option key={therapist.id} value={therapist.id}>
                        {therapist.name}
                      </option>
                    ))}
                  </select>
                  <MaterialSymbol
                    name="expand_more"
                    className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-[18px] text-mgmt-on-surface-variant"
                    aria-hidden
                  />
                </div>
              </label>

              <label className="flex min-w-0 flex-1 flex-col gap-1.5 sm:min-w-[180px] sm:max-w-[240px]">
                <span className="text-xs font-semibold text-mgmt-on-surface-variant">Filter by service</span>
                <div className="relative">
                  <select
                    value={serviceFilter}
                    onChange={(e) => {
                      setServiceFilter(e.target.value);
                      resetToFirstPage();
                    }}
                    className={FILTER_SELECT_CLASS}
                  >
                    <option value="">All services</option>
                    {serviceOptions.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name}
                      </option>
                    ))}
                  </select>
                  <MaterialSymbol
                    name="expand_more"
                    className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-[18px] text-mgmt-on-surface-variant"
                    aria-hidden
                  />
                </div>
              </label>

              <label className="flex min-w-0 flex-1 flex-col gap-1.5 sm:min-w-[180px] sm:max-w-[240px]">
                <span className="text-xs font-semibold text-mgmt-on-surface-variant">Filter by payment</span>
                <div className="relative">
                  <select
                    value={paymentFilter}
                    onChange={(e) => {
                      setPaymentFilter(e.target.value);
                      resetToFirstPage();
                    }}
                    className={FILTER_SELECT_CLASS}
                  >
                    <option value="">All payment methods</option>
                    {PAYMENT_FILTER_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <MaterialSymbol
                    name="expand_more"
                    className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-[18px] text-mgmt-on-surface-variant"
                    aria-hidden
                  />
                </div>
              </label>

              {hasActiveAdvancedFilters ? (
                <button
                  type="button"
                  onClick={() => {
                    setTimeScope("upcoming");
                    setDateFilter("");
                    setTherapistFilter("");
                    setServiceFilter("");
                    setPaymentFilter("");
                    resetToFirstPage();
                  }}
                  className="h-10 shrink-0 rounded-lg px-3 text-sm font-medium text-mgmt-on-surface-variant transition-colors hover:bg-white hover:text-mgmt-on-surface"
                >
                  Clear filters
                </button>
              ) : null}
            </div>
          ) : null}
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

      <div className="min-h-0 flex-1 px-4 pb-12 sm:px-6 lg:px-8">
        {loading ? (
          <p className="py-12 text-center text-sm text-mgmt-on-surface-variant">Loading…</p>
        ) : totalResults === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <MaterialSymbol name="event_note" className="text-5xl text-mgmt-on-surface-variant/50" />
            <p className="mt-4 text-sm font-medium text-mgmt-on-surface">No appointments</p>
            <p className="mt-1 text-sm text-mgmt-on-surface-variant">{emptyMessage(statusFilter)}</p>
          </div>
        ) : (
          <div className="pb-8">
            <div className="hidden rounded-xl border border-mgmt-outline-variant/15 bg-white lg:block">
              <table className="min-w-full divide-y divide-mgmt-outline-variant/10">
                <thead className="bg-mgmt-surface-container-low">
                  <tr>
                    <th className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-semibold tracking-wider text-mgmt-on-surface-variant uppercase">
                      ID
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold tracking-wider text-mgmt-on-surface-variant uppercase">
                      Date &amp; time
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold tracking-wider text-mgmt-on-surface-variant uppercase">
                      Customer
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold tracking-wider text-mgmt-on-surface-variant uppercase">
                      Service
                    </th>
                    <th className="w-[1%] whitespace-nowrap px-4 py-3 text-right text-[11px] font-semibold tracking-wider text-mgmt-on-surface-variant uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-mgmt-outline-variant/10">
                  {items.map((item, index) => {
                    const timeZone = normalizeTimeZone(item.therapist.timezone);
                    const { display } = formatAppointmentRange(item.startAt, item.endAt, timeZone);
                    const isDeleting = deletingId === item.appointmentId;
                    const displayId = placeholderAppointmentDisplayId(index, safePage, pageSize);
                    return (
                      <tr
                        key={item.appointmentId}
                        className={cx(
                          "hover:bg-mgmt-surface-container-low/60",
                          isDeleting && "opacity-50",
                        )}
                      >
                        <td className="whitespace-nowrap px-4 py-4 text-sm font-medium tabular-nums text-mgmt-on-surface">
                          {displayId}
                        </td>
                        <td className="px-4 py-4 text-sm text-mgmt-on-surface">{display}</td>
                        <td className="px-4 py-4">
                          <p className="text-sm font-medium text-mgmt-on-surface">{item.client.fullName || "—"}</p>
                         <p className="text-xs text-mgmt-on-surface-variant">{item.client.email || "—"}</p>
                        </td>
                        <td className="px-4 py-4 text-xs text-mgmt-on-surface">{serviceLine(item)}</td>
                        <td className="relative whitespace-nowrap px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <ViewProofButton proofUrl={item.proofUrl} />
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
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <AppointmentsTablePagination
                totalResults={totalResults}
                page={safePage}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={(nextPageSize) => {
                  setPageSize(nextPageSize);
                  resetToFirstPage();
                }}
              />
            </div>

            <div className="space-y-4 lg:hidden">
              {items.map((item, index) => {
                const timeZone = normalizeTimeZone(item.therapist.timezone);
                const { display } = formatAppointmentRange(item.startAt, item.endAt, timeZone);
                const isDeleting = deletingId === item.appointmentId;
                const displayId = placeholderAppointmentDisplayId(index, safePage, pageSize);
                return (
                  <article
                    key={item.appointmentId}
                    className={cx(
                      "rounded-xl border border-mgmt-outline-variant/15 bg-white p-4 shadow-sm",
                      isDeleting && "opacity-50",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium tabular-nums text-mgmt-on-surface-variant">
                          ID {displayId}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-mgmt-on-surface">{item.client.fullName || "—"}</p>
                        <p className="mt-0.5 text-xs text-mgmt-on-surface-variant">{display}</p>
                        <p className="mt-2 text-xs text-mgmt-on-surface">{serviceLine(item)}</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <ViewProofButton proofUrl={item.proofUrl} />
                        <AppointmentActionsMenu
                        itemLabel={item.client.fullName || item.appointmentId}
                        open={actionsMenuId === item.appointmentId}
                        onOpenChange={(open) => setActionsMenuId(open ? item.appointmentId : null)}
                        onView={() => openAppointmentModal(item, "view")}
                        onEdit={() => openAppointmentModal(item, "edit")}
                        onDelete={() => void handleDelete(item)}
                      />
                      </div>
                    </div>
                  </article>
                );
              })}
              <div className="overflow-hidden rounded-xl border border-mgmt-outline-variant/15 bg-white">
                <AppointmentsTablePagination
                  totalResults={totalResults}
                  page={safePage}
                  pageSize={pageSize}
                  onPageChange={setPage}
                  onPageSizeChange={(nextPageSize) => {
                  setPageSize(nextPageSize);
                  resetToFirstPage();
                }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
