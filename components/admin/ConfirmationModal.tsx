"use client";

import { useEffect, useId, useState } from "react";
import MaterialSymbol from "@/components/admin/MaterialSymbol";

export type ConfirmationModalProps = {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
  /** When true, backdrop click and Escape do not close the modal. */
  disableDismiss?: boolean;
};

export default function ConfirmationModal({
  title,
  description,
  confirmLabel = "Yes, delete",
  cancelLabel = "Cancel",
  onConfirm,
  onClose,
  disableDismiss = false,
}: ConfirmationModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || disableDismiss || submitting) return;
      onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [disableDismiss, onClose, submitting]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  async function handleConfirm() {
    if (submitting) return;
    setSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-mgmt-inverse-surface/20"
        disabled={disableDismiss || submitting}
        onClick={() => {
          if (disableDismiss || submitting) return;
          onClose();
        }}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="relative z-[111] w-full max-w-md rounded-2xl bg-white p-6 shadow-[0_10px_40px_-10px_rgba(47,51,52,0.2)]"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id={titleId} className="text-lg font-bold text-mgmt-on-surface">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="shrink-0 rounded-full p-1 text-mgmt-on-surface-variant transition-colors hover:bg-mgmt-surface-container-low disabled:opacity-40"
            aria-label="Close"
          >
            <MaterialSymbol name="close" className="text-xl" />
          </button>
        </div>

        <p id={descriptionId} className="mt-3 text-sm leading-relaxed text-mgmt-on-surface">
          {description}
        </p>

        <div className="mt-6 flex items-center justify-end gap-4">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="text-sm font-semibold text-mgmt-on-surface-variant transition-colors hover:text-mgmt-on-surface disabled:opacity-40"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => {
              void handleConfirm();
            }}
            disabled={submitting}
            className="rounded-full bg-mgmt-on-surface px-5 py-2.5 text-sm font-bold text-mgmt-surface-container-lowest transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {submitting ? "Please wait…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
