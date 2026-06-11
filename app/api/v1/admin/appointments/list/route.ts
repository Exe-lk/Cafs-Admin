import type { NextRequest } from "next/server";
import { ok, err } from "@/lib/api/envelope";
import { getAuthContext, requireRoleService } from "@/lib/api/auth";
import { LISTABLE_APPOINTMENT_STATUSES } from "@/lib/calendar/appointmentStatus";
import { resolveBankSlipProofUrl } from "@/lib/calendar/bankSlipProof";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { formatDbUtcTimestamp, normalizeTimeZone, parseDbUtcTimestamp } from "@/lib/timezone";

type ListableStatus = (typeof LISTABLE_APPOINTMENT_STATUSES)[number];

type PaymentRow = {
  method?: "gateway" | "bank_transfer" | "cash";
  status?: string;
  amount?: number | string;
  currency?: string;
  provider_payload?: string | null;
  paid_at?: string | null;
};

type AppointmentRow = {
  appointment_id: string;
  status: string;
  appointment_type: "online" | "in_person";
  start_at: string;
  end_at: string;
  payment_due_at: string | null;
  created_at: string;
  client_id: string;
  therapist_id: string;
  service_id: string;
  payments: PaymentRow | PaymentRow[] | null;
  client:
    | {
        user_id?: string;
        full_name?: string | null;
        email?: string | null;
        phone?: string | null;
      }
    | Array<{
        user_id?: string;
        full_name?: string | null;
        email?: string | null;
        phone?: string | null;
      }>
    | null;
  therapist:
    | {
        therapist_id?: string;
        timezone?: string | null;
        profile_photo_url?: string | null;
      }
    | Array<{
        therapist_id?: string;
        timezone?: string | null;
        profile_photo_url?: string | null;
      }>
    | null;
  service:
    | {
        service_id?: string;
        name?: string | null;
        base_price_lkr?: number | string | null;
      }
    | Array<{
        service_id?: string;
        name?: string | null;
        base_price_lkr?: number | string | null;
      }>
    | null;
};

function firstOrSelf<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function str(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function formatOptionalTimestamp(value: string | null | undefined): string | null {
  if (!value) return null;
  const parsed = parseDbUtcTimestamp(value);
  return parsed ? formatDbUtcTimestamp(parsed) : value;
}

function matchesSearch(row: AppointmentRow, therapistName: string, q: string): boolean {
  const needle = q.toLowerCase();
  const client = firstOrSelf(row.client);
  const service = firstOrSelf(row.service);
  const haystacks = [
    str(client?.full_name),
    str(client?.email),
    str(client?.phone),
    therapistName,
    str(service?.name),
  ];
  return haystacks.some((h) => h.toLowerCase().includes(needle));
}

export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request);
  if (!auth.ok) return err("Unauthorized", 401);
  const roleCheck = await requireRoleService(auth.ctx.user.id, [
    "admin",
    "front_office",
  ]);
  if (!roleCheck.ok) return err("Forbidden", 403);

  const sp = request.nextUrl.searchParams;
  const statusParam = sp.get("status")?.trim() || null;
  const qText = sp.get("q")?.trim() || null;

  if (
    statusParam &&
    !LISTABLE_APPOINTMENT_STATUSES.includes(statusParam as ListableStatus)
  ) {
    return err(`Invalid status filter "${statusParam}"`, 400);
  }

  const adminSupabase = createSupabaseServiceRoleClient();
  let q = adminSupabase
    .from("appointments")
    .select(
      `
      appointment_id,
      status,
      appointment_type,
      start_at,
      end_at,
      payment_due_at,
      created_at,
      client_id,
      therapist_id,
      service_id,
      payments(method, status, amount, currency, provider_payload, paid_at),
      client:profiles!appointments_client_id_fkey(user_id, full_name, email, phone),
      therapist:therapists!appointments_therapist_id_fkey(therapist_id, timezone, profile_photo_url),
      service:services!appointments_service_id_fkey(service_id, name, base_price_lkr)
    `,
    )
    .order("start_at", { ascending: true });

  if (statusParam) {
    q = q.eq("status", statusParam);
  } else {
    q = q.in("status", [...LISTABLE_APPOINTMENT_STATUSES]);
  }

  const { data, error } = await q;
  if (error) return err(error.message, 400);

  const rows = (data ?? []) as AppointmentRow[];
  const therapistIds = [...new Set(rows.map((r) => r.therapist_id).filter(Boolean))];

  const therapistNameById = new Map<string, string>();
  if (therapistIds.length > 0) {
    const { data: therapistProfiles, error: profileError } = await adminSupabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", therapistIds);
    if (profileError) return err(profileError.message, 400);
    for (const p of therapistProfiles ?? []) {
      const row = p as { user_id?: string; full_name?: string | null };
      if (row.user_id) {
        therapistNameById.set(row.user_id, str(row.full_name));
      }
    }
  }

  const filteredRows = qText
    ? rows.filter((row) =>
        matchesSearch(row, therapistNameById.get(row.therapist_id) ?? "", qText),
      )
    : rows;

  const items = await Promise.all(
    filteredRows.map(async (row) => {
      const proofUrl = await resolveBankSlipProofUrl(adminSupabase, row);
      const client = firstOrSelf(row.client);
      const therapist = firstOrSelf(row.therapist);
      const service = firstOrSelf(row.service);
      const payment = firstOrSelf(row.payments);

      const startUtc = parseDbUtcTimestamp(row.start_at);
      const endUtc = parseDbUtcTimestamp(row.end_at);

      return {
        appointmentId: row.appointment_id,
        status: row.status as ListableStatus,
        appointmentType: row.appointment_type,
        startAt: startUtc ? formatDbUtcTimestamp(startUtc) : row.start_at,
        endAt: endUtc ? formatDbUtcTimestamp(endUtc) : row.end_at,
        paymentDueAt: formatOptionalTimestamp(row.payment_due_at),
        createdAt: formatOptionalTimestamp(row.created_at) ?? row.created_at,
        proofUrl,
        client: {
          clientId: str(client?.user_id) || row.client_id,
          fullName: str(client?.full_name),
          email: str(client?.email),
          phone: str(client?.phone),
        },
        therapist: {
          therapistId: str(therapist?.therapist_id) || row.therapist_id,
          fullName: therapistNameById.get(row.therapist_id) ?? "",
          timezone: normalizeTimeZone(str(therapist?.timezone)),
          profilePhotoUrl: therapist?.profile_photo_url ?? null,
        },
        service: {
          serviceId: str(service?.service_id) || row.service_id,
          name: str(service?.name),
          basePriceLkr:
            service?.base_price_lkr == null ? null : Number(service.base_price_lkr),
        },
        payment: payment
          ? {
              method: payment.method ?? null,
              status: str(payment.status),
              amount: payment.amount == null ? null : Number(payment.amount),
              currency: str(payment.currency) || "LKR",
              paidAt: formatOptionalTimestamp(payment.paid_at),
            }
          : null,
      };
    }),
  );

  const res = ok(
    {
      items,
      total: items.length,
    },
    "Appointments retrieved successfully",
  );
  res.headers.set("Cache-Control", "no-store");
  return res;
}
