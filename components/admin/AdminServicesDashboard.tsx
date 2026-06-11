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
    <main className="relative flex h-full min-h-0 flex-1 flex-col overflow-y-auto" data-purpose="main-content">
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

      <header className="sticky top-12 z-10 flex items-center justify-between bg-mgmt-surface-container-lowest px-4 py-5 sm:top-0 sm:px-6 lg:px-8 lg:py-6">
        <h1 className="text-2xl font-bold text-mgmt-on-surface">Service types</h1>
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

      <div className="mx-auto w-full max-w-6xl p-4 sm:p-6 lg:p-8 mt-12">
        {errorMsg ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMsg}
          </div>
        ) : null}
        <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4" data-purpose="filters">
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
              className="block w-full rounded-lg border border-mgmt-outline-variant bg-mgmt-surface-container-low py-2 pl-10 pr-3 text-sm text-mgmt-on-surface placeholder:text-mgmt-on-surface-variant focus:border-mgmt-primary focus:ring-2 focus:ring-mgmt-primary-container focus:outline-none"
              placeholder="Service types"
              type="search"
            />
          </div>
        </div>

        <div className="space-y-3" data-purpose="services-list">
          {loading ? (
            <p className="text-sm text-mgmt-on-surface-variant">Loading…</p>
          ) : null}
          {filtered.map((service) => (
            <div
              key={service.id}
              className={
                service.highlighted
                  ? "group flex items-center rounded-lg border-l-4 border-l-mgmt-primary-container bg-mgmt-surface-container-lowest p-4 transition-all hover:shadow-sm"
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
                  <span className="block text-sm font-semibold text-mgmt-on-surface">{service.title}</span>
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
                  aria-label={`More actions for ${service.title}`}
                >
                  <MoreIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-mgmt-on-surface-variant">No services match your search.</p>
          )}
        </div>
      </div>
    </main>
  );
}

