"use client";

import { useState } from "react";
import MaterialSymbol from "@/components/admin/MaterialSymbol";
import {
  BANK_SLIP_ACCEPT,
  BANK_SLIP_MAX_BYTES,
  validateBankSlipFile,
  type BankSlipFieldValues,
} from "@/lib/payments/bankSlipUpload";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const fieldClass =
  "h-10 w-full rounded-lg bg-mgmt-surface-container-low px-3 text-sm text-mgmt-on-surface outline-none ring-1 ring-transparent focus:ring-mgmt-primary/30 disabled:opacity-60";

export type BankSlipUploadFieldsProps = {
  bankReference: string;
  onBankReferenceChange: (value: string) => void;
  bankSlipUrl: string;
  onBankSlipUrlChange: (value: string) => void;
  selectedFile: File | null;
  onFileChange: (file: File | null) => void;
  disabled?: boolean;
  existingProofUrl?: string | null;
  readOnly?: boolean;
};

export default function BankSlipUploadFields({
  bankReference,
  onBankReferenceChange,
  bankSlipUrl,
  onBankSlipUrlChange,
  selectedFile,
  onFileChange,
  disabled = false,
  existingProofUrl,
  readOnly = false,
}: BankSlipUploadFieldsProps) {
  const inputDisabled = disabled || readOnly;
  const [fileError, setFileError] = useState<string | null>(null);

  function handleFileSelect(file: File | null) {
    if (!file) {
      onFileChange(null);
      setFileError(null);
      return;
    }
    const error = validateBankSlipFile(file);
    if (error) {
      onFileChange(null);
      setFileError(error);
      return;
    }
    setFileError(null);
    onFileChange(file);
  }

  if (readOnly) {
    if (!existingProofUrl) return null;
    return (
      <a
        href={existingProofUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 rounded-lg bg-mgmt-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-mgmt-on-primary transition-opacity hover:opacity-90"
      >
        View current proof
      </a>
    );
  }

  return (
    <div className="space-y-4">
      {existingProofUrl ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-mgmt-outline-variant/15 bg-mgmt-surface-container-low px-4 py-3">
          <p className="text-xs text-mgmt-on-surface-variant">A bank slip is already on file.</p>
          <a
            href={existingProofUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-lg bg-mgmt-primary px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-mgmt-on-primary transition-opacity hover:opacity-90"
          >
            View current proof
          </a>
        </div>
      ) : null}

      <div>
        <label className="block text-[11px] font-semibold text-mgmt-on-surface-variant">
          Bank reference
        </label>
        <input
          type="text"
          value={bankReference}
          onChange={(e) => onBankReferenceChange(e.target.value)}
          disabled={inputDisabled}
          placeholder="Transaction / reference number"
          className={cx("mt-1", fieldClass)}
        />
      </div>

      <div>
        <label className="block text-[11px] font-semibold text-mgmt-on-surface-variant">
          Upload bank slip
        </label>
        <div className="mt-1 rounded-xl border-2 border-dashed border-mgmt-outline-variant/30 bg-mgmt-surface-container-low transition-colors hover:border-mgmt-primary/40">
          <label
            className={cx(
              "block px-4 py-8 text-center",
              inputDisabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
            )}
          >
            <input
              type="file"
              accept={BANK_SLIP_ACCEPT}
              className="sr-only"
              disabled={inputDisabled}
              onChange={(e) => {
                handleFileSelect(e.target.files?.[0] ?? null);
                e.target.value = "";
              }}
            />
            <MaterialSymbol
              name="upload_file"
              className="mx-auto text-3xl text-mgmt-on-surface-variant"
            />
            <p className="mt-2 text-sm font-medium text-mgmt-on-surface">
              {selectedFile ? selectedFile.name : "Choose a file or drag here"}
            </p>
            <p className="mt-1 text-xs text-mgmt-on-surface-variant">
              PDF, PNG, or JPEG up to {Math.round(BANK_SLIP_MAX_BYTES / (1024 * 1024))}MB
            </p>
          </label>
        </div>
        {selectedFile ? (
          <button
            type="button"
            disabled={inputDisabled}
            onClick={() => {
              onFileChange(null);
              setFileError(null);
            }}
            className="mt-2 text-xs font-semibold text-red-600 hover:underline disabled:opacity-40 dark:text-red-400"
          >
            Remove file
          </button>
        ) : null}
        {fileError ? (
          <p className="mt-2 text-xs text-red-600 dark:text-red-400">{fileError}</p>
        ) : null}
      </div>

      <div>
        <label className="block text-[11px] font-semibold text-mgmt-on-surface-variant">
          Or paste proof URL (optional)
        </label>
        <input
          type="url"
          value={bankSlipUrl}
          onChange={(e) => onBankSlipUrlChange(e.target.value)}
          disabled={inputDisabled}
          placeholder="https://…"
          className={cx("mt-1", fieldClass)}
        />
      </div>
    </div>
  );
}

export async function submitBankSlipTransfer(
  appointmentId: string,
  fields: BankSlipFieldValues,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const payload = new FormData();
  payload.set("bankReference", fields.bankReference.trim());
  if (fields.bankSlipUrl.trim()) payload.set("bankSlipUrl", fields.bankSlipUrl.trim());
  if (fields.selectedFile) payload.set("bankSlipFile", fields.selectedFile);

  const res = await fetch(
    `/api/v1/admin/appointments/${encodeURIComponent(appointmentId)}/payments/bank-transfer`,
    {
      method: "POST",
      body: payload,
    },
  );

  const json = (await res.json().catch(() => ({}))) as { status?: string; message?: string };
  if (!res.ok || json.status !== "success") {
    return {
      ok: false,
      message: typeof json.message === "string" ? json.message : "Unable to submit bank slip.",
    };
  }
  return { ok: true };
}

export {
  hasBankSlipUploadIntent,
  validateBankSlipFields,
  type BankSlipFieldValues,
} from "@/lib/payments/bankSlipUpload";
