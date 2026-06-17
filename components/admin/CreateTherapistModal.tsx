"use client";

import { useEffect, useMemo, useState } from "react";
import MaterialSymbol from "@/components/admin/MaterialSymbol";
import type { AdminTherapistProfile } from "@/components/admin/EditTherapistProfileModal";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const EMPTY_PROFILE: AdminTherapistProfile = {
  id: "",
  fullName: "",
  phoneCountry: "+94",
  phoneNumber: "",
  email: "",
  specialization: "",
  aboutYou: "",
  hidden: false,
};

export default function CreateTherapistModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (draft: Omit<AdminTherapistProfile, "id">) => void | Promise<void>;
}) {
  const [draft, setDraft] = useState<AdminTherapistProfile>(EMPTY_PROFILE);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const canSave = useMemo(() => {
    return Boolean(draft.fullName.trim() && draft.email.trim());
  }, [draft.email, draft.fullName]);

  async function handleCreate() {
    if (!canSave || submitting) return;
    const { id, ...rest } = draft;
    void id;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await onCreate(rest);
      onClose();
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Failed to create therapist");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-mgmt-inverse-surface/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Create therapist profile"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-mgmt-surface-container-lowest shadow-2xl max-h-[calc(100vh-2rem)]">
        <div className="flex items-center justify-between border-b border-mgmt-surface-container px-5 py-4 sm:px-8 sm:py-6">
          <h2 className="text-xl font-bold tracking-tight text-mgmt-on-surface">Add therapist</h2>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-mgmt-surface-container"
            onClick={onClose}
            aria-label="Close"
          >
            <MaterialSymbol name="close" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-10 sm:py-8">
          {errorMsg ? (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMsg}
            </div>
          ) : null}
          <form
            className="space-y-8"
            onSubmit={(e) => {
              e.preventDefault();
              void handleCreate();
            }}
          >
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="ml-1 block text-[0.75rem] font-semibold uppercase tracking-wider text-mgmt-on-surface-variant">
                  Full name
                </label>
                <input
                  className="w-full rounded-xl border-none bg-mgmt-surface-container-low px-4 py-3 text-sm text-mgmt-on-surface transition-all placeholder:text-mgmt-on-surface-variant focus:bg-mgmt-surface-container-lowest focus:ring-1 focus:ring-mgmt-primary focus:outline-none"
                  value={draft.fullName}
                  onChange={(e) => setDraft((p) => ({ ...p, fullName: e.target.value }))}
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <label className="ml-1 block text-[0.75rem] font-semibold uppercase tracking-wider text-mgmt-on-surface-variant">
                  Primary phone
                </label>
                <div className="flex items-center gap-3 rounded-xl bg-mgmt-surface-container-low px-4 py-3">
                  <MaterialSymbol name="flag" className="text-[14px] text-mgmt-on-surface-variant" />
                  <input
                    className="w-14 border-none bg-transparent text-sm text-mgmt-on-surface outline-none"
                    value={draft.phoneCountry}
                    onChange={(e) => setDraft((p) => ({ ...p, phoneCountry: e.target.value }))}
                    aria-label="Country code"
                  />
                  <div className="h-4 w-px bg-mgmt-outline-variant/60" />
                  <input
                    className="min-w-0 flex-1 border-none bg-transparent text-sm text-mgmt-on-surface outline-none"
                    value={draft.phoneNumber}
                    onChange={(e) => setDraft((p) => ({ ...p, phoneNumber: e.target.value }))}
                    aria-label="Phone number"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="ml-1 block text-[0.75rem] font-semibold uppercase tracking-wider text-mgmt-on-surface-variant">
                  Primary email
                </label>
                <input
                  className="w-full rounded-xl border-none bg-mgmt-surface-container-low px-4 py-3 text-sm text-mgmt-on-surface transition-all placeholder:text-mgmt-on-surface-variant focus:bg-mgmt-surface-container-lowest focus:ring-1 focus:ring-mgmt-primary focus:outline-none"
                  value={draft.email}
                  onChange={(e) => setDraft((p) => ({ ...p, email: e.target.value }))}
                  inputMode="email"
                />
              </div>

              <div className="space-y-2">
                <label className="ml-1 block text-[0.75rem] font-semibold uppercase tracking-wider text-mgmt-on-surface-variant">
                  Specialization
                </label>
                <div className="relative">
                  <select
                    className={cx(
                      "w-full appearance-none rounded-xl border-none bg-mgmt-surface-container-low px-4 py-3 pr-10 text-sm text-mgmt-on-surface transition-all focus:bg-mgmt-surface-container-lowest focus:ring-1 focus:ring-mgmt-primary focus:outline-none",
                      draft.specialization === "" && "text-mgmt-on-surface-variant",
                    )}
                    value={draft.specialization}
                    onChange={(e) => setDraft((p) => ({ ...p, specialization: e.target.value }))}
                    aria-label="Specialization"
                  >
                    <option value="">Select</option>
                    <option value="Physiotherapy">Physiotherapy</option>
                    <option value="Occupational therapy">Occupational therapy</option>
                    <option value="Speech therapy">Speech therapy</option>
                    <option value="Counseling">Counseling</option>
                    <option value="Psychotherapy">Psychotherapy</option>
                  </select>
                  <MaterialSymbol
                    name="keyboard_arrow_down"
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-mgmt-on-surface-variant"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="ml-1 block text-[0.75rem] font-semibold uppercase tracking-wider text-mgmt-on-surface-variant">
                About you
              </label>
              <textarea
                className="min-h-28 w-full resize-none rounded-xl border-none bg-mgmt-surface-container-low px-4 py-4 text-sm text-mgmt-on-surface transition-all placeholder:text-mgmt-on-surface-variant focus:bg-mgmt-surface-container-lowest focus:ring-1 focus:ring-mgmt-primary focus:outline-none"
                placeholder="Briefly describe professional experience..."
                value={draft.aboutYou}
                onChange={(e) => setDraft((p) => ({ ...p, aboutYou: e.target.value }))}
              />
            </div>
          </form>
        </div>

        <div className="flex flex-col-reverse gap-3 bg-mgmt-surface-container-low px-5 py-4 sm:flex-row sm:items-center sm:justify-end sm:gap-4 sm:px-8 sm:py-6">
          <button
            type="button"
            className="h-11 rounded-xl border border-mgmt-outline-variant/30 bg-white px-5 text-sm font-semibold text-mgmt-on-surface-variant transition-colors hover:bg-mgmt-surface-container-low"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="h-11 rounded-xl bg-gradient-to-br from-mgmt-primary to-mgmt-primary-dim px-6 text-sm font-bold text-mgmt-on-primary shadow-lg transition-all hover:opacity-90 active:scale-95 disabled:opacity-40"
            disabled={!canSave || submitting}
            onClick={() => {
              void handleCreate();
            }}
          >
            {submitting ? "Adding…" : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}

