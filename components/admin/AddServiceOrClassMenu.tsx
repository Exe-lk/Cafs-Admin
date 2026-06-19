"use client";

import { useEffect, useRef, useState } from "react";

export default function AddServiceOrClassMenu({
  onAddService,
  onAddClass,
}: {
  onAddService: () => void;
  onAddClass: () => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-mgmt-on-surface text-mgmt-surface-container-lowest shadow-md transition-transform hover:bg-mgmt-on-background active:scale-95"
        aria-label="Add service or class"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {open ? (
        <div
          className="absolute right-0 top-full z-50 mt-1 w-40 overflow-hidden rounded-xl border border-mgmt-outline-variant/20 bg-white py-1 shadow-lg"
          role="menu"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onAddService();
            }}
            className="flex w-full px-4 py-2.5 text-left text-sm text-mgmt-on-surface transition-colors hover:bg-mgmt-surface-container-low"
          >
            Service
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onAddClass();
            }}
            className="flex w-full px-4 py-2.5 text-left text-sm text-mgmt-on-surface transition-colors hover:bg-mgmt-surface-container-low"
          >
            Class
          </button>
        </div>
      ) : null}
    </div>
  );
}
