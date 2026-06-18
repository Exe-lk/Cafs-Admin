import { newUuid } from "@/lib/api/ids";
import { BANK_SLIPS_BUCKET } from "@/lib/calendar/bankSlipProof";

export { BANK_SLIPS_BUCKET };

export const BANK_SLIP_MAX_BYTES = 5 * 1024 * 1024;

/** Typical bank transaction / reference number length. */
export const BANK_REFERENCE_MIN_LEN = 3;
export const BANK_REFERENCE_MAX_LEN = 100;

/** Standard max URL length for proof links. */
export const BANK_SLIP_URL_MIN_LEN = 8;
export const BANK_SLIP_URL_MAX_LEN = 2048;

export const BANK_SLIP_ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
]);

export const BANK_SLIP_ACCEPT = ".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg";

export function getBankSlipStorageBucket(): string {
  return process.env.BANK_SLIP_STORAGE_BUCKET || BANK_SLIPS_BUCKET;
}

export function buildBankSlipObjectPath(appointmentId: string, ext: string): string {
  return `appointments/${appointmentId}/${newUuid()}.${ext}`;
}

export function inferBankSlipExtension(file: File): string {
  const extFromName = file.name.includes(".")
    ? file.name.split(".").pop()?.toLowerCase()
    : undefined;
  if (extFromName) return extFromName;
  if (file.type === "application/pdf") return "pdf";
  if (file.type === "image/png") return "png";
  return "jpg";
}

export function validateBankSlipFile(file: File): string | null {
  if (file.size > BANK_SLIP_MAX_BYTES) {
    return "Maximum allowed size is 5MB";
  }
  if (!BANK_SLIP_ALLOWED_MIME_TYPES.has(file.type)) {
    return "Unsupported file type. Use PDF, PNG, or JPEG.";
  }
  return null;
}

export type BankSlipFieldValues = {
  bankReference: string;
  bankSlipUrl: string;
  selectedFile: File | null;
};

export function hasBankSlipUploadIntent(fields: BankSlipFieldValues): boolean {
  return (
    fields.bankReference.trim().length > 0 ||
    fields.bankSlipUrl.trim().length > 0 ||
    Boolean(fields.selectedFile)
  );
}

export function validateBankSlipFields(fields: BankSlipFieldValues): string | null {
  if (!hasBankSlipUploadIntent(fields)) return null;

  const reference = fields.bankReference.trim();
  const url = fields.bankSlipUrl.trim();
  const hasFile = Boolean(fields.selectedFile);

  if (reference.length < BANK_REFERENCE_MIN_LEN) {
    return `Bank reference must be at least ${BANK_REFERENCE_MIN_LEN} characters.`;
  }
  if (reference.length > BANK_REFERENCE_MAX_LEN) {
    return `Bank reference must be at most ${BANK_REFERENCE_MAX_LEN} characters.`;
  }
  if (!hasFile && url.length < BANK_SLIP_URL_MIN_LEN) {
    return "Upload a bank slip file or paste a valid proof URL.";
  }
  if (!hasFile && url.length > BANK_SLIP_URL_MAX_LEN) {
    return `Proof URL must be at most ${BANK_SLIP_URL_MAX_LEN} characters.`;
  }
  if (fields.selectedFile) {
    return validateBankSlipFile(fields.selectedFile);
  }
  return null;
}
