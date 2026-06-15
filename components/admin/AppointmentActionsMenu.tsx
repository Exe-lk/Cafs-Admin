"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import MaterialSymbol from "@/components/admin/MaterialSymbol";

function MoreVerticalIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="5" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="12" cy="19" r="1.5" />
    </svg>
  );
}

export default function AppointmentActionsMenu({
  itemLabel,
  open,
  onOpenChange,
  onView,
  onEdit,
  onDelete,
}: {
  itemLabel: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) {
      setMenuPosition(null);
      return;
    }

    function updatePosition() {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const menuWidth = 176;
      const left = Math.min(
        Math.max(8, rect.right - menuWidth),
        window.innerWidth - menuWidth - 8,
      );
      setMenuPosition({ top: rect.bottom + 4, left });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      onOpenChange(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open, onOpenChange]);

  const menu =
    open && menuPosition ? (
      <div
        ref={menuRef}
        className="fixed z-[200] w-44 overflow-hidden rounded-xl border border-mgmt-outline-variant/20 bg-white py-1 shadow-lg"
        style={{ top: menuPosition.top, left: menuPosition.left }}
        role="menu"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onOpenChange(false);
            onView();
          }}
          className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-mgmt-on-surface transition-colors hover:bg-mgmt-surface-container-low"
        >
          <MaterialSymbol name="visibility" className="text-[18px] text-mgmt-on-surface-variant" />
          View
        </button>
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
    ) : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onOpenChange(!open);
        }}
        className="rounded-lg p-1.5 text-mgmt-on-surface-variant transition-colors hover:bg-mgmt-surface-container-low hover:text-mgmt-on-surface"
        aria-label={`More actions for ${itemLabel}`}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MoreVerticalIcon className="h-4 w-4" />
      </button>

      {mounted && menu ? createPortal(menu, document.body) : null}
    </>
  );
}
