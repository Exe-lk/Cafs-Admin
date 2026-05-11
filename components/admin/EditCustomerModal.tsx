"use client";

import { useEffect, useMemo, useState } from "react";
import MaterialSymbol from "@/components/admin/MaterialSymbol";

export type AdminCustomerProfile = {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  company: string;
  address: string;
  country: string;
  avatarUrl?: string | null;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function EditCustomerModal({
  customer,
  onClose,
  onSave,
  onDelete,
}: {
  customer: AdminCustomerProfile;
  onClose: () => void;
  onSave: (next: AdminCustomerProfile) => void;
  onDelete?: (customerId: string) => void;
}) {
  const [draft, setDraft] = useState<AdminCustomerProfile>(customer);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const canSave = useMemo(() => {
    return Boolean(draft.fullName.trim() && draft.phone.trim());
  }, [draft.fullName, draft.phone]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-mgmt-inverse-surface/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Edit customer"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-mgmt-surface-container-lowest shadow-2xl max-h-[calc(100vh-2rem)]">
        <div className="flex items-center justify-between border-b border-mgmt-surface-container px-8 py-6">
          <h2 className="text-xl font-bold tracking-tight text-mgmt-on-surface">Edit customer</h2>
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
            <div className="group relative cursor-pointer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt={draft.fullName}
                className="h-24 w-24 rounded-2xl object-cover"
                src={
                  draft.avatarUrl ??
                  "https://lh3.googleusercontent.com/aida-public/AB6AXuDjN3uTIfuPlx0Dt1s_EagwADw2kI_OhmB_5hLFT-2aBFJb8mhrLT7c9lrbXJfsRw12ktaCGsRW8dniQ33z7fkq31pnwVCPTL31t35EWELcX5WCnrnY12HTrq7ld12Q964u9bobR8C39SDTHxYEIiMCxcJrVzMw8TC4vJneVxg11L8C03kz3Q8kts5_p2qZ7OCsI2jFwbYQ3vjaBET0DT1Y5AcK3rI2iqgFQAJ1sYueMlV4W2nHqkwAKKFq5D3Zv2toqMzTr1r_H2o"
                }
              />
              <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-mgmt-inverse-surface/20 opacity-0 transition-opacity group-hover:opacity-100">
                <MaterialSymbol name="photo_camera" className="text-white" />
              </div>
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-2xl font-bold text-mgmt-on-surface">{draft.fullName}</h3>
              <p className="mt-1 text-sm text-mgmt-on-surface-variant">
                Update profile photo and customer details
              </p>
            </div>
          </div>

          <form
            className="space-y-8"
            onSubmit={(e) => {
              e.preventDefault();
              if (!canSave) return;
              onSave(draft);
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

        <div className="flex flex-wrap items-center justify-between gap-4 bg-mgmt-surface-container-low px-8 py-6">
          <div>
            {onDelete ? (
              <button
                type="button"
                className="rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-500/15 dark:text-red-400"
                onClick={() => {
                  const ok = window.confirm(
                    `Delete ${customer.fullName}? This action cannot be undone.`,
                  );
                  if (!ok) return;
                  onDelete(customer.id);
                  onClose();
                }}
              >
                Delete customer
              </button>
            ) : null}
          </div>

          <div className="flex items-center justify-end gap-4">
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
              disabled={!canSave}
              onClick={() => {
                if (!canSave) return;
                onSave(draft);
                onClose();
              }}
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

