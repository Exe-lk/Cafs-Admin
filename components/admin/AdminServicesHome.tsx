"use client";

import { useCallback, useMemo, useState } from "react";
import MaterialSymbol from "@/components/admin/MaterialSymbol";
import EditTherapistServiceModal, {
  type EditTherapistServiceModalItem,
} from "@/components/admin/EditTherapistServiceModal";

type ServiceItem = EditTherapistServiceModalItem & {
  highlighted?: boolean;
  therapistName: string;
};

type ServiceModalState = "closed" | "create" | ServiceItem;

const PLACEHOLDER_SERVICES: ServiceItem[] = [
  {
    id: "svc-001",
    title: "Couples Therapy(Online)",
    therapistName: "Dr. Anjali Perera",
    meta: "60 mins · Rs 4,500",
    categoryId: "cat-couples",
    therapistId: "th-001",
    description: "Online couples counselling focused on communication and conflict resolution.",
    highlighted: true,
  },
  {
    id: "svc-002",
    title: "Individual Therapy(In-person)",
    therapistName: "Dr. Ruwan Silva",
    meta: "50 mins · Rs 3,500",
    categoryId: "cat-individual",
    therapistId: "th-002",
    description: "One-on-one in-clinic session for anxiety, stress, and emotional wellbeing.",
    highlighted: false,
  },
  {
    id: "svc-003",
    title: "Psychological Assessment(Online)",
    therapistName: "Ms. Nethmi Fernando",
    meta: "90 mins · Rs 6,000",
    categoryId: "cat-assessment",
    therapistId: "th-003",
    description: "Structured online assessment with follow-up recommendations.",
    highlighted: false,
  },
  {
    id: "svc-004",
    title: "Group Session(In-person)",
    therapistName: "Dr. Anjali Perera",
    meta: "75 mins · Rs 2,500",
    categoryId: "cat-group",
    therapistId: "th-001",
    description: "Small-group therapeutic session for peer support and guided exercises.",
    highlighted: false,
  },
];

function serviceDisplayTitle(service: ServiceItem) {
  return `${service.title} by ${service.therapistName}`;
}

function therapistInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "T";
  if (parts.length === 1) return parts[0]!.slice(0, 1).toUpperCase();
  return `${parts[0]!.slice(0, 1)}${parts[parts.length - 1]!.slice(0, 1)}`.toUpperCase();
}

function therapistBookingSlug(name: string) {
  const cleaned = name.replace(/^(dr\.|ms\.|mr\.)\s*/i, "").trim();
  const first = cleaned.split(/\s+/).filter(Boolean)[0] ?? "therapist";
  return first.toLowerCase();
}

function LinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13.828 10.172a4 4 0 0 0-5.656 0l-4 4a4 4 0 1 0 5.656 5.656l1.102-1.101m-.758-4.899a4 4 0 0 0 5.656 0l4-4a4 4 0 0 0-5.656-5.656l-1.1 1.1"
      />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
      />
    </svg>
  );
}

function MoreIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20" aria-hidden>
      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
    </svg>
  );
}

const therapistFilterClass =
  "h-full min-w-0 flex-1 appearance-none border-none bg-transparent py-2 pl-2 pr-8 text-sm text-mgmt-on-surface outline-none";

