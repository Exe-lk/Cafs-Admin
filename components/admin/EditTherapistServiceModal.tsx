"use client";

import { useEffect, useId, useState } from "react";
import MaterialSymbol from "@/components/admin/MaterialSymbol";
import { useAdminTherapists } from "@/components/admin/useAdminTherapists";

export type EditTherapistServiceModalItem = {
  id: string;
  title: string;
  meta: string;
  categoryId?: string;
  therapistId?: string;
  description?: string;
};

type ServiceOption = { id: string; label: string; description?: string };

function parseMeta(meta: string): { duration: string; costLabel: string } {
  const parts = meta.split("·").map((p) => p.trim());
  const duration = parts[0] || "";
  const rest = parts[1]?.toLowerCase() || "";
  const costLabel = rest.includes("free") ? "Rs 0" : parts[1] || "";
  return { duration, costLabel };
}

function parseDurationMinutes(input: string): number | null {
  const m = input.trim().match(/(\d+)/);
  if (!m) return null;
  const n = Number.parseInt(m[1]!, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parsePriceLkr(input: string): number | null {
  const t = input.trim().toLowerCase();
  if (!t || t.includes("free") || t === "rs 0") return 0;
  const m = t.replace(/,/g, "").match(/(\d+(?:\.\d{1,2})?)/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

const inputClass =
  "h-12 w-full rounded-xl border-none bg-mgmt-surface-container-low px-4 text-mgmt-on-surface transition-all focus:bg-mgmt-surface-container-lowest focus:ring-2 focus:ring-mgmt-primary/20 focus:outline-none";

const textareaClass =
  "min-h-[120px] w-full resize-y rounded-xl border-none bg-mgmt-surface-container-low px-4 py-3 text-mgmt-on-surface transition-all focus:bg-mgmt-surface-container-lowest focus:ring-2 focus:ring-mgmt-primary/20 focus:outline-none";

const labelClass = "text-sm font-semibold text-mgmt-on-surface";

type Props = {
  /** When `null`, the modal opens in “add new service” mode with empty defaults. */
  service: EditTherapistServiceModalItem | null;
  /** Pre-select service category when creating from a category page. */
  defaultCategoryId?: string;
  onClose: () => void;
  onSaved?: () => void;
};

export default function EditTherapistServiceModal({
  service,
  defaultCategoryId,
  onClose,
  onSaved,
}: Props) {
  const isCreate = service === null;
  const titleId = useId();
  const parsed = parseMeta(service?.meta ?? "");

  const [categoryId, setCategoryId] = useState(
    () => service?.categoryId ?? defaultCategoryId ?? "",
  );
  const [therapistId, setTherapistId] = useState(() => service?.therapistId ?? "");
  const [duration, setDuration] = useState(() => parsed.duration);
  const [cost, setCost] = useState(() => parsed.costLabel);
  const [description, setDescription] = useState(() => service?.description ?? "");
  const [serviceOptions, setServiceOptions] = useState<ServiceOption[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { therapists, loading: therapistsLoading } = useAdminTherapists();

  useEffect(() => {
    const ac = new AbortController();
    setServicesLoading(true);
    (async () => {
      try {
        const res = await fetch("/api/v1/admin/services", {
          method: "GET",
          cache: "no-store",
          signal: ac.signal,
        });
        const json = (await res.json()) as {
          status?: string;
          data?: { items?: Array<{ service_id?: string; name?: string; description?: string | null }> };
        };
        if (!res.ok || json?.status !== "success" || !json?.data?.items) return;
        setServiceOptions(
          json.data.items
            .map((s) => ({
              id: String(s.service_id ?? ""),
              label: String(s.name ?? "—"),
              description:
                typeof s.description === "string" && s.description.trim()
                  ? s.description.trim()
                  : undefined,
            }))
            .filter((o) => o.id),
        );
      } catch {
        /* ignore */
      } finally {
        if (!ac.signal.aborted) setServicesLoading(false);
      }
    })();
    return () => ac.abort();
  }, []);

  useEffect(() => {
    if (categoryId || serviceOptions.length === 0) return;
    const preferred = defaultCategoryId && serviceOptions.some((s) => s.id === defaultCategoryId)
      ? defaultCategoryId
      : serviceOptions[0]!.id;
    setCategoryId(preferred);
  }, [categoryId, serviceOptions, defaultCategoryId]);

  useEffect(() => {
    if (therapistId || therapists.length === 0) return;
    setTherapistId(therapists[0]!.id);
  }, [therapistId, therapists]);

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

  async function onDelete() {
    if (isCreate || !service) return;
    const ok = window.confirm("Delete this service?");
    if (!ok) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch(
        `/api/v1/admin/therapist-services/${encodeURIComponent(service.id)}`,
        { method: "DELETE", cache: "no-store" },
      );
      const json = (await res.json()) as { status?: string; message?: string };
      if (!res.ok || json?.status !== "success") {
        throw new Error(json?.message || `Delete failed (HTTP ${res.status})`);
      }
      onSaved?.();
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Failed to delete service");
    } finally {
      setSubmitting(false);
    }
  }

  async function onSave() {
    if (!canSave) return;

    const durationMinutes = parseDurationMinutes(duration);
    const priceLkr = parsePriceLkr(cost);
    if (durationMinutes === null) {
      setErrorMsg("Invalid duration");
      return;
    }
    if (priceLkr === null) {
      setErrorMsg("Invalid cost");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      const payload = {
        therapistId,
        serviceId: categoryId,
        durationMinutes,
        priceLkr,
        isActive: true,
      };

      const res = isCreate
        ? await fetch("/api/v1/admin/therapist-services", {
            method: "POST",
            cache: "no-store",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch(`/api/v1/admin/therapist-services/${encodeURIComponent(service!.id)}`, {
            method: "PATCH",
            cache: "no-store",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(payload),
          });

      const json = (await res.json()) as { status?: string; message?: string };
      if (!res.ok || json?.status !== "success") {
        throw new Error(json?.message || `Save failed (HTTP ${res.status})`);
      }
      onSaved?.();
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Failed to save service");
    } finally {
      setSubmitting(false);
    }
  }

  const canSave = Boolean(
    categoryId &&
      therapistId &&
      duration.trim() &&
      cost.trim() &&
      !submitting &&
      !servicesLoading &&
      !therapistsLoading,
  );

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-mgmt-inverse-surface/10 backdrop-blur-[2px]">
      <button type="button" className="fixed inset-0" aria-label="Close dialog" onClick={onClose} />

      <div className="relative z-[101] flex min-h-full items-start justify-center p-4 sm:items-center sm:p-6">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="flex w-full max-w-[640px] flex-col overflow-hidden rounded-2xl bg-white shadow-[0_10px_40px_-10px_rgba(47,51,52,0.15)]"
          style={{ maxHeight: "calc(100vh - 2rem)" }}
        >
          <header className="flex items-start gap-4 border-b border-mgmt-outline-variant/20 px-8 py-6">
            <div className="flex-1">
              <h2 id={titleId} className="text-xl font-bold text-mgmt-on-surface">
                {isCreate ? "New service" : "Edit service"}
              </h2>
              <p className="mt-1 text-sm text-mgmt-on-surface-variant">
                Assign a service category and therapist, then set duration, pricing and payments.
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
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <label className={labelClass} htmlFor="therapist-service-category">
                  Service category
                </label>
                <select
                  id="therapist-service-category"
                  value={categoryId}
                  onChange={(e) => {
                    const nextId = e.target.value;
                    setCategoryId(nextId);
                    if (isCreate) {
                      const match = serviceOptions.find((s) => s.id === nextId);
                      if (match?.description && !description.trim()) {
                        setDescription(match.description);
                      }
                    }
                  }}
                  disabled={servicesLoading}
                  className={inputClass}
                >
                  {servicesLoading ? (
                    <option value="">Loading services…</option>
                  ) : serviceOptions.length === 0 ? (
                    <option value="">No service types available</option>
                  ) : (
                    serviceOptions.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.label}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className={labelClass} htmlFor="therapist-service-therapist">
                  Therapist
                </label>
                <select
                  id="therapist-service-therapist"
                  value={therapistId}
                  onChange={(e) => setTherapistId(e.target.value)}
                  disabled={therapistsLoading}
                  className={inputClass}
                >
                  {therapistsLoading ? (
                    <option value="">Loading therapists…</option>
                  ) : therapists.length === 0 ? (
                    <option value="">No therapists available</option>
                  ) : (
                    therapists.map((therapist) => (
                      <option key={therapist.id} value={therapist.id}>
                        {therapist.name}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="space-y-2">
                <label className={labelClass} htmlFor="therapist-service-duration">
                  Duration
                </label>
                <input
                  id="therapist-service-duration"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className={inputClass}
                  placeholder="60 mins"
                />
              </div>

              <div className="space-y-2">
                <label className={labelClass} htmlFor="therapist-service-cost">
                  Cost
                </label>
                <input
                  id="therapist-service-cost"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  className={inputClass}
                  placeholder="Rs 3,500"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className={labelClass} htmlFor="therapist-service-description">
                  Description
                </label>
                <textarea
                  id="therapist-service-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={textareaClass}
                  placeholder="Describe what this service includes for clients…"
                  rows={4}
                />
              </div>
            </div>
          </div>

          <footer className="flex items-center justify-between gap-3 border-t border-mgmt-outline-variant/20 bg-white px-8 py-5">
            <div>
              {!isCreate && (
                <button
                  type="button"
                  onClick={() => void onDelete()}
                  disabled={submitting}
                  className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-50 active:scale-[0.99] disabled:opacity-40"
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
                className="rounded-xl px-4 py-2 text-sm font-semibold text-mgmt-on-surface-variant hover:bg-mgmt-surface-container-low disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!canSave}
                onClick={() => void onSave()}
                className="rounded-xl bg-mgmt-primary px-5 py-2 text-sm font-bold text-mgmt-on-primary transition-transform active:scale-95 disabled:opacity-40"
              >
                {submitting ? "Saving…" : "Save"}
              </button>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
