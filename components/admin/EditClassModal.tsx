"use client";

import { useEffect, useId, useMemo, useState } from "react";
import MaterialSymbol from "@/components/admin/MaterialSymbol";

export type EditClassModalClass = {
  id: string;
  title: string;
  meta: string;
};

const CLASS_COVER_URL =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAjBpEK3SLmKtFo6kNAkZHqV_8Sg_bZQlCNJo3ZMlq3dVsbz3gmbNzJbR4Q3mx6gTWdgLOFrrAyKYaVvLGtA030vzSoCTUGOC3Gn6F6jUCnYwDyNoosYFquklZfqu51G_6ru-2UcplQDykg2tBEvaMWugItXPVrLHJTyJW6ajG-yp8MvKHExPCuDXChZzhJfiGvulLobNIxd-OMJhlURAI_xpA4T4eboD75ViuRFheXO7QJ29bHlcckjWE8kGneNpzvwE_aIQ658As";

type ClassTeamMember = {
  id: string;
  name: string;
  role: string;
  image: string;
  defaultChecked?: boolean;
};

const CLASS_TEAM: ClassTeamMember[] = [
  {
    id: "jordan",
    name: "Jordan Doe",
    role: "Coach",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuACQIF1Vc6SScAccwkRdU_FhKJrG_zr3zTd2qMBov3bEFPzbD-X8wJae6sBP1DkZtwLdOUebJ8Q_wsVlHH3eiS9AjjH9kW9KBEa_1n0o7QlJgT-NqNrgsLrEi4wiO5fx6g3nMrE7hwIGOl8MGnPibzlqjZBabyWkzTGWwzPeqyDXSRCkRo7shF9mfzdlTZxrixkl25TaAO1pKiIiPUV6EQceqwQITyHrszoxjL5kCb89kHb3Ip0LE1yUxdPuh6MrzbzwIOPbXyceFU",
    defaultChecked: true,
  },
  {
    id: "anna",
    name: "Anna Smith",
    role: "Senior Instructor",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDgyNmDVXh0Z33mSX6Wxh_20YZIZqnKtIGihlDfOBxnmENiz8O31TmfELOKjKlEcJLVhQgLBAP0XHOqlXIA9ezshqTDTp_N3hia9aFoDt-xMsEZ8k4GkemQ2c3_tOIIR_vUxgKpUaLxR3AIhI4d2dU6lt2xW06lKddkKuipA4rDoRNq1qUe53nmfCMyZN8ssTmE7_LCqNuWBS9kvcmeX_FFAcWsfGTJjzLY3FNO96nwO5ULwyT8XpACXbk_RHfudDvAuZt32O0cFcc",
  },
  {
    id: "ryan",
    name: "Ryan King",
    role: "Trainer",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCtYhiHbFhQFB3RPXWG0pNvvjKERWNKKOJ-wYhbkgIJT5BZQqgVbsZyqqKeva9AUjU1J-9DLATzqWKKrJiMwAJNnhpdQjSXmoOpvkcgDtJ7D1Qey112HqPfs6J8GuHVrC6GEAXJNeBNWJla_Haum8TGPgl_XQiYXWzzFcf1BQFphJgK7lA27ImeNJHao1f0KKYFHCvBgPQyuvRTzh-6wc4hdOvoN_GMEFM_HHC1u8mS_IDBt10pecD3kYiFguEcwglIu1ZILlIvWDA",
  },
  {
    id: "maria",
    name: "Maria White",
    role: "Coach",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuD0IJ8hZltX9favhOFJwLkeFjec8UsSzIYALTqvMtpBHAhMI_ryoORHAJIFIX3iCI_vU9hW9pUFpU11Dl7AJxf3vx0-1M9HZELujJlNk-QjJn3ailm9lbxL9Ogmq1ALNbtoG9D-u9hRbhHXgeESZj6Sp3i5iLxHK3x8DkUQB1-bjtwTQUa2HH7uoQeVupIQONxlMqDVrMtqjw7J81ifF4zxRG6FVNYpt0YVLFSelBO-uRDDokbL_Q5fADh3lRaDDDKNAYP7aV2U4XQ",
  },
];