export default function AdminServicesHome() {
  const [therapistFilter, setTherapistFilter] = useState("");
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pageLinkCopied, setPageLinkCopied] = useState(false);
  const [serviceModal, setServiceModal] = useState<ServiceModalState>("closed");
  const services = PLACEHOLDER_SERVICES;

  const therapistOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const service of services) {
      if (service.therapistId) map.set(service.therapistId, service.therapistName);
    }
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [services]);

  const activeTherapist = useMemo(() => {
    if (therapistFilter) {
      return therapistOptions.find((t) => t.id === therapistFilter) ?? therapistOptions[0];
    }
    return therapistOptions[0];
  }, [therapistFilter, therapistOptions]);

  const bookingPagePath = useMemo(() => {
    const slug = activeTherapist ? therapistBookingSlug(activeTherapist.name) : "book";
    if (typeof window === "undefined") return `book/${slug}`;
    return `${window.location.host}/book/${slug}`;
  }, [activeTherapist]);

  const copyPageLink = useCallback(async () => {
    const slug = activeTherapist ? therapistBookingSlug(activeTherapist.name) : "book";
    const url = `${window.location.origin}/book/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setPageLinkCopied(true);
      window.setTimeout(() => setPageLinkCopied(false), 2000);
    } catch {
      setPageLinkCopied(false);
    }
  }, [activeTherapist]);

  const copyLink = useCallback(async (id: string, slug: string) => {
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/book/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setCopiedId(null);
    }
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return services.filter((s) => {
      if (therapistFilter && s.therapistId !== therapistFilter) return false;
      if (!q) return true;
      const line = serviceDisplayTitle(s).toLowerCase();
      return line.includes(q) || s.meta.toLowerCase().includes(q);
    });
  }, [search, services, therapistFilter]);

  return (
    <main className="relative flex h-full min-h-0 flex-1 flex-col overflow-y-auto" data-purpose="main-content">
      {serviceModal !== "closed" ? (
        <EditTherapistServiceModal
          key={serviceModal === "create" ? "new-therapist-service" : serviceModal.id}
          service={serviceModal === "create" ? null : serviceModal}
          onClose={() => setServiceModal("closed")}
          onSaved={() => setServiceModal("closed")}
        />
      ) : null}

      <header className="sticky top-12 z-10 flex items-center justify-between bg-mgmt-surface-container-lowest px-4 py-5 sm:top-0 sm:px-6 lg:px-8 lg:py-6">
        <h1 className="text-2xl font-bold text-mgmt-on-surface">Services</h1>
        <div className="flex items-center gap-4">
          <button
            type="button"
            className="rounded-lg p-2 text-mgmt-on-surface-variant transition-colors hover:bg-mgmt-surface-container-low hover:text-mgmt-on-surface"
            aria-label="Share booking page"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setServiceModal("create")}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-mgmt-on-surface text-mgmt-surface-container-lowest shadow-md transition-transform hover:bg-mgmt-on-background active:scale-95"
            aria-label="Add service"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </header>

      <div className="mx-auto mt-12 w-full max-w-6xl p-4 sm:p-6 lg:p-8">
        <div
          className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-center sm:gap-4"
          data-purpose="filters"
        >
          <div className="relative flex h-10 min-w-0 items-center rounded-lg border border-mgmt-outline-variant bg-mgmt-surface-container-low sm:min-w-[220px] sm:max-w-[260px]">
            <span className="pointer-events-none flex shrink-0 items-center pl-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#E7E7E7] text-xs font-bold text-[#5F5F5F]">
                {therapistInitials(activeTherapist?.name ?? "Therapist")}
              </span>
            </span>
            <select
              value={therapistFilter}
              onChange={(e) => setTherapistFilter(e.target.value)}
              className={therapistFilterClass}
              aria-label="Filter by therapist"
            >
              <option value="">All therapists</option>
              {therapistOptions.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <MaterialSymbol
              name="expand_more"
              className="pointer-events-none absolute right-2 text-[20px] text-mgmt-on-surface-variant"
            />
          </div>

          <div className="relative min-w-0 flex-1 sm:min-w-[220px]">
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
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block h-10 w-full rounded-lg border border-mgmt-outline-variant bg-mgmt-surface-container-low py-2 pl-10 pr-3 text-sm text-mgmt-on-surface placeholder:text-mgmt-on-surface-variant focus:border-mgmt-primary focus:ring-2 focus:ring-mgmt-primary-container focus:outline-none"
              placeholder="Services"
              type="search"
            />
          </div>

          <button
            type="button"
            onClick={() => void copyPageLink()}
            className="inline-flex h-10 min-w-0 items-center gap-2 rounded-full bg-mgmt-surface-container-low px-3 text-sm text-mgmt-on-surface transition-colors hover:bg-mgmt-surface-container sm:ml-auto"
            aria-label="Copy booking page link"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#E7E7E7] text-xs font-bold text-[#5F5F5F]">
              {therapistInitials(activeTherapist?.name ?? "Therapist")}
            </span>
            <span className="min-w-0 truncate underline decoration-mgmt-outline-variant underline-offset-2">
              {pageLinkCopied ? "Copied" : bookingPagePath}
            </span>
            <LinkIcon className="h-4 w-4 shrink-0 text-mgmt-on-surface-variant" />
          </button>
        </div>

        <div className="space-y-3" data-purpose="services-list">
          {filtered.map((service) => (
            <div
              key={service.id}
              className={
                service.highlighted
                  ? "group flex items-center rounded-lg border-l-4 border-l-mgmt-primary bg-mgmt-surface-container-lowest p-4 transition-all hover:shadow-sm"
                  : "group flex items-center rounded-lg bg-mgmt-surface-container-lowest p-4 transition-all hover:shadow-sm"
              }
            >
              <button
                type="button"
                onClick={() => setServiceModal(service)}
                className="flex min-w-0 flex-1 items-center rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-mgmt-primary-container"
              >
                <span className="mr-4 flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-mgmt-surface-container-low">
                  <ClockIcon className="h-8 w-8 text-mgmt-on-surface-variant" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-mgmt-on-surface">
                    {serviceDisplayTitle(service)}
                  </span>
                  <span className="block text-xs text-mgmt-on-surface-variant">{service.meta}</span>
                </span>
              </button>
              <div className="flex shrink-0 items-center gap-3 sm:gap-6">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-mgmt-surface-container-low text-[10px] font-bold text-mgmt-on-surface-variant">
                  A
                </div>
                <button
                  type="button"
                  onClick={() => copyLink(service.id, service.id)}
                  className="hidden items-center gap-1 rounded-full border border-mgmt-outline-variant px-3 py-1.5 text-xs font-semibold text-mgmt-on-surface hover:bg-mgmt-surface-container-low sm:flex"
                >
                  <CopyIcon className="h-3.5 w-3.5" />
                  {copiedId === service.id ? "Copied" : "Copy link"}
                </button>
                <button
                  type="button"
                  onClick={() => copyLink(service.id, service.id)}
                  className="inline-flex items-center justify-center rounded-lg border border-mgmt-outline-variant p-2 text-mgmt-on-surface-variant hover:bg-mgmt-surface-container-low hover:text-mgmt-on-surface sm:hidden"
                  aria-label="Copy link"
                >
                  <CopyIcon className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="text-mgmt-on-surface-variant hover:text-mgmt-on-surface"
                  aria-label={`More actions for ${serviceDisplayTitle(service)}`}
                >
                  <MoreIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}
          {filtered.length === 0 ? (
            <p className="text-sm text-mgmt-on-surface-variant">No services match your search.</p>
          ) : null}
        </div>
      </div>
    </main>
  );
}
