"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import MaterialSymbol from "@/components/admin/MaterialSymbol";

export type SearchableSelectOption = {
  value: string;
  label: string;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function SearchableSelect({
  id,
  value,
  onChange,
  options,
  placeholder = "Select…",
  disabled = false,
  loading = false,
  emptyLabel = "No matches",
  ariaLabel,
  className,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  emptyLabel?: string;
  ariaLabel?: string;
  className?: string;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = useMemo(
    () => options.find((option) => option.value === value),
    [options, value],
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return options;
    return options.filter((option) => option.label.toLowerCase().includes(normalized));
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!value) setQuery("");
  }, [value]);

  const inactive = disabled || loading;
  const inputPlaceholder = loading ? "Loading…" : placeholder;

  return (
    <div ref={rootRef} className={cx("relative", className)}>
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-label={ariaLabel}
          disabled={inactive}
          value={open ? query : (selected?.label ?? "")}
          placeholder={inputPlaceholder}
          className={cx(
            "h-10 w-full rounded-lg bg-mgmt-surface-container-low py-2 pl-3 pr-9 text-sm text-mgmt-on-surface outline-none ring-1 ring-transparent focus:ring-mgmt-primary/30 disabled:opacity-60",
            !open && !selected && "text-mgmt-on-surface-variant",
          )}
          onChange={(event) => {
            setQuery(event.target.value);
            if (!open) setOpen(true);
            if (value) onChange("");
          }}
          onFocus={() => {
            if (inactive) return;
            setOpen(true);
            setQuery(selected?.label ?? "");
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
              setQuery("");
              inputRef.current?.blur();
            }
          }}
        />
        <MaterialSymbol
          name={open ? "expand_less" : "expand_more"}
          className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xl text-mgmt-on-surface-variant"
        />
      </div>

      {open && !inactive ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-[110] mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-mgmt-outline-variant/15 bg-white py-1 shadow-[0_10px_40px_-10px_rgba(47,51,52,0.15)]"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-mgmt-on-surface-variant">{emptyLabel}</li>
          ) : (
            filtered.map((option) => {
              const isSelected = option.value === value;
              return (
                <li key={option.value} role="option" aria-selected={isSelected}>
                  <button
                    type="button"
                    className={cx(
                      "flex w-full items-center px-3 py-2 text-left text-sm transition-colors hover:bg-mgmt-surface-container-low",
                      isSelected
                        ? "font-semibold text-mgmt-primary"
                        : "text-mgmt-on-surface",
                    )}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      onChange(option.value);
                      setQuery("");
                      setOpen(false);
                      inputRef.current?.blur();
                    }}
                  >
                    {option.label}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      ) : null}
    </div>
  );
}
