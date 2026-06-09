"use client";

import { useEffect, useMemo, useState } from "react";
import MaterialSymbol from "@/components/admin/MaterialSymbol";
import { useAdminTherapist } from "@/components/admin/AdminTherapistContext";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type AboutForm = {
  fullName: string;
  phoneCountry: string;
  phoneNumber: string;
  email: string;
  specialization: string;
  aboutYou: string;
};

export default function TheraphistSettingsAboutPage() {
  const { profile, selectedId, updateProfile } = useAdminTherapist();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [form, setForm] = useState<AboutForm>({
    fullName: profile.fullName,
    phoneCountry: profile.phoneCountry,
    phoneNumber: profile.phoneNumber,
    email: profile.email,
    specialization: profile.specialization,
    aboutYou: profile.aboutYou,
  });

  // Reset the draft only when the selected therapist changes.
  useEffect(() => {
    setForm({
      fullName: profile.fullName,
      phoneCountry: profile.phoneCountry,
      phoneNumber: profile.phoneNumber,
      email: profile.email,
      specialization: profile.specialization,
      aboutYou: profile.aboutYou,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const initials = useMemo(() => {
    const t = form.fullName.trim();
    return t ? t[0]!.toUpperCase() : "T";
  }, [form.fullName]);

  const canSave = useMemo(() => {
    return Boolean(form.fullName.trim() && form.email.trim());
  }, [form.email, form.fullName]);

  const isDirty = useMemo(() => {
    return (
      form.fullName !== profile.fullName ||
      form.phoneCountry !== profile.phoneCountry ||
      form.phoneNumber !== profile.phoneNumber ||
      form.email !== profile.email ||
      form.specialization !== profile.specialization ||
      form.aboutYou !== profile.aboutYou
    );
  }, [form, profile]);

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-8 lg:px-12 lg:py-10">
      <div className="max-w-3xl space-y-6">
        <p className="mb-8 text-xs font-semibold tracking-widest text-mgmt-on-surface-variant">
          MAIN DETAILS
        </p>

        <div className="mb-10 flex items-center gap-6">
          <div className="relative">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-mgmt-tertiary-container text-xl font-bold text-mgmt-on-tertiary-container">
              {initials}
            </div>
            <button
              type="button"
              className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-mgmt-surface-container-low text-mgmt-on-surface-variant shadow-sm transition-colors hover:bg-mgmt-surface-container"
              aria-label="Edit profile picture"
            >
              <MaterialSymbol name="edit" className="text-[16px]" />
            </button>
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-mgmt-on-surface">{form.fullName || "—"}</p>
            <p className="mt-1 text-xs text-mgmt-on-surface-variant">
              Profile picture will be visible to all members
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-x-10 gap-y-8 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold tracking-widest text-mgmt-on-surface-variant">
              FULL NAME
            </label>
            <input
              className="mt-2 w-full rounded-xl border-none bg-mgmt-surface-container-low px-4 py-3 text-sm text-mgmt-on-surface outline-none placeholder:text-mgmt-on-surface-variant focus:ring-1 focus:ring-mgmt-primary/30"
              value={form.fullName}
              onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold tracking-widest text-mgmt-on-surface-variant">
              PRIMARY PHONE
            </label>
            <div className="mt-2 flex items-center gap-3 rounded-xl bg-mgmt-surface-container-low px-4 py-3">
              <MaterialSymbol name="flag" className="text-[14px] text-mgmt-on-surface-variant" />
              <input
                className="w-12 border-none bg-transparent text-sm text-mgmt-on-surface outline-none"
                value={form.phoneCountry}
                onChange={(e) => setForm((p) => ({ ...p, phoneCountry: e.target.value }))}
                aria-label="Country code"
              />
              <div className="h-4 w-px bg-mgmt-outline-variant/60" />
              <input
                className="min-w-0 flex-1 border-none bg-transparent text-sm text-mgmt-on-surface outline-none"
                value={form.phoneNumber}
                onChange={(e) => setForm((p) => ({ ...p, phoneNumber: e.target.value }))}
                aria-label="Phone number"
              />
            </div>
          </div>

          <div className="relative">
            <label className="block text-xs font-semibold tracking-widest text-mgmt-on-surface-variant">
              PRIMARY EMAIL
            </label>
            <input
              className="mt-2 w-full rounded-xl border-none bg-mgmt-surface-container-low px-4 py-3 pr-10 text-sm text-mgmt-on-surface outline-none placeholder:text-mgmt-on-surface-variant focus:ring-1 focus:ring-mgmt-primary/30"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              inputMode="email"
            />
            <span className="pointer-events-none absolute right-4 top-[38px] text-mgmt-on-surface-variant">
              <MaterialSymbol name="lock" className="text-[16px]" />
            </span>
          </div>

          <div className="relative">
            <label className="block text-xs font-semibold tracking-widest text-mgmt-on-surface-variant">
              SPECIALIZATION
            </label>
            <select
              className={cx(
                "mt-2 w-full appearance-none rounded-xl border-none bg-mgmt-surface-container-low px-4 py-3 pr-10 text-sm text-mgmt-on-surface outline-none focus:ring-1 focus:ring-mgmt-primary/30",
                form.specialization === "" && "text-mgmt-on-surface-variant",
              )}
              value={form.specialization}
              onChange={(e) => setForm((p) => ({ ...p, specialization: e.target.value }))}
              aria-label="Specialization"
            >
              <option value="Role">Role</option>
              <option value="Therapist">Therapist</option>
              <option value="Counselor">Counselor</option>
            </select>
            <span className="pointer-events-none absolute right-4 top-[38px] text-mgmt-on-surface-variant">
              <MaterialSymbol name="keyboard_arrow_down" className="text-[18px]" />
            </span>
          </div>
        </div>

        <div className="mt-10">
          <label className="block text-xs font-semibold tracking-widest text-mgmt-on-surface-variant">
            ABOUT
          </label>

          <textarea
            className="mt-2 min-h-28 w-full resize-none rounded-xl border-none bg-mgmt-surface-container-low px-4 py-4 text-sm text-mgmt-on-surface outline-none placeholder:text-mgmt-on-surface-variant focus:ring-1 focus:ring-mgmt-primary/30"
            placeholder="Briefly describe your professional experience..."
            value={form.aboutYou}
            onChange={(e) => setForm((p) => ({ ...p, aboutYou: e.target.value }))}
          />
          <p className="mt-4 text-xs text-mgmt-on-surface-variant">
            This summary will appear on your internal concierge profile.
          </p>
        </div>

        <div className="pt-2">
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
            {saveError ? (
              <p className="mr-auto text-sm text-red-700">{saveError}</p>
            ) : null}
            <button
              type="button"
              className="h-11 rounded-xl border border-mgmt-outline-variant/30 bg-white px-5 text-sm font-semibold text-mgmt-on-surface-variant transition-colors hover:bg-mgmt-surface-container-low disabled:opacity-50"
              disabled={!isDirty || saving}
              onClick={() => {
                setSaveError(null);
                setForm({
                  fullName: profile.fullName,
                  phoneCountry: profile.phoneCountry,
                  phoneNumber: profile.phoneNumber,
                  email: profile.email,
                  specialization: profile.specialization,
                  aboutYou: profile.aboutYou,
                });
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="h-11 rounded-xl bg-gradient-to-br from-mgmt-primary to-mgmt-primary-dim px-6 text-sm font-bold text-mgmt-on-primary shadow-md transition-all active:scale-95 disabled:opacity-40"
              disabled={!canSave || !isDirty || saving}
              onClick={async () => {
                if (!canSave) return;
                setSaving(true);
                setSaveError(null);
                try {
                  const phone = [form.phoneCountry.trim(), form.phoneNumber.trim()]
                    .filter(Boolean)
                    .join(" ");

                  // Keep existing split: profiles via users API, therapist fields via therapists API.
                  const [uRes, tRes] = await Promise.all([
                    fetch(`/api/v1/admin/users/${selectedId}`, {
                      method: "PUT",
                      cache: "no-store",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify({
                        fullName: form.fullName,
                        phone: phone || undefined,
                      }),
                    }),
                    fetch(`/api/v1/admin/therapists/${selectedId}`, {
                      method: "PUT",
                      cache: "no-store",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify({
                        bio: form.aboutYou,
                      }),
                    }),
                  ]);

                  const uJson: unknown = await uRes.json();
                  if (!uRes.ok || !isSuccessEnvelope(uJson)) {
                    throw new Error(
                      (isEnvelope(uJson) && typeof uJson.message === "string" && uJson.message) ||
                        `Failed to save profile (HTTP ${uRes.status})`,
                    );
                  }
                  const tJson: unknown = await tRes.json();
                  if (!tRes.ok || !isSuccessEnvelope(tJson)) {
                    throw new Error(
                      (isEnvelope(tJson) && typeof tJson.message === "string" && tJson.message) ||
                        `Failed to save therapist (HTTP ${tRes.status})`,
                    );
                  }

                  updateProfile({
                    ...profile,
                    id: selectedId,
                    fullName: form.fullName,
                    phoneCountry: form.phoneCountry,
                    phoneNumber: form.phoneNumber,
                    email: form.email,
                    specialization: form.specialization,
                    aboutYou: form.aboutYou,
                  });
                } catch (e) {
                  setSaveError(e instanceof Error ? e.message : "Failed to save profile");
                } finally {
                  setSaving(false);
                }
              }}
            >
              {saving ? "Saving…" : "Save profile"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

type Envelope = { status?: unknown; message?: unknown; data?: unknown };

function isEnvelope(v: unknown): v is Envelope {
  return typeof v === "object" && v !== null;
}

function isSuccessEnvelope(v: unknown): v is Envelope & { status: "success" } {
  return isEnvelope(v) && v.status === "success";
}

