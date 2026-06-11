import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export const BANK_SLIPS_BUCKET = "bank-slips";
export const BANK_SLIP_SIGNED_URL_TTL_SECONDS = 60 * 10;

type PaymentProofInput = {
  method?: "gateway" | "bank_transfer" | "cash";
  provider_payload?: string | null;
};

export type AppointmentPaymentRow = {
  payments: PaymentProofInput | PaymentProofInput[] | null;
};

export function normalizeStoragePath(path: string) {
  const trimmed = path.trim().replace(/^\/+/, "");
  if (!trimmed) return null;
  if (trimmed.startsWith(`${BANK_SLIPS_BUCKET}/`)) {
    return trimmed.slice(BANK_SLIPS_BUCKET.length + 1);
  }
  return trimmed;
}

export function parseProviderPayload(
  payload: string | null | undefined,
): Record<string, unknown> | null {
  if (!payload) return null;
  try {
    const parsed = JSON.parse(payload) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return null;
  }
  return null;
}

export function pickFirstString(payload: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

export async function resolveBankSlipProofUrl(
  adminSupabase: ReturnType<typeof createSupabaseServiceRoleClient>,
  row: AppointmentPaymentRow,
) {
  const payment = Array.isArray(row.payments) ? row.payments[0] : row.payments;
  if (!payment || payment.method !== "bank_transfer") return null;

  const payload = parseProviderPayload(payment.provider_payload);
  if (!payload) return null;

  const directUrl = pickFirstString(payload, [
    "proofUrl",
    "bankSlipUrl",
    "slipUrl",
    "publicUrl",
    "url",
  ]);
  if (directUrl) return directUrl;

  const path = pickFirstString(payload, [
    "proofPath",
    "bankSlipPath",
    "storagePath",
    "path",
    "objectPath",
    "filePath",
    "key",
  ]);
  if (!path) return null;

  const normalizedPath = normalizeStoragePath(path);
  if (!normalizedPath) return null;

  const { data, error } = await adminSupabase.storage
    .from(BANK_SLIPS_BUCKET)
    .createSignedUrl(normalizedPath, BANK_SLIP_SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
