import type { SupabaseClient } from "@supabase/supabase-js";

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export async function resolveAppointmentAmountLkr(
  db: SupabaseClient,
  input: { therapistId: string; serviceId: string },
): Promise<number | null> {
  const { therapistId, serviceId } = input;

  const { data: ts } = await db
    .from("therapist_services")
    .select("price_lkr,is_active")
    .eq("therapist_id", therapistId)
    .eq("service_id", serviceId)
    .eq("is_active", true)
    .maybeSingle();

  const therapistPrice = toFiniteNumber(ts?.price_lkr);
  if (therapistPrice != null && therapistPrice > 0) return therapistPrice;

  const { data: svc } = await db
    .from("services")
    .select("base_price_lkr")
    .eq("service_id", serviceId)
    .maybeSingle();

  const basePrice = toFiniteNumber(svc?.base_price_lkr);
  if (basePrice != null && basePrice > 0) return basePrice;

  return null;
}
