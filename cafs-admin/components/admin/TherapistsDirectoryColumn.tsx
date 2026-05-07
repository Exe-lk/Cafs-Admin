"use client";

import { useMemo, useState } from "react";
import MaterialSymbol from "@/components/admin/MaterialSymbol";
import { type AdminTherapistListItem, useAdminTherapists } from "@/components/admin/useAdminTherapists";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "T";
  const b = parts.length > 1 ? parts[parts.length - 1]![0] : "";
  return (a + b).toUpperCase();
}

export default function TherapistsDirectoryColumn({
  therapists,
  selectedId,
  onSelect,
  onAdd,
}: {
  therapists?: AdminTherapistListItem[];
  selectedId?: string;
  onSelect?: (t: AdminTherapistListItem) => void;
  onAdd?: () => void;
}) {
  const [query, setQuery] = useState("");
  const { therapists: fetched, loading, error } = useAdminTherapists();

  const list: AdminTherapistListItem[] = useMemo(() => {
    if (therapists) return therapists;
    return fetched;
  }, [fetched, therapists]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((t) => {
      return (
        t.name.toLowerCase().includes(q) ||
        t.email.toLowerCase().includes(q) ||
        (t.specialty ?? "").toLowerCase().includes(q) ||
        (t.status ?? "").toLowerCase().includes(q)
      );
    });
  }, [list, query]);

  return (
    <aside className="flex h-full min-h-0 w-full flex-col bg-mgmt-surface-container-lowest">
      <div className="sticky top-0 z-40 shrink-0 border-b border-mgmt-outline-variant/10 bg-mgmt-surface-container-lowest px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold uppercase tracking-widest text-mgmt-on-surface-variant">
            Therapists
          </h2>
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg bg-mgmt-surface-container-low px-3 py-2 text-xs font-semibold text-mgmt-on-surface transition-colors hover:bg-mgmt-surface-container"
            onClick={onAdd}
          >
            <MaterialSymbol name="person_add" className="text-[18px]" />
            Add
          </button>
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-xl bg-mgmt-surface-container-low px-3 py-2">
          <MaterialSymbol name="search" className="text-[18px] text-mgmt-on-surface-variant" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search therapists…"
            className="w-full bg-transparent text-sm text-mgmt-on-surface outline-none placeholder:text-mgmt-on-surface-variant"
          />
          {query.trim().length > 0 && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="rounded-md p-1 text-mgmt-on-surface-variant hover:bg-mgmt-surface-container"
              aria-label="Clear search"
            >
              <MaterialSymbol name="close" className="text-[18px]" />
            </button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="px-4 py-8 text-sm text-mgmt-on-surface-variant">
            Loading therapists…
          </div>
        ) : error ? (
          <div className="px-4 py-8 text-sm text-red-700">
            {error}
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-8 text-sm text-mgmt-on-surface-variant">
            No therapists found.
          </div>
        ) : (
          <ul className="space-y-1">
            {filtered.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => onSelect?.(t)}
                  className={[
                    "group flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors",
                    selectedId === t.id
                      ? "bg-mgmt-surface-container-low"
                      : "hover:bg-mgmt-surface-container-low",
                  ].join(" ")}
                >
                  <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-mgmt-primary-container text-sm font-bold text-mgmt-on-primary-container">
                    {initials(t.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className="truncate text-sm font-semibold text-mgmt-on-surface">{t.name}</p>
                      <span
                        className={
                          t.status === "Inactive"
                            ? "shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[0.65rem] font-bold text-slate-600"
                            : "shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[0.65rem] font-bold text-emerald-700"
                        }
                      >
                        {t.status ?? "Active"}
                      </span>
                    </div>
                    <p className="truncate text-[0.75rem] text-mgmt-on-surface-variant">
                      {t.specialty ?? "Therapist"} · {t.email}
                    </p>
                  </div>
                  <div className="mt-1 shrink-0 text-mgmt-on-surface-variant opacity-0 transition-opacity group-hover:opacity-100">
                    <MaterialSymbol name="chevron_right" className="text-[20px]" />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}

