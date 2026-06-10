"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import EditClassModal, { type EditClassModalClass } from "@/components/admin/EditClassModal";

type ClassItem = EditClassModalClass;

type ClassModalState = "closed" | "create" | ClassItem;

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

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 16v1a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
      />
    </svg>
  );
}

function ListIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"
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

export default function AdminClassesDashboard() {
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [classModal, setClassModal] = useState<ClassModalState>("closed");
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const copyLink = useCallback(async (id: string, slug: string) => {
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/book/class/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setCopiedId(null);
    }
  }, []);

  const filtered = useMemo(() => {
    return classes.filter(
      (c) =>
        search.trim() === "" ||
        c.title.toLowerCase().includes(search.toLowerCase()) ||
        c.meta.toLowerCase().includes(search.toLowerCase()),
    );
  }, [classes, search]);

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
          throw new Error(json?.message || `Failed to load classes (HTTP ${res.status})`);
        }

        const items = (json.data.items ?? []) as Array<any>;
        const next: ClassItem[] = items.map((s) => {
          const mins = Number(s.default_duration_minutes ?? 60);
          const price = s.base_price_lkr == null ? "Free" : `LKR ${Number(s.base_price_lkr).toLocaleString()}`;
          return {
            id: String(s.service_id),
            title: String(s.name ?? "—"),
            meta: `${mins} mins · ${price}`,
          };
        });
        setClasses(next);
      } catch (e) {
        if ((e as any)?.name === "AbortError") return;
        setErrorMsg(e instanceof Error ? e.message : "Failed to load classes");
        setClasses([]);
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
      {classModal !== "closed" ? (
        <EditClassModal
          key={classModal === "create" ? "new-class" : classModal.id}
          classItem={classModal === "create" ? null : classModal}
          onClose={() => setClassModal("closed")}
          onSaved={() => {
            setClassModal("closed");
            reload();
          }}
        />
      ) : null}

      <header className="sticky top-12 z-10 flex shrink-0 items-center justify-between gap-3 bg-mgmt-surface-container-lowest px-4 py-5 sm:top-0 sm:px-6 lg:px-8 lg:py-6">
        <h1 className="min-w-0 truncate text-xl font-bold text-mgmt-on-surface sm:text-2xl">
          Class types
        </h1>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            className="rounded-lg p-2 text-mgmt-on-surface-variant transition-colors hover:bg-mgmt-surface-container-low hover:text-mgmt-on-surface"
            aria-label="Upload"
          >
            <UploadIcon className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={() => setClassModal("create")}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-mgmt-on-surface text-mgmt-surface-container-lowest shadow-md transition-transform hover:bg-mgmt-on-background active:scale-95"
            aria-label="Add class"
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
            placeholder="Classes"
            type="search"
          />
        </div>
      </div>

      <div className="space-y-4 px-4 pb-8 sm:px-6 lg:px-8">
        {loading ? <p className="text-sm text-mgmt-on-surface-variant">Loading…</p> : null}
        {filtered.map((item) => (
          <div
            key={item.id}
            className="group relative flex items-center justify-between rounded-lg border border-mgmt-outline-variant bg-mgmt-surface-container-lowest p-4 shadow-sm transition-colors hover:border-mgmt-on-surface-variant"
            data-purpose="class-list-item"
          >
            <div className="absolute inset-y-0 left-0 w-1 rounded-l-lg bg-red-500" aria-hidden />
            <button
              type="button"
              onClick={() => setClassModal(item)}
              className="flex min-w-0 flex-1 items-center gap-4 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-mgmt-primary-container"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-mgmt-outline-variant bg-mgmt-surface-container-low">
                <ListIcon className="h-5 w-5 text-mgmt-on-surface-variant" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-mgmt-on-surface">{item.title}</span>
                <span className="block text-xs text-mgmt-on-surface-variant">{item.meta}</span>
              </span>
            </button>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => copyLink(item.id, item.id)}
                className="hidden items-center gap-2 rounded-full border border-mgmt-outline-variant px-3 py-1.5 text-xs font-medium text-mgmt-on-surface hover:bg-mgmt-surface-container-low sm:flex"
              >
                <LinkIcon className="h-3.5 w-3.5" />
                <span>{copiedId === item.id ? "Copied" : "Copy link"}</span>
              </button>
              <button
                type="button"
                onClick={() => copyLink(item.id, item.id)}
                className="inline-flex items-center justify-center rounded-lg border border-mgmt-outline-variant p-2 text-mgmt-on-surface-variant hover:bg-mgmt-surface-container-low hover:text-mgmt-on-surface sm:hidden"
                aria-label="Copy link"
              >
                <LinkIcon className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="rounded-lg p-1.5 text-mgmt-on-surface-variant hover:text-mgmt-on-surface"
                aria-label={`More actions for ${item.title}`}
              >
                <MoreVerticalIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-sm text-mgmt-on-surface-variant">No classes match your search.</p>}
      </div>
    </main>
  );
}

