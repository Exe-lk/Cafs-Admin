"use client";

import { useEffect, useRef } from "react";
import MaterialSymbol from "@/components/admin/MaterialSymbol";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
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

export default function ListItemActionsMenu({
  itemLabel,
  open,
  onOpenChange,
  hidden = false,
  onEdit,
  onHiddenChange,
  onDelete,
}: {
  itemLabel: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hidden?: boolean;
  onEdit: () => void;
  onHiddenChange: (hidden: boolean) => void;
  onDelete: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onOpenChange(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open, onOpenChange]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className="rounded-lg p-1.5 text-mgmt-on-surface-variant transition-colors hover:bg-mgmt-surface-container-low hover:text-mgmt-on-surface"
        aria-label={`More actions for ${itemLabel}`}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MoreVerticalIcon className="h-4 w-4" />
      </button>

      {open ? (
        <div
          className="absolute right-0 top-full z-50 mt-1 w-52 overflow-hidden rounded-xl border border-mgmt-outline-variant/20 bg-white py-1 shadow-lg"
          role="menu"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onOpenChange(false);
              onEdit();
            }}
            className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-mgmt-on-surface transition-colors hover:bg-mgmt-surface-container-low"
          >
            <MaterialSymbol name="edit" className="text-[18px] text-mgmt-on-surface-variant" />
            Edit
          </button>

          <div className="my-1 border-t border-mgmt-outline-variant/20" aria-hidden />

          <div className="flex items-center justify-between gap-3 px-4 py-2.5">
            <div className="flex min-w-0 items-center gap-3">
              <MaterialSymbol name="visibility_off" className="text-[18px] text-mgmt-on-surface-variant" />
              <span className="text-sm text-mgmt-on-surface">Set to hidden</span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={hidden}
              aria-label={`Set ${itemLabel} to hidden`}
              onClick={() => onHiddenChange(!hidden)}
              className={cx(
                "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                hidden ? "bg-mgmt-on-surface" : "bg-mgmt-surface-container-high",
              )}
            >
              <span
                className={cx(
                  "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform",
                  hidden ? "left-5" : "left-0.5",
                )}
              />
            </button>
          </div>

          <div className="my-1 border-t border-mgmt-outline-variant/20" aria-hidden />

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onOpenChange(false);
              onDelete();
            }}
            className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-mgmt-on-surface transition-colors hover:bg-mgmt-surface-container-low"
          >
            <MaterialSymbol name="delete" className="text-[18px] text-mgmt-on-surface-variant" />
            Delete
          </button>
        </div>
      ) : null}
    </div>
  );
}
