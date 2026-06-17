"use client";

import { useMemo, useState } from "react";
import MaterialSymbol from "@/components/admin/MaterialSymbol";
import { SECONDARY_NAV_HEADING_CLASS } from "@/components/admin/secondaryNavLayout";
import { type AdminTherapistListItem, useAdminTherapists } from "@/components/admin/useAdminTherapists";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "T";
  const b = parts.length > 1 ? parts[parts.length - 1]![0] : "";
  return (a + b).toUpperCase();
}

function TeamCheckbox({
  checked,
  indeterminate,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? "mixed" : checked}
      aria-label={ariaLabel}
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      className={[
        "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border p-1.5 transition-colors",
        checked || indeterminate
          ? "border-mgmt-on-surface bg-mgmt-on-surface text-white"
          : "border-mgmt-outline-variant/40 bg-white hover:border-mgmt-outline-variant",
      ].join(" ")}
    >
      {checked ? (
        <MaterialSymbol name="check" className="text-[11px] leading-none" />
      ) : indeterminate ? (
        <span className="h-0.5 w-2 rounded-full bg-white" aria-hidden />
      ) : null}
    </button>
  );
}

function TherapistAvatar({ name }: { name: string }) {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E7E7E7] text-xs font-bold text-[#5F5F5F]">
      {initials(name)}
    </div>
  );
}

export default function TherapistsDirectoryColumn({
  therapists,
  selectedId,
  onSelect,
  selectedIds,
  onSelectedIdsChange,
  onAdd,
  onCollapse,
}: {
  therapists?: AdminTherapistListItem[];
  selectedId?: string;
  onSelect?: (t: AdminTherapistListItem) => void;
  selectedIds?: string[];
  onSelectedIdsChange?: (ids: string[]) => void;
  onAdd?: () => void;
  onCollapse?: () => void;
}) {
  const [query, setQuery] = useState("");
  const { therapists: fetched, loading, error } = useAdminTherapists();
  const multiSelect = Boolean(onSelectedIdsChange);

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

  const filteredIds = useMemo(() => filtered.map((t) => t.id), [filtered]);
  const selectedSet = useMemo(() => new Set(selectedIds ?? []), [selectedIds]);
  const allListIds = useMemo(() => list.map((t) => t.id), [list]);
  const allTeamSelected =
    allListIds.length > 0 && allListIds.every((id) => selectedSet.has(id));
  const allFilteredSelected =
    filteredIds.length > 0 && filteredIds.every((id) => selectedSet.has(id));
  const someFilteredSelected =
    filteredIds.some((id) => selectedSet.has(id)) && !allFilteredSelected;

  function toggleAllTeam() {
    if (!onSelectedIdsChange) return;
    const current = selectedIds ?? [];
    const hasSearch = query.trim().length > 0;

    if (hasSearch ? allFilteredSelected : allTeamSelected) {
      if (hasSearch) {
        onSelectedIdsChange(current.filter((id) => !filteredIds.includes(id)));
      } else {
        onSelectedIdsChange([]);
      }
      return;
    }

    const next = new Set(current);
    const idsToAdd = hasSearch ? filteredIds : allListIds;
    for (const id of idsToAdd) next.add(id);
    onSelectedIdsChange([...next]);
  }

  function toggleTherapist(id: string) {
    if (!onSelectedIdsChange) return;
    const current = selectedIds ?? [];
    if (current.includes(id)) {
      onSelectedIdsChange(current.filter((x) => x !== id));
    } else {
      onSelectedIdsChange([...current, id]);
    }
  }

  return (
    <aside className="flex h-full min-h-0 w-full flex-col bg-mgmt-surface-container-lowest">
      <div className="sticky top-0 z-40 shrink-0 border-b border-mgmt-outline-variant/10 bg-mgmt-surface-container-lowest px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className={SECONDARY_NAV_HEADING_CLASS}>{multiSelect ? "Team" : "Therapists"}</h2>
          <div className="flex shrink-0 items-center gap-1">
            {onAdd ? (
              <button
                type="button"
                onClick={onAdd}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-mgmt-on-surface text-mgmt-surface-container-lowest shadow-md transition-transform hover:bg-mgmt-on-background active:scale-95"
                aria-label="Add therapist"
              >
                <MaterialSymbol name="add" className="text-[22px]" />
              </button>
            ) : null}
            {onCollapse ? (
              <button
                type="button"
                onClick={onCollapse}
                className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg text-mgmt-on-surface-variant transition-colors hover:bg-mgmt-surface-container-low hover:text-mgmt-on-surface lg:inline-flex"
                aria-label="Hide team panel"
              >
                <MaterialSymbol name="chevron_left" className="text-[20px]" />
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-xl bg-mgmt-surface-container-low px-3 py-2">
          <MaterialSymbol name="search" className="text-[18px] text-mgmt-on-surface-variant" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
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
          <div className="px-4 py-8 text-sm text-mgmt-on-surface-variant">Loading therapists…</div>
        ) : error ? (
          <div className="px-4 py-8 text-sm text-red-700">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-8 text-sm text-mgmt-on-surface-variant">No therapists found.</div>
        ) : multiSelect ? (
          <ul className="space-y-0.5">
            <li>
              <div
                role="presentation"
                onClick={toggleAllTeam}
                className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-mgmt-surface-container-low"
              >
                <TeamCheckbox
                  checked={allTeamSelected}
                  indeterminate={!allTeamSelected && someFilteredSelected}
                  onChange={toggleAllTeam}
                  ariaLabel={`All team (${list.length})`}
                />
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E7E7E7] text-mgmt-on-surface-variant">
                  <MaterialSymbol name="groups" className="text-[20px]" />
                </div>
                <p className="min-w-0 flex-1 truncate text-sm font-semibold text-mgmt-on-surface">
                  All team ({list.length})
                </p>
              </div>
            </li>
            {filtered.map((t) => {
              const checked = selectedSet.has(t.id);
              return (
                <li key={t.id}>
                  <div
                    role="presentation"
                    onClick={() => toggleTherapist(t.id)}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-mgmt-surface-container-low"
                  >
                    <TeamCheckbox
                      checked={checked}
                      onChange={() => toggleTherapist(t.id)}
                      ariaLabel={t.name}
                    />
                    <TherapistAvatar name={t.name} />
                    <p className="min-w-0 flex-1 truncate text-sm font-semibold text-mgmt-on-surface">
                      {t.name}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
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
                  <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E7E7E7] text-sm font-bold text-[#5F5F5F]">
                    {initials(t.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className="truncate text-sm font-semibold text-mgmt-on-surface">{t.name}</p>
                      <span
                        className={
                          t.status === "Inactive"
                            ? "shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[0.65rem] font-bold text-slate-600"
                            : "shrink-0 rounded-full bg-[#F1F1F1] px-2 py-0.5 text-[0.65rem] font-bold text-slate-700"
                        }
                      >
                        {t.status ?? "Active"}
                      </span>
                    </div>
                    <p className="truncate text-[0.75rem] text-mgmt-on-surface-variant">
                      {t.specialty ?? "Therapist"}
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
