"use client";

import { useEffect, useId, useMemo, useState } from "react";
import MaterialSymbol from "@/components/admin/MaterialSymbol";

export type ServiceCategoryServiceOption = {
  id: string;
  title: string;
  meta: string;
  accentColor: string;
  iconLabel?: string;
  iconImageUrl?: string;
};

const MOCK_SERVICES: ServiceCategoryServiceOption[] = [
  {
    id: "svc-exercise",
    title: "Online Consultation with Mohamed",
    meta: "55 mins · Free",
    accentColor: "#F4A4A4",
    iconLabel: "🌲",
  },
  {
    id: "svc-15",
    title: "15 Minutes Meeting",
    meta: "15 mins · Free",
    accentColor: "#9ED9D4",
    iconLabel: "🌲",
  },
  {
    id: "svc-30",
    title: "30 Minutes Meeting",
    meta: "30 mins · Free",
    accentColor: "#D9D9D9",
    iconLabel: "🌲",
  },
  {
    id: "svc-60",
    title: "1 Hour Meeting",
    meta: "60 mins · Free",
    accentColor: "#F5E6A8",
    iconLabel: "🌲",
  },
];

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function CategoryCheckbox({
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
      className={cx(
        "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border transition-colors",
        checked || indeterminate
          ? "border-mgmt-on-surface bg-mgmt-on-surface text-white"
          : "border-mgmt-outline-variant/50 bg-white hover:border-mgmt-outline-variant",
      )}
    >
      {checked ? (
        <MaterialSymbol name="check" className="text-[14px] leading-none" />
      ) : indeterminate ? (
        <span className="h-0.5 w-2.5 rounded-full bg-white" aria-hidden />
      ) : null}
    </button>
  );
}

export default function ServiceCategoryModal({
  onClose,
  onCreate,
  services = MOCK_SERVICES,
}: {
  onClose: () => void;
  onCreate?: (args: { title: string; serviceIds: string[] }) => void;
  services?: ServiceCategoryServiceOption[];
}) {
  const titleId = useId();
  const [categoryTitle, setCategoryTitle] = useState("");
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return services;
    return services.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.meta.toLowerCase().includes(q),
    );
  }, [query, services]);

  const filteredIds = useMemo(() => filtered.map((s) => s.id), [filtered]);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const allFilteredSelected =
    filteredIds.length > 0 && filteredIds.every((id) => selectedSet.has(id));
  const someFilteredSelected =
    filteredIds.some((id) => selectedSet.has(id)) && !allFilteredSelected;

  const canCreate = Boolean(categoryTitle.trim());

  function toggleAll() {
    if (allFilteredSelected) {
      setSelectedIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
      return;
    }
    const next = new Set(selectedIds);
    for (const id of filteredIds) next.add(id);
    setSelectedIds([...next]);
  }

  function toggleService(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function handleCreate() {
    if (!canCreate) return;
    onCreate?.({ title: categoryTitle.trim(), serviceIds: selectedIds });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-mgmt-inverse-surface/20"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-[101] flex max-h-[calc(100vh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-[0_10px_40px_-10px_rgba(47,51,52,0.2)]"
      >
        <div className="flex items-center justify-between border-b border-mgmt-outline-variant/10 px-6 py-5">
          <h2 id={titleId} className="text-xl font-bold text-mgmt-on-surface">
            New category
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-mgmt-on-surface-variant transition-colors hover:bg-mgmt-surface-container-low"
            aria-label="Close"
          >
            <MaterialSymbol name="close" className="text-xl" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-mgmt-on-surface">
              Title <span className="text-mgmt-on-surface">*</span>
            </label>
            <input
              value={categoryTitle}
              onChange={(e) => setCategoryTitle(e.target.value)}
              placeholder="Enter category title"
              className="h-12 w-full rounded-xl border-2 border-mgmt-on-surface bg-white px-4 text-sm text-mgmt-on-surface outline-none placeholder:text-mgmt-on-surface-variant/70 focus:border-mgmt-on-surface"
              autoFocus
            />
          </div>

          <div className="mt-8">
            <p className="mb-3 text-sm font-semibold text-mgmt-on-surface">Services</p>
            <div className="relative mb-4">
              <MaterialSymbol
                name="search"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-mgmt-on-surface-variant"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search"
                className="h-11 w-full rounded-xl border border-mgmt-outline-variant/25 bg-white pl-10 pr-4 text-sm text-mgmt-on-surface outline-none placeholder:text-mgmt-on-surface-variant focus:border-mgmt-outline-variant/50"
              />
            </div>

            <div className="mb-3 flex items-center justify-between gap-3">
              <label className="flex items-center gap-2.5 text-sm text-mgmt-on-surface">
                <CategoryCheckbox
                  checked={allFilteredSelected}
                  indeterminate={someFilteredSelected}
                  onChange={toggleAll}
                  ariaLabel="Select all services"
                />
                Select all
              </label>
              <span className="text-sm text-mgmt-on-surface-variant">
                {selectedIds.length}/{services.length}
              </span>
            </div>

            <ul className="space-y-3">
              {filtered.map((service) => {
                const checked = selectedSet.has(service.id);
                return (
                  <li key={service.id}>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleService(service.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          toggleService(service.id);
                        }
                      }}
                      className="flex w-full cursor-pointer overflow-hidden rounded-xl border border-mgmt-outline-variant/20 text-left transition-colors hover:bg-mgmt-surface-container-low/40"
                    >
                      <div
                        className="w-1.5 shrink-0"
                        style={{ backgroundColor: service.accentColor }}
                        aria-hidden
                      />
                      <div className="flex min-w-0 flex-1 items-center gap-3 px-3 py-3">
                        <CategoryCheckbox
                          checked={checked}
                          onChange={() => toggleService(service.id)}
                          ariaLabel={service.title}
                        />
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-mgmt-surface-container-low">
                          {service.iconImageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={service.iconImageUrl}
                              alt=""
                              className="h-6 w-6 object-contain"
                            />
                          ) : (
                            <span className="text-lg leading-none" aria-hidden>
                              {service.iconLabel ?? "S"}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-mgmt-on-surface">
                            {service.title}
                          </p>
                          <p className="truncate text-xs text-mgmt-on-surface-variant">
                            {service.meta}
                          </p>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <div className="flex items-center justify-end gap-4 border-t border-mgmt-outline-variant/10 px-6 py-5">
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-semibold text-mgmt-on-surface-variant transition-colors hover:text-mgmt-on-surface"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canCreate}
            onClick={handleCreate}
            className="rounded-full bg-mgmt-surface-container-high px-6 py-2.5 text-sm font-semibold text-mgmt-on-surface-variant transition-opacity disabled:opacity-50 enabled:bg-mgmt-on-surface enabled:text-mgmt-surface-container-lowest enabled:hover:opacity-90"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
