"use client";

import { useEffect, useId, useState } from "react";
import MaterialSymbol from "@/components/admin/MaterialSymbol";

export type EditTherapistServiceModalItem = {
  id: string;
  title: string;
  meta: string;
  categoryId?: string;
  therapistId?: string;
  description?: string;
};

const PLACEHOLDER_CATEGORIES = [
  { id: "cat-individual", label: "Individual therapy" },
  { id: "cat-couples", label: "Couples counselling" },
  { id: "cat-assessment", label: "Psychological assessment" },
  { id: "cat-group", label: "Group session" },
] as const;

const PLACEHOLDER_THERAPISTS = [
  { id: "th-001", label: "Dr. Anjali Perera" },
  { id: "th-002", label: "Dr. Ruwan Silva" },
  { id: "th-003", label: "Ms. Nethmi Fernando" },
] as const;

const STRIPE_IMG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCqU4BgDUKDoVFjVWzcdGUmIVzSX9ylRwNT432QHZuv14b_W4a_hFfIi7s43dDkaRXR_DxXK7GM4LjWcwjjjZH-1HGHf05Iojsgqt_VBMAYlfG0EBudM9yekvZgz5XGu4fq-C6oZqEqtl_2KpKpIy3OVKYRUC1-Aik6EU5AZvYCpbGU5_jdCVHMwaX9MqoYTvKY1NX-C66-Xqx8IkLe6d6yqoPJvbKCEpVVgHdfnECA_8UOhhJJYV7UTfVGXEcrr82hCn8-WvgEI9A";

const PAYPAL_IMG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAF4lI5L8Yy2CG4EGJbOhFPJL7FrEHkSbkMeQ4_7S-vCLXQVFQlLCzVdww3d6Kb7EU-7NWN_KRqo1zABmti-dUMFrglzFvzyzB8k5Qh-Yu1JtW4NE_HMJQQXRSV70Iu7TD29-PDc3GzwhQfHtA0Cj6NSqxOVby9NLZFTl0JryTNdwmjW9SfhvJKo0W7nktoNUAMBjpqP4jGeRnn7DMdxt-8Xo8QK_bcjDeofEkLhA27c2Qco5-mCl549R40n1_eY6X_csO232jZs44";

function parseMeta(meta: string): { duration: string; costLabel: string } {
  const parts = meta.split("·").map((p) => p.trim());
  const duration = parts[0] || "60 mins";
  const rest = parts[1]?.toLowerCase() || "";
  const costLabel = rest.includes("free") ? "Rs 0" : parts[1] || "Rs 3,500";
  return { duration, costLabel };
}

const inputClass =
  "h-12 w-full rounded-xl border-none bg-mgmt-surface-container-low px-4 text-mgmt-on-surface transition-all focus:bg-mgmt-surface-container-lowest focus:ring-2 focus:ring-mgmt-primary/20 focus:outline-none";

const textareaClass =
  "min-h-[120px] w-full resize-y rounded-xl border-none bg-mgmt-surface-container-low px-4 py-3 text-mgmt-on-surface transition-all focus:bg-mgmt-surface-container-lowest focus:ring-2 focus:ring-mgmt-primary/20 focus:outline-none";

const labelClass = "text-sm font-semibold text-mgmt-on-surface";

const PLACEHOLDER_DESCRIPTION =
  "One-on-one session focused on emotional wellbeing, coping strategies, and personalised therapeutic support.";

type Props = {
  /** When `null`, the modal opens in “add new service” mode with empty defaults. */
  service: EditTherapistServiceModalItem | null;
  onClose: () => void;
  onSaved?: () => void;
};

export default function EditTherapistServiceModal({ service, onClose, onSaved }: Props) {
  const isCreate = service === null;
  const titleId = useId();
  const parsed = parseMeta(service?.meta ?? "");
  const [categoryId, setCategoryId] = useState(
    () => service?.categoryId ?? PLACEHOLDER_CATEGORIES[0]!.id,
  );
  const [therapistId, setTherapistId] = useState(
    () => service?.therapistId ?? PLACEHOLDER_THERAPISTS[0]!.id,
  );
  const [duration, setDuration] = useState(parsed.duration);
  const [cost, setCost] = useState(parsed.costLabel);
  const [description, setDescription] = useState(
    () => service?.description ?? (isCreate ? "" : PLACEHOLDER_DESCRIPTION),
  );
  const [payment, setPayment] = useState<"Stripe" | "PayPal">("Stripe");

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

  function onDelete() {
    if (isCreate || !service) return;
    const ok = window.confirm("Delete this service?");
    if (!ok) return;
    onSaved?.();
  }

  function onSave() {
    if (!categoryId || !therapistId) return;
    onSaved?.();
  }

  const canSave = Boolean(categoryId && therapistId && duration.trim() && cost.trim());

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
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <label className={labelClass} htmlFor="therapist-service-category">
                  Service category
                </label>
                <select
                  id="therapist-service-category"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className={inputClass}
                >
                  {PLACEHOLDER_CATEGORIES.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.label}
                    </option>
                  ))}
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
                  className={inputClass}
                >
                  {PLACEHOLDER_THERAPISTS.map((therapist) => (
                    <option key={therapist.id} value={therapist.id}>
                      {therapist.label}
                    </option>
                  ))}
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

            {/* <div className="mt-10">
              <h3 className="text-sm font-bold uppercase tracking-widest text-mgmt-on-surface-variant">
                Payments
              </h3>
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setPayment("Stripe")}
                  className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition-colors ${
                    payment === "Stripe"
                      ? "border-mgmt-primary bg-mgmt-surface-container-lowest"
                      : "border-mgmt-outline-variant/30 bg-white hover:bg-mgmt-surface-container-lowest"
                  }`}
                >
                  <img src={STRIPE_IMG} alt="Stripe" className="h-10 w-10 rounded-xl object-cover" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-mgmt-on-surface">Stripe</p>
                    <p className="text-xs text-mgmt-on-surface-variant">Credit cards & subscriptions</p>
                  </div>
                  {payment === "Stripe" && <MaterialSymbol name="check_circle" className="text-mgmt-primary" filled />}
                </button>

                <button
                  type="button"
                  onClick={() => setPayment("PayPal")}
                  className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition-colors ${
                    payment === "PayPal"
                      ? "border-mgmt-primary bg-mgmt-surface-container-lowest"
                      : "border-mgmt-outline-variant/30 bg-white hover:bg-mgmt-surface-container-lowest"
                  }`}
                >
                  <img src={PAYPAL_IMG} alt="PayPal" className="h-10 w-10 rounded-xl object-cover" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-mgmt-on-surface">PayPal</p>
                    <p className="text-xs text-mgmt-on-surface-variant">Wallet and cards</p>
                  </div>
                  {payment === "PayPal" && <MaterialSymbol name="check_circle" className="text-mgmt-primary" filled />}
                </button>
              </div>
            </div> */}
          </div>

          <footer className="flex items-center justify-between gap-3 border-t border-mgmt-outline-variant/20 bg-white px-8 py-5">
            <div>
              {!isCreate && (
                <button
                  type="button"
                  onClick={onDelete}
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
                className="rounded-xl px-4 py-2 text-sm font-semibold text-mgmt-on-surface-variant hover:bg-mgmt-surface-container-low"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!canSave}
                onClick={onSave}
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
