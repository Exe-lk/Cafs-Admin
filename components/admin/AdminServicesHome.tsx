"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MaterialSymbol from "@/components/admin/MaterialSymbol";
import EditTherapistServiceModal, {
  type EditTherapistServiceModalItem,
} from "@/components/admin/EditTherapistServiceModal";
import ListItemActionsMenu from "@/components/admin/ListItemActionsMenu";

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

function therapistDisplayLabel(name: string) {
  return `${name} (${therapistInitials(name)})`;
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function LetterAvatar({ label, className }: { label: string; className?: string }) {
  return (
    <span
      className={cx(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E7E7E7] text-xs font-bold text-[#5F5F5F]",
        className,
      )}
    >
      {label}
    </span>
  );
}

function CafsTeamAvatar({ className }: { className?: string }) {
  return (
    <span
      className={cx(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0d9488] text-[0.55rem] font-bold tracking-tight text-white",
        className,
      )}
    >
      CAFS
    </span>
  );
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

export default function AdminServicesHome() {
  const [therapistFilter, setTherapistFilter] = useState("");
  const [therapistMenuOpen, setTherapistMenuOpen] = useState(false);
  const therapistMenuRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pageLinkCopied, setPageLinkCopied] = useState(false);
  const [serviceModal, setServiceModal] = useState<ServiceModalState>("closed");
  const [services, setServices] = useState<ServiceItem[]>(PLACEHOLDER_SERVICES);
  const [actionsMenuId, setActionsMenuId] = useState<string | null>(null);
  const [hiddenById, setHiddenById] = useState<Record<string, boolean>>({});

  const therapistOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const service of services) {
      if (service.therapistId) map.set(service.therapistId, service.therapistName);
    }
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [services]);

  const selectedTherapist = useMemo(
    () => therapistOptions.find((t) => t.id === therapistFilter) ?? null,
    [therapistFilter, therapistOptions],
  );

  const activeTherapist = selectedTherapist ?? therapistOptions[0];

  useEffect(() => {
    if (!therapistMenuOpen) return;
    function handlePointerDown(e: MouseEvent) {
      if (therapistMenuRef.current && !therapistMenuRef.current.contains(e.target as Node)) {
        setTherapistMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [therapistMenuOpen]);

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
    <main
      className="relative flex h-full min-h-0 flex-1 flex-col overflow-y-auto bg-mgmt-surface-container-lowest"
      data-purpose="main-content"
    >
      {serviceModal !== "closed" ? (
        <EditTherapistServiceModal
          key={serviceModal === "create" ? "new-therapist-service" : serviceModal.id}
          service={serviceModal === "create" ? null : serviceModal}
          onClose={() => setServiceModal("closed")}
          onSaved={() => setServiceModal("closed")}
        />
      ) : null}

      <header className="sticky top-12 z-10 flex shrink-0 items-center justify-between gap-3 bg-mgmt-surface-container-lowest px-4 py-5 sm:top-0 sm:px-6 lg:px-8 lg:py-6">
        <h1 className="min-w-0 truncate text-xl font-bold text-mgmt-on-surface sm:text-2xl">Services</h1>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
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

      <div className="px-4 pb-5 sm:px-6 lg:px-8">
        <div
          className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4"
          data-purpose="filters"
        >
          <div className="relative min-w-0 sm:min-w-[240px] sm:max-w-[320px]" ref={therapistMenuRef}>
            <button
              type="button"
              onClick={() => setTherapistMenuOpen((open) => !open)}
              className="flex h-10 w-full min-w-0 items-center gap-2 rounded-lg border border-mgmt-outline-variant bg-white px-3 text-left transition-colors hover:bg-mgmt-surface-container-low"
              aria-label="Filter by therapist"
              aria-haspopup="menu"
              aria-expanded={therapistMenuOpen}
            >
              {selectedTherapist ? (
                <LetterAvatar label={therapistInitials(selectedTherapist.name)} className="h-7 w-7 text-[11px]" />
              ) : (
                <CafsTeamAvatar className="h-7 w-7 text-[0.5rem]" />
              )}
              <span className="min-w-0 flex-1 truncate text-sm text-mgmt-on-surface">
                {selectedTherapist ? therapistDisplayLabel(selectedTherapist.name) : "Team"}
              </span>
              <MaterialSymbol
                name="expand_more"
                className={cx(
                  "shrink-0 text-[20px] text-mgmt-on-surface-variant transition-transform",
                  therapistMenuOpen && "rotate-180",
                )}
              />
            </button>

            {therapistMenuOpen ? (
              <div
                className="absolute left-0 top-full z-50 mt-2 w-[min(100%,20rem)] overflow-hidden rounded-xl border border-mgmt-outline-variant/20 bg-white p-2 shadow-lg"
                role="menu"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setTherapistFilter("");
                    setTherapistMenuOpen(false);
                  }}
                  className={cx(
                    "flex w-full items-center gap-2 rounded-lg px-2 py-2.5 text-left text-sm transition-colors",
                    therapistFilter === ""
                      ? "text-mgmt-on-surface"
                      : "text-mgmt-on-surface hover:bg-[#F0F0F0]",
                  )}
                >
                  <span className="flex w-5 shrink-0 items-center justify-center">
                    {therapistFilter === "" ? (
                      <MaterialSymbol name="check" className="text-[18px] text-mgmt-on-surface" />
                    ) : null}
                  </span>
                  <CafsTeamAvatar />
                  <span className="min-w-0 truncate font-medium">Team</span>
                </button>

                <div className="my-2 border-t border-mgmt-outline-variant/25" aria-hidden />

                {therapistOptions.map((t) => {
                  const isSelected = therapistFilter === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setTherapistFilter(t.id);
                        setTherapistMenuOpen(false);
                      }}
                      className={cx(
                        "flex w-full items-center gap-2 rounded-lg px-2 py-2.5 text-left text-sm transition-colors",
                        isSelected ? "text-mgmt-on-surface" : "text-mgmt-on-surface hover:bg-[#F0F0F0]",
                      )}
                    >
                      <span className="flex w-5 shrink-0 items-center justify-center">
                        {isSelected ? (
                          <MaterialSymbol name="check" className="text-[18px] text-mgmt-on-surface" />
                        ) : null}
                      </span>
                      <LetterAvatar label={therapistInitials(t.name)} />
                      <span className="min-w-0 truncate">{therapistDisplayLabel(t.name)}</span>
                    </button>
                  );
                })}
              </div>
            ) : null}
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
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-full rounded-lg border border-mgmt-outline-variant py-2 pr-3 pl-10 text-sm text-mgmt-on-surface placeholder:text-mgmt-on-surface-variant focus:border-mgmt-on-surface-variant focus:ring-1 focus:ring-mgmt-outline-variant focus:outline-none"
              placeholder="Services"
              type="search"
            />
          </div>

          <button
            type="button"
            onClick={() => void copyPageLink()}
            className="inline-flex h-10 min-w-0 items-center gap-2 rounded-full border border-mgmt-outline-variant bg-white px-3 text-sm text-mgmt-on-surface transition-colors hover:bg-mgmt-surface-container-low sm:ml-auto"
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

      </div>

      <div className="space-y-4 px-4 pb-8 sm:px-6 lg:px-8" data-purpose="services-list">
        {filtered.map((service) => (
          <div
            key={service.id}
            className="group relative flex items-center justify-between rounded-lg border border-mgmt-outline-variant bg-mgmt-surface-container-lowest p-4 shadow-sm transition-colors hover:border-mgmt-on-surface-variant"
            data-purpose="service-list-item"
          >
            <div className="absolute inset-y-0 left-0 w-1 rounded-l-lg bg-red-500" aria-hidden />
            <button
              type="button"
              onClick={() => setServiceModal(service)}
              className="flex min-w-0 flex-1 items-center gap-4 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-mgmt-primary-container"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-mgmt-outline-variant bg-mgmt-surface-container-low">
                <ClockIcon className="h-5 w-5 text-mgmt-on-surface-variant" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-mgmt-on-surface">
                  {serviceDisplayTitle(service)}
                </span>
                <span className="block text-xs text-mgmt-on-surface-variant">{service.meta}</span>
              </span>
            </button>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => copyLink(service.id, service.id)}
                className="hidden items-center gap-2 rounded-full border border-mgmt-outline-variant px-3 py-1.5 text-xs font-medium text-mgmt-on-surface hover:bg-mgmt-surface-container-low sm:flex"
              >
                <LinkIcon className="h-3.5 w-3.5" />
                <span>{copiedId === service.id ? "Copied" : "Copy link"}</span>
              </button>
              <button
                type="button"
                onClick={() => copyLink(service.id, service.id)}
                className="inline-flex items-center justify-center rounded-lg border border-mgmt-outline-variant p-2 text-mgmt-on-surface-variant hover:bg-mgmt-surface-container-low hover:text-mgmt-on-surface sm:hidden"
                aria-label="Copy link"
              >
                <LinkIcon className="h-4 w-4" />
              </button>
              <ListItemActionsMenu
                itemLabel={serviceDisplayTitle(service)}
                open={actionsMenuId === service.id}
                onOpenChange={(open) => setActionsMenuId(open ? service.id : null)}
                hidden={Boolean(hiddenById[service.id])}
                onEdit={() => setServiceModal(service)}
                onHiddenChange={(hidden) =>
                  setHiddenById((prev) => ({ ...prev, [service.id]: hidden }))
                }
                onDelete={() => {
                  if (!window.confirm(`Delete "${serviceDisplayTitle(service)}"?`)) return;
                  setServices((prev) => prev.filter((s) => s.id !== service.id));
                  setHiddenById((prev) => {
                    const next = { ...prev };
                    delete next[service.id];
                    return next;
                  });
                }}
              />
            </div>
          </div>
        ))}
        {filtered.length === 0 ? (
          <p className="text-sm text-mgmt-on-surface-variant">No services match your search.</p>
        ) : null}
      </div>
    </main>
  );
}
