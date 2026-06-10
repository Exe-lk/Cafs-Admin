"use client";
import EditServiceModal from "@/components/admin/EditServiceModal";
import { useCallback, useEffect, useMemo, useState } from "react";

type ServiceItem = {
  id: string;
  title: string;
  meta: string;
  highlighted?: boolean;
};

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

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0 1 14 0z"
      />
    </svg>
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

function MoreVerticalIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="5" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="12" cy="19" r="1.5" />
    </svg>
  );
}

type ServiceModalState = "closed" | "create" | ServiceItem;

export default function AdminServicesDashboard() {
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [serviceModal, setServiceModal] = useState<ServiceModalState>("closed");
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
    return services.filter(
      (s) =>
        search.trim() === "" ||
        s.title.toLowerCase().includes(search.toLowerCase()) ||
        s.meta.toLowerCase().includes(search.toLowerCase()),
    );
  }, [search, services]);

  const reload = useCallback(() => {
    const ac = new AbortController();
    setLoading(true);
    setErrorMsg(null);
    (async () => {
      try {
        const res = await fetch("/api/v1/admin/services", {
          method: "GET",
          cache: "no-store",
          signal: ac.signal,
        });
        const json = (await res.json()) as any;
        if (!res.ok || json?.status !== "success" || !json?.data) {
          throw new Error(json?.message || `Failed to load services (HTTP ${res.status})`);
        }

        const items = (json.data.items ?? []) as Array<any>;
        const next: ServiceItem[] = items.map((s) => {
          const mins = Number(s.default_duration_minutes ?? 60);
          const price = s.base_price_lkr == null ? "Free" : `LKR ${Number(s.base_price_lkr).toLocaleString()}`;
          return {
            id: String(s.service_id),
            title: String(s.name ?? "—"),
            meta: `${mins} mins · ${price}`,
            highlighted: Boolean(s.is_active),
          };
        });
        setServices(next);
      } catch (e) {
        if ((e as any)?.name === "AbortError") return;
        setErrorMsg(e instanceof Error ? e.message : "Failed to load services");
        setServices([]);
      } finally {
        setLoading(false);
      }
    })();
    return () => ac.abort();
  }, []);

  useEffect(() => {
    const cleanup = reload();
    return cleanup;
  }, [reload]);

  return (
    <main
      className="relative flex h-full min-h-0 flex-1 flex-col overflow-y-auto bg-mgmt-surface-container-lowest"
      data-purpose="main-content"
    >
      {serviceModal !== "closed" ? (
        <EditServiceModal
          key={serviceModal === "create" ? "new-service" : serviceModal.id}
          service={serviceModal === "create" ? null : serviceModal}
          onClose={() => setServiceModal("closed")}
          onSaved={() => {
            setServiceModal("closed");
            reload();
          }}
        />
      ) : null}

      <header className="sticky top-12 z-10 flex shrink-0 items-center justify-between gap-3 bg-mgmt-surface-container-lowest px-4 py-5 sm:top-0 sm:px-6 lg:px-8 lg:py-6">
        <h1 className="min-w-0 truncate text-xl font-bold text-mgmt-on-surface sm:text-2xl">
          Service types
        </h1>
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
        {errorMsg ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMsg}
          </div>
        ) : null}
        <div className="relative w-full max-w-sm">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <SearchIcon className="h-4 w-4 text-mgmt-on-surface-variant" />
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="block w-full rounded-lg border border-mgmt-outline-variant py-2 pr-3 pl-10 text-sm text-mgmt-on-surface placeholder:text-mgmt-on-surface-variant focus:border-mgmt-on-surface-variant focus:ring-1 focus:ring-mgmt-outline-variant focus:outline-none"
            placeholder="Service types"
            type="search"
          />
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
                <span className="block text-sm font-semibold text-mgmt-on-surface">{service.title}</span>
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
              <button
                type="button"
                className="rounded-lg p-1.5 text-mgmt-on-surface-variant hover:text-mgmt-on-surface"
                aria-label={`More actions for ${service.title}`}
              >
                <MoreVerticalIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-mgmt-on-surface-variant">No services match your search.</p>
        )}
      </div>
    </main>
  );
}

