"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import MaterialSymbol from "@/components/admin/MaterialSymbol";
import ConfirmationModal from "@/components/admin/ConfirmationModal";
import EditServiceModal, { type EditServiceModalService } from "@/components/admin/EditServiceModal";
import EditTherapistServiceModal, {
  type EditTherapistServiceModalItem,
} from "@/components/admin/EditTherapistServiceModal";
import EditTherapistClassModal from "@/components/admin/EditTherapistClassModal";
import AddServiceOrClassMenu from "@/components/admin/AddServiceOrClassMenu";
import ListItemActionsMenu from "@/components/admin/ListItemActionsMenu";
import { useAdminServiceCategories } from "@/components/admin/useAdminServiceCategories";
import { notifyServiceCategoriesReload } from "@/components/admin/serviceCategories";
import { formatApiErrorMessage } from "@/lib/api/formatApiError";
import { serviceCategoryAccentBorderClass } from "@/lib/admin/serviceCategoryColors";

type ServiceItem = EditTherapistServiceModalItem & {
  highlighted?: boolean;
  therapistName: string;
};

type ServiceModalState = "closed" | "create" | ServiceItem;
type ClassModalState = "closed" | "create";

function formatPriceLkr(value: unknown): string {
  if (value == null || value === "") return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `Rs ${n.toLocaleString("en-LK")}`;
}

function formatServiceMeta(durationMinutes: unknown, priceLkr: unknown): string {
  const mins =
    typeof durationMinutes === "number" && Number.isFinite(durationMinutes)
      ? `${Math.floor(durationMinutes)} mins`
      : "—";
  return `${mins} · ${formatPriceLkr(priceLkr)}`;
}