function parseClassMeta(meta: string): { duration: string; costDollars: string } {
  const parts = meta.split("·").map((p) => p.trim());
  const duration = (parts[0] || "60 min").replace(/\bmins\b/i, "min");
  const rest = parts[1]?.toLowerCase() || "";
  const costDollars = rest.includes("free") ? "0.00" : (parts[1] || "0.00").replace(/[^\d.]/g, "");
  return { duration, costDollars };
}

const inputClass =
  "h-12 w-full rounded-xl border-none bg-mgmt-surface-container-low px-4 text-mgmt-on-surface transition-all focus:bg-mgmt-surface-container-lowest focus:ring-2 focus:ring-mgmt-primary/20 focus:outline-none";

const labelClass = "text-sm font-semibold text-mgmt-on-surface";

export default function EditClassModal({
  classItem,
  onClose,
  onSaved,
}: {
  classItem: EditClassModalClass | null;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const isCreate = classItem === null;
  const titleId = useId();

  const parsed = useMemo(() => parseClassMeta(classItem?.meta ?? ""), [classItem?.meta]);
  const [title, setTitle] = useState(() => classItem?.title ?? "");
  const [duration, setDuration] = useState(() => parsed.duration);
  const [costDollars, setCostDollars] = useState(() => parsed.costDollars);
  const [coverUrl, setCoverUrl] = useState(CLASS_COVER_URL);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function parseDurationMinutes(input: string): number | null {
    const t = input.trim().toLowerCase();
    const m = t.match(/(\d+)/);
    if (!m) return null;
    const n = Number.parseInt(m[1], 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  function parseLkrAmountFromUsdInput(input: string): number | null {
    const t = input.trim().toLowerCase();
    if (!t || t.includes("free") || t === "0" || t === "0.00") return 0;
    const m = t.match(/(\d[\d,]*)(?:\.(\d{1,2}))?/);
    if (!m) return null;
    const whole = Number(m[1].replace(/,/g, ""));
    if (!Number.isFinite(whole) || whole < 0) return null;
    // This "Classes" modal shows USD in the UI, but the backend stores LKR.
    // Until we introduce a real classes table/currency model, we treat the numeric input as LKR.
    return whole;
  }

  async function onDelete() {
    if (isCreate || !classItem) return;
    const ok = window.confirm("Delete this class?");
    if (!ok) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/v1/admin/services/${encodeURIComponent(classItem.id)}`, {
        method: "DELETE",
        cache: "no-store",
      });
      const json = (await res.json()) as any;
      if (!res.ok || json?.status !== "success") {
        throw new Error(json?.message || `Delete failed (HTTP ${res.status})`);
      }
      onSaved?.();
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Failed to delete class");
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-mgmt-inverse-surface/10 backdrop-blur-[2px]">
      <button type="button" className="fixed inset-0" aria-label="Close dialog" onClick={onClose} />

      <div className="relative z-[101] flex min-h-full items-start justify-center p-4 sm:items-center sm:p-6">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="flex w-full max-w-[860px] flex-col overflow-hidden rounded-2xl bg-white shadow-[0_10px_40px_-10px_rgba(47,51,52,0.15)]"
          style={{ maxHeight: "calc(100vh - 2rem)" }}
        >
          <header className="flex items-start justify-between gap-4 border-b border-mgmt-outline-variant/20 px-8 py-6">
            <div className="min-w-0">
              <h2 id={titleId} className="text-xl font-bold text-mgmt-on-surface">
                {isCreate ? "New class" : "Edit class"}
              </h2>
              <p className="mt-1 text-sm text-mgmt-on-surface-variant">
                Update class details, team members and pricing.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-mgmt-on-surface-variant hover:bg-mgmt-surface-container-low"
              aria-label="Close"
            >
              <MaterialSymbol name="close" className="text-xl" />
            </button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-8 py-6">
            {errorMsg ? (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMsg}
              </div>
            ) : null}
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.2fr_0.8fr]">
              <section className="space-y-6">
                <div className="space-y-2">
                  <label className={labelClass}>Class name</label>
                  <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className={labelClass}>Duration</label>
                    <input value={duration} onChange={(e) => setDuration(e.target.value)} className={inputClass} />
                  </div>
                  <div className="space-y-2">
                    <label className={labelClass}>Cost (USD)</label>
                    <input
                      value={costDollars}
                      onChange={(e) => setCostDollars(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <p className={labelClass}>Team members</p>
                  <div className="space-y-3">
                    {CLASS_TEAM.map((m) => (
                      <label
                        key={m.id}
                        className="flex items-center gap-3 rounded-2xl border border-mgmt-outline-variant/20 bg-mgmt-surface-container-lowest px-4 py-3"
                      >
                        <input
                          type="checkbox"
                          defaultChecked={m.defaultChecked}
                          className="h-4 w-4 rounded border-mgmt-outline-variant text-mgmt-primary focus:ring-mgmt-primary/30"
                        />
                        <img src={m.image} alt={m.name} className="h-10 w-10 rounded-xl object-cover" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-mgmt-on-surface">{m.name}</p>
                          <p className="truncate text-xs text-mgmt-on-surface-variant">{m.role}</p>
                        </div>
                        <span className="ml-auto text-mgmt-on-surface-variant">
                          <MaterialSymbol name="chevron_right" />
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </section>

              <aside className="space-y-4">
                <p className="text-sm font-bold uppercase tracking-widest text-mgmt-on-surface-variant">Cover</p>
                <div className="overflow-hidden rounded-2xl border border-mgmt-outline-variant/20 bg-mgmt-surface-container-lowest">
                  <img src={coverUrl} alt="Class cover" className="h-44 w-full object-cover" />
                  <div className="p-4">
                    <label className="block text-xs font-semibold text-mgmt-on-surface-variant">Image URL</label>
                    <input
                      value={coverUrl}
                      onChange={(e) => setCoverUrl(e.target.value)}
                      className="mt-2 w-full rounded-xl border-none bg-mgmt-surface-container-low px-4 py-3 text-sm text-mgmt-on-surface focus:bg-mgmt-surface-container-lowest focus:ring-2 focus:ring-mgmt-primary/20 focus:outline-none"
                    />
                  </div>
                </div>
              </aside>
            </div>
          </div>

          <footer className="flex items-center justify-between gap-3 border-t border-mgmt-outline-variant/20 bg-white px-8 py-5">
            <div>
              {!isCreate && (
                <button
                  type="button"
                  onClick={onDelete}
                  disabled={submitting}
                  className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-50 active:scale-[0.99]"
                >
                  Delete
                </button>
              )}
            </div>
            <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-mgmt-on-surface-variant hover:bg-mgmt-surface-container-low"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submitting || !title.trim()}
              onClick={async () => {
                if (!title.trim()) return;
                setSubmitting(true);
                setErrorMsg(null);
                try {
                  const defaultDurationMinutes = parseDurationMinutes(duration) ?? 60;
                  const basePriceLkr = parseLkrAmountFromUsdInput(costDollars);
                  const res = isCreate
                    ? await fetch("/api/v1/admin/services", {
                        method: "POST",
                        cache: "no-store",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify({
                          name: title.trim(),
                          defaultDurationMinutes,
                          basePriceLkr: basePriceLkr === null ? undefined : basePriceLkr,
                          currency: "LKR",
                          isActive: true,
                        }),
                      })
                    : await fetch(`/api/v1/admin/services/${encodeURIComponent(classItem!.id)}`, {
                        method: "PUT",
                        cache: "no-store",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify({
                          name: title.trim(),
                          defaultDurationMinutes,
                          basePriceLkr: basePriceLkr === null ? undefined : basePriceLkr,
                          currency: "LKR",
                        }),
                      });
                  const json = (await res.json()) as any;
                  if (!res.ok || json?.status !== "success") {
                    throw new Error(json?.message || `Save failed (HTTP ${res.status})`);
                  }
                  onSaved?.();
                } catch (e) {
                  setErrorMsg(e instanceof Error ? e.message : "Failed to save class");
                } finally {
                  setSubmitting(false);
                }
              }}
              className="rounded-xl bg-mgmt-primary px-5 py-2 text-sm font-bold text-mgmt-on-primary transition-transform active:scale-95 disabled:opacity-40"
            >
              Save
            </button>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}

