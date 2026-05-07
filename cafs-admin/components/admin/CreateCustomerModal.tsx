"use client";

import { useEffect, useMemo, useState } from "react";
import MaterialSymbol from "@/components/admin/MaterialSymbol";
import type { AdminCustomerProfile } from "@/components/admin/EditCustomerModal";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const EMPTY_PROFILE: AdminCustomerProfile = {
  id: "",
  fullName: "",
  phone: "",
  email: "",
  company: "",
  address: "",
  country: "Sri Lanka",
  avatarUrl: null,
};

export default function CreateCustomerModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (draft: Omit<AdminCustomerProfile, "id">) => void;
}) {
  const [draft, setDraft] = useState<AdminCustomerProfile>(EMPTY_PROFILE);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const canCreate = useMemo(() => {
    return Boolean(draft.fullName.trim() && draft.phone.trim());
  }, [draft.fullName, draft.phone]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-mgmt-inverse-surface/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Create customer"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-mgmt-surface-container-lowest shadow-2xl max-h-[calc(100vh-2rem)]">
        <div className="flex items-center justify-between border-b border-mgmt-surface-container px-8 py-6">
          <h2 className="text-xl font-bold tracking-tight text-mgmt-on-surface">Create customer</h2>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-mgmt-surface-container"
            onClick={onClose}
            aria-label="Close"
          >
            <MaterialSymbol name="close" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-10 py-8">
          <div className="mb-10 flex items-center gap-6">
            <div className="group relative">
              <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-mgmt-surface-container-low text-mgmt-on-surface-variant">
                <MaterialSymbol name="person" className="text-3xl" />
              </div>
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-2xl font-bold text-mgmt-on-surface">
                {draft.fullName.trim() || "New customer"}
              </h3>
              <p className="mt-1 text-sm text-mgmt-on-surface-variant">Add customer details</p>
            </div>
          </div>

          <form
            className="space-y-8"
            onSubmit={(e) => {
              e.preventDefault();
              if (!canCreate) return;
              // Drop `id` (assigned by parent on create).
              const { id, ...rest } = draft;
              void id;
              onCreate(rest);
              onClose();
            }}
          >
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="ml-1 block text-[0.75rem] font-semibold uppercase tracking-wider text-mgmt-on-surface-variant">
                  Full name
                </label>
                <input
                  className="w-full rounded-xl border-none bg-mgmt-surface-container-low px-4 py-3 text-sm text-mgmt-on-surface transition-all placeholder:text-mgmt-on-surface-variant focus:bg-mgmt-surface-container-lowest focus:ring-1 focus:ring-mgmt-primary focus:outline-none"
                  type="text"
                  value={draft.fullName}
                  onChange={(e) => setDraft((p) => ({ ...p, fullName: e.target.value }))}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <label className="ml-1 block text-[0.75rem] font-semibold uppercase tracking-wider text-mgmt-on-surface-variant">
                  Primary phone
                </label>
                <input
                  className="w-full rounded-xl border-none bg-mgmt-surface-container-low px-4 py-3 text-sm text-mgmt-on-surface transition-all placeholder:text-mgmt-on-surface-variant focus:bg-mgmt-surface-container-lowest focus:ring-1 focus:ring-mgmt-primary focus:outline-none"
                  type="tel"
                  value={draft.phone}
                  onChange={(e) => setDraft((p) => ({ ...p, phone: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="ml-1 block text-[0.75rem] font-semibold uppercase tracking-wider text-mgmt-on-surface-variant">
                  Primary email
                </label>
                <input
                  className="w-full rounded-xl border-none bg-mgmt-surface-container-low px-4 py-3 text-sm text-mgmt-on-surface transition-all placeholder:text-mgmt-on-surface-variant focus:bg-mgmt-surface-container-lowest focus:ring-1 focus:ring-mgmt-primary focus:outline-none"
                  placeholder="e.g. name@company.com"
                  type="email"
                  value={draft.email}
                  onChange={(e) => setDraft((p) => ({ ...p, email: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="ml-1 block text-[0.75rem] font-semibold uppercase tracking-wider text-mgmt-on-surface-variant">
                  Company
                </label>
                <input
                  className="w-full rounded-xl border-none bg-mgmt-surface-container-low px-4 py-3 text-sm text-mgmt-on-surface transition-all placeholder:text-mgmt-on-surface-variant focus:bg-mgmt-surface-container-lowest focus:ring-1 focus:ring-mgmt-primary focus:outline-none"
                  placeholder="Enter company name"
                  type="text"
                  value={draft.company}
                  onChange={(e) => setDraft((p) => ({ ...p, company: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="ml-1 block text-[0.75rem] font-semibold uppercase tracking-wider text-mgmt-on-surface-variant">
                Address
              </label>
              <textarea
                className="w-full resize-none rounded-xl border-none bg-mgmt-surface-container-low px-4 py-3 text-sm text-mgmt-on-surface transition-all placeholder:text-mgmt-on-surface-variant focus:bg-mgmt-surface-container-lowest focus:ring-1 focus:ring-mgmt-primary focus:outline-none"
                placeholder="Street address, apartment, suite, etc."
                rows={2}
                value={draft.address}
                onChange={(e) => setDraft((p) => ({ ...p, address: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <label className="ml-1 block text-[0.75rem] font-semibold uppercase tracking-wider text-mgmt-on-surface-variant">
                Country
              </label>
              <div className="relative">
                <select
                  className={cx(
                    "w-full appearance-none rounded-xl border-none bg-mgmt-surface-container-low px-4 py-3 text-sm text-mgmt-on-surface transition-all focus:bg-mgmt-surface-container-lowest focus:ring-1 focus:ring-mgmt-primary focus:outline-none",
                  )}
                  value={draft.country}
                  onChange={(e) => setDraft((p) => ({ ...p, country: e.target.value }))}
                >
                  {[
                    "Sri Lanka",
                    "United States",
                    "United Kingdom",
                    "Australia",
                    "India",
                    "Singapore",
                  ].map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <MaterialSymbol
                  name="expand_more"
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-mgmt-on-surface-variant"
                />
              </div>
            </div>
          </form>
        </div>

        <div className="flex items-center justify-end gap-4 bg-mgmt-surface-container-low px-8 py-6">
          <button
            type="button"
            className="px-6 py-2 text-sm font-semibold text-mgmt-on-surface-variant transition-colors hover:text-mgmt-on-surface"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-xl bg-gradient-to-br from-mgmt-primary to-mgmt-primary-dim px-8 py-3 text-sm font-bold text-mgmt-on-primary shadow-lg transition-all hover:opacity-90 active:scale-95 disabled:opacity-40"
            disabled={!canCreate}
            onClick={() => {
              if (!canCreate) return;
              const { id, ...rest } = draft;
              void id;
              onCreate(rest);
              onClose();
            }}
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