function toOptionalNumber(value: unknown): number | undefined {
  if (value == null || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? Math.floor(n) : undefined;
}

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

function formatServiceTypeMeta(row: Record<string, unknown>): string {
  const mins = Number(row.default_duration_minutes ?? 60);
  const price =
    row.base_price_lkr == null ? "Free" : `LKR ${Number(row.base_price_lkr).toLocaleString()}`;
  return `${mins} mins · ${price}`;
}

function mapServiceTypeToModalItem(row: Record<string, unknown>): EditServiceModalService {
  return {
    id: String(row.service_id ?? ""),
    title: String(row.name ?? "—"),
    meta: formatServiceTypeMeta(row),
    description: typeof row.description === "string" ? row.description : "",
  };
}

export default function AdminServicesHome() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeCategoryId = searchParams.get("category")?.trim() || "";
  const { categories, reload: reloadCategories } = useAdminServiceCategories();
  const activeCategory = useMemo(
    () => categories.find((category) => category.id === activeCategoryId) ?? null,
    [categories, activeCategoryId],
  );
  const pageHeading = activeCategory?.label ?? "Services";
  const [therapistFilter, setTherapistFilter] = useState("");
  const [therapistMenuOpen, setTherapistMenuOpen] = useState(false);
  const therapistMenuRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pageLinkCopied, setPageLinkCopied] = useState(false);
  const [serviceModal, setServiceModal] = useState<ServiceModalState>("closed");
  const [classModal, setClassModal] = useState<ClassModalState>("closed");
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [allTherapists, setAllTherapists] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [actionsMenuId, setActionsMenuId] = useState<string | null>(null);
  const [hiddenById, setHiddenById] = useState<Record<string, boolean>>({});
  const [serviceTypeCatalog, setServiceTypeCatalog] = useState<
    Record<string, EditServiceModalService>
  >({});
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [categoryEditOpen, setCategoryEditOpen] = useState(false);
  const [categoryDeleteOpen, setCategoryDeleteOpen] = useState(false);
  const [serviceDeleteTarget, setServiceDeleteTarget] = useState<ServiceItem | null>(null);
  const categoryMenuRef = useRef<HTMLDivElement>(null);

  // Category edit/delete targets `services` rows (service types), not therapist_services.
  const categoryServiceForModal = useMemo(() => {
    if (!activeCategoryId) return null;
    return serviceTypeCatalog[activeCategoryId] ?? null;
  }, [activeCategoryId, serviceTypeCatalog]);

  const reload = useCallback(() => {
    const ac = new AbortController();
    setLoading(true);
    setErrorMsg(null);
    (async () => {
      try {
        const therapistServicesParams = new URLSearchParams({
          isActive: "true",
          includeService: "true",
        });
        if (activeCategoryId) {
          therapistServicesParams.set("categoryId", activeCategoryId);
        }

        const [therapistServicesRes, servicesRes, therapistsRes] = await Promise.all([
          fetch(`/api/v1/admin/therapist-services?${therapistServicesParams.toString()}`, {
            method: "GET",
            cache: "no-store",
            signal: ac.signal,
          }),
          fetch("/api/v1/admin/services", {
            method: "GET",
            cache: "no-store",
            signal: ac.signal,
          }),
          fetch("/api/v1/admin/therapists", {
            method: "GET",
            cache: "no-store",
            signal: ac.signal,
          }),
        ]);

        const therapistServicesJson = (await therapistServicesRes.json()) as {
          status?: string;
          message?: string;
          data?: { items?: Array<Record<string, unknown>> };
        };
        const servicesJson = (await servicesRes.json()) as {
          status?: string;
          data?: { items?: Array<Record<string, unknown>> };
        };
        const therapistsJson = (await therapistsRes.json()) as {
          status?: string;
          data?: { items?: Array<Record<string, unknown>> };
        };

        if (
          !therapistServicesRes.ok ||
          therapistServicesJson?.status !== "success" ||
          !therapistServicesJson?.data
        ) {
          throw new Error(
            therapistServicesJson?.message ||
              `Failed to load therapist services (HTTP ${therapistServicesRes.status})`,
          );
        }

        const serviceNameById = new Map<string, string>();
        const serviceDescriptionById = new Map<string, string>();
        const nextServiceTypeCatalog: Record<string, EditServiceModalService> = {};
        for (const row of servicesJson.data?.items ?? []) {
          const id = String(row.service_id ?? "");
          if (!id) continue;
          serviceNameById.set(id, String(row.name ?? "—"));
          nextServiceTypeCatalog[id] = mapServiceTypeToModalItem(row);
          if (typeof row.description === "string" && row.description.trim()) {
            serviceDescriptionById.set(id, row.description.trim());
          }
        }
        setServiceTypeCatalog(nextServiceTypeCatalog);

        const therapistNameById = new Map<string, string>();
        const nextTherapists: Array<{ id: string; name: string }> = [];
        for (const row of therapistsJson.data?.items ?? []) {
          const id = String(row.therapist_id ?? "");
          if (!id) continue;
          const profiles = row.profiles as { full_name?: string | null } | null | undefined;
          const name = String(profiles?.full_name ?? "—").trim() || "—";
          therapistNameById.set(id, name);
          nextTherapists.push({ id, name });
        }
        nextTherapists.sort((a, b) => a.name.localeCompare(b.name));
        setAllTherapists(nextTherapists);

        const next: ServiceItem[] = (therapistServicesJson.data.items ?? []).map((row) => {
          const serviceId = String(row.service_id ?? "");
          const therapistId = String(row.therapist_id ?? "");
          const joinedService = row.service as
            | { name?: string | null; description?: string | null }
            | null
            | undefined;
          const title =
            (typeof joinedService?.name === "string" && joinedService.name.trim()) ||
            serviceNameById.get(serviceId) ||
            "—";
          const description =
            (typeof joinedService?.description === "string" && joinedService.description.trim()) ||
            serviceDescriptionById.get(serviceId);
          return {
            id: String(row.therapist_service_id ?? ""),
            title,
            therapistName: therapistNameById.get(therapistId) ?? "—",
            meta: formatServiceMeta(row.duration_minutes, row.price_lkr),
            categoryId: serviceId || undefined,
            therapistId: therapistId || undefined,
            durationMinutes: toOptionalNumber(row.duration_minutes),
            priceLkr: toOptionalNumber(row.price_lkr),
            description,
          };
        });
        setServices(next.filter((item) => item.id));
      } catch (e) {
        if ((e as { name?: string })?.name === "AbortError") return;
        setErrorMsg(e instanceof Error ? e.message : "Failed to load services");
        setServices([]);
        setAllTherapists([]);
      } finally {
        setLoading(false);
      }
    })();
    return () => ac.abort();
  }, [activeCategoryId]);

  useEffect(() => {
    const cleanup = reload();
    return cleanup;
  }, [reload]);

  useEffect(() => {
    setTherapistFilter("");
    setSearch("");
    setActionsMenuId(null);
    setCategoryMenuOpen(false);
    setCategoryEditOpen(false);
    setCategoryDeleteOpen(false);
  }, [activeCategoryId]);

  useEffect(() => {
    if (!categoryMenuOpen) return;
    function handlePointerDown(e: MouseEvent) {
      if (categoryMenuRef.current && !categoryMenuRef.current.contains(e.target as Node)) {
        setCategoryMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [categoryMenuOpen]);

  const therapistOptions = allTherapists;

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
    return `book/${slug}`;
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
          key={
            serviceModal === "create"
              ? `new-therapist-service-${activeCategoryId || "all"}`
              : serviceModal.id
          }
          service={serviceModal === "create" ? null : serviceModal}
          defaultCategoryId={activeCategoryId || undefined}
          onClose={() => setServiceModal("closed")}
          onSaved={() => {
            setServiceModal("closed");
            reload();
          }}
        />
      ) : null}

      {classModal === "create" ? (
        <EditTherapistClassModal
          key="new-therapist-class-from-services"
          classItem={null}
          onClose={() => setClassModal("closed")}
          onSaved={() => {
            setClassModal("closed");
          }}
        />
      ) : null}

      {categoryEditOpen && categoryServiceForModal ? (
        <EditServiceModal
          key={categoryServiceForModal.id}
          service={categoryServiceForModal}
          onClose={() => setCategoryEditOpen(false)}
          onSaved={() => {
            setCategoryEditOpen(false);
            reload();
            reloadCategories();
            notifyServiceCategoriesReload();
          }}
        />
      ) : null}

      {categoryDeleteOpen && activeCategory ? (
        <ConfirmationModal
          title="Delete category"
          description={`Are you sure you want to delete "${activeCategory.label}"? This cannot be undone.`}
          confirmLabel="Yes, delete"
          onClose={() => setCategoryDeleteOpen(false)}
          onConfirm={async () => {
            const res = await fetch(
              `/api/v1/admin/services/${encodeURIComponent(activeCategoryId)}`,
              { method: "DELETE", cache: "no-store" },
            );
            const json = (await res.json()) as { status?: string; message?: string };
            if (!res.ok || json?.status !== "success") {
              setErrorMsg(json?.message || `Delete failed (HTTP ${res.status})`);
              return;
            }
            setCategoryDeleteOpen(false);
            reloadCategories();
            notifyServiceCategoriesReload();
            router.push("/admin/services");
          }}
        />
      ) : null}

      {serviceDeleteTarget ? (
        <ConfirmationModal
          title="Delete service"
          description={`Are you sure you want to delete "${serviceDisplayTitle(serviceDeleteTarget)}"? This cannot be undone.`}
          confirmLabel="Yes, delete"
          onClose={() => setServiceDeleteTarget(null)}
          onConfirm={async () => {
            const target = serviceDeleteTarget;
            const res = await fetch(
              `/api/v1/admin/therapist-services/${encodeURIComponent(target.id)}`,
              { method: "DELETE", cache: "no-store" },
            );
            const json = (await res.json()) as {
              status?: string;
              message?: string;
              errors?: Array<{ field?: string; message?: string }>;
            };
            if (!res.ok || json?.status !== "success") {
              setErrorMsg(
                formatApiErrorMessage(json, `Delete failed (HTTP ${res.status})`),
              );
              return;
            }
            setServiceDeleteTarget(null);
            setHiddenById((prev) => {
              const next = { ...prev };
              delete next[target.id];
              return next;
            });
            reload();
          }}
        />
      ) : null}

      <header className="sticky top-12 z-10 flex shrink-0 items-center justify-between gap-3 bg-mgmt-surface-container-lowest px-4 py-5 sm:top-0 sm:px-6 lg:px-8 lg:py-6">
        <h1 className="min-w-0 truncate text-xl font-bold text-mgmt-on-surface sm:text-2xl">
          {pageHeading}
        </h1>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {activeCategoryId ? (
            <div className="relative" ref={categoryMenuRef}>
              <button
                type="button"
                onClick={() => setCategoryMenuOpen((open) => !open)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-mgmt-on-surface transition-colors hover:bg-mgmt-surface-container-low"
                aria-label="Category options"
                aria-haspopup="menu"
                aria-expanded={categoryMenuOpen}
              >
                <MaterialSymbol name="more_vert" className="text-[22px]" />
              </button>

              {categoryMenuOpen ? (
                <div
                  className="absolute right-0 top-full z-50 mt-1 w-52 overflow-hidden rounded-xl border border-mgmt-outline-variant/20 bg-white py-1 shadow-lg"
                  role="menu"
                >
                  <button
                    type="button"
                    role="menuitem"
                    disabled={!categoryServiceForModal}
                    onClick={() => {
                      if (!categoryServiceForModal) return;
                      setCategoryMenuOpen(false);
                      setCategoryEditOpen(true);
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-mgmt-on-surface hover:bg-mgmt-surface-container-low disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <MaterialSymbol name="edit" className="text-[20px] text-mgmt-on-surface-variant" />
                    Edit
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setCategoryMenuOpen(false);
                      setCategoryDeleteOpen(true);
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-red-600 hover:bg-mgmt-surface-container-low"
                  >
                    <MaterialSymbol name="delete" className="text-[20px]" />
                    Delete
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
          <AddServiceOrClassMenu
            onAddService={() => setServiceModal("create")}
            onAddClass={() => setClassModal("create")}
          />
        </div>
      </header>

      <div className="px-4 pb-5 sm:px-6 lg:px-8">
        {errorMsg ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMsg}
          </div>
        ) : null}
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
        {loading ? <p className="text-sm text-mgmt-on-surface-variant">Loading…</p> : null}
        {filtered.map((service) => (
          <div
            key={service.id}
            className="group relative flex items-center justify-between rounded-lg border border-mgmt-outline-variant bg-mgmt-surface-container-lowest p-4 shadow-sm transition-colors hover:border-mgmt-on-surface-variant"
            data-purpose="service-list-item"
          >
            <div
              className={cx(
                "absolute inset-y-0 left-0 w-1 rounded-l-lg",
                serviceCategoryAccentBorderClass(service.title),
              )}
              aria-hidden
            />
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
                  setActionsMenuId(null);
                  setServiceDeleteTarget(service);
                }}
              />
            </div>
          </div>
        ))}
        {filtered.length === 0 && !loading ? (
          <p className="text-sm text-mgmt-on-surface-variant">
            {search.trim() || therapistFilter
              ? "No services match your search."
              : activeCategoryId
                ? `No services in ${activeCategory?.label ?? "this category"} yet.`
                : "No services yet."}
          </p>
        ) : null}
      </div>
    </main>
  );
}
