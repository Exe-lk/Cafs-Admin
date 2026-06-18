import type { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ok, err } from "@/lib/api/envelope";
import { getAuthContext, requireRoleService } from "@/lib/api/auth";
import { parseIntParam, rangeFromPageLimit } from "@/lib/api/http";
import { LISTABLE_APPOINTMENT_STATUSES } from "@/lib/calendar/appointmentStatus";
import { resolveBankSlipProofUrl } from "@/lib/calendar/bankSlipProof";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import {
  DEFAULT_THERAPIST_TIMEZONE,
  addDaysToYMD,
  formatDbUtcTimestamp,
  normalizeTimeZone,
  parseDbUtcTimestamp,
  startOfDayUtcInTimeZone,
  zonedLocalYmdTimeToUtc,
  type YMD,
} from "@/lib/timezone";

type ListableStatus = (typeof LISTABLE_APPOINTMENT_STATUSES)[number];
type TimeScope = "upcoming" | "past" | "all";
type PaymentMethodFilter = "gateway" | "bank_transfer" | "cash" | "none";

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

type AppointmentCounts = {
  all: number;
  pending_payment: number;
  pending_confirmation: number;
  confirmed: number;
};

type ListFilters = {
  clientId: string | null;
  statusParam: string | null;
  qText: string | null;
  therapistId: string | null;
  serviceId: string | null;
  paymentMethod: PaymentMethodFilter | null;
  dateYmd: YMD | null;
  dateTimeZone: string;
  timeScope: TimeScope;
  searchOrFilter: string | null;
  searchEmpty: boolean;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AppointmentQuery = any;

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

function parseBooleanQueryParam(value: string | null): boolean | null {
  if (value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;
  return null;
}

function parseDateParam(raw: string | null): YMD | null {
  if (!raw) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  return { year, month, day };
}

function resolveTimeScope(
  timeScopeParam: string | null,
  upcomingOnlyParam: boolean | null,
  clientId: string | null,
): TimeScope {
  if (timeScopeParam === "upcoming" || timeScopeParam === "past" || timeScopeParam === "all") {
    return timeScopeParam;
  }
  const upcomingOnly = upcomingOnlyParam ?? !clientId;
  return upcomingOnly ? "upcoming" : "all";
}

function appointmentSelectString(paymentMethod: PaymentMethodFilter | null): string {
  const paymentsEmbed =
    paymentMethod && paymentMethod !== "none"
      ? "payments!inner(method, status, amount, currency, provider_payload, paid_at)"
      : "payments(method, status, amount, currency, provider_payload, paid_at)";

  return `
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
      ${paymentsEmbed},
      client:profiles!appointments_client_id_fkey(user_id, full_name, email, phone),
      therapist:therapists!appointments_therapist_id_fkey(therapist_id, timezone, profile_photo_url),
      service:services!appointments_service_id_fkey(service_id, name, base_price_lkr)
    `;
}

function applyListFilters(
  query: AppointmentQuery,
  filters: ListFilters,
  opts?: { applyStatus?: boolean },
): AppointmentQuery {
  const applyStatus = opts?.applyStatus ?? true;

  if (filters.searchEmpty) {
    return query.eq("appointment_id", "00000000-0000-0000-0000-000000000000");
  }

  if (filters.clientId) {
    query = query.eq("client_id", filters.clientId);
  }

  if (applyStatus) {
    if (filters.statusParam) {
      query = query.eq("status", filters.statusParam);
    } else if (filters.clientId) {
      query = query.in("status", [
        ...LISTABLE_APPOINTMENT_STATUSES,
        "completed",
        "cancelled",
        "no_show",
        "expired",
      ]);
    } else {
      query = query.in("status", [...LISTABLE_APPOINTMENT_STATUSES]);
    }
  } else if (filters.clientId) {
    query = query.in("status", [
      ...LISTABLE_APPOINTMENT_STATUSES,
      "completed",
      "cancelled",
      "no_show",
      "expired",
    ]);
  } else {
    query = query.in("status", [...LISTABLE_APPOINTMENT_STATUSES]);
  }

  if (filters.therapistId) {
    query = query.eq("therapist_id", filters.therapistId);
  }

  if (filters.serviceId) {
    query = query.eq("service_id", filters.serviceId);
  }

  const startOfToday = startOfDayUtcInTimeZone(new Date(), DEFAULT_THERAPIST_TIMEZONE);
  if (filters.timeScope === "upcoming") {
    query = query.gte("start_at", startOfToday.toISOString());
  } else if (filters.timeScope === "past") {
    query = query.lt("start_at", startOfToday.toISOString());
  }

  if (filters.dateYmd) {
    const dayStart = zonedLocalYmdTimeToUtc(filters.dateYmd, "00:00", filters.dateTimeZone);
    const nextDay = addDaysToYMD(filters.dateYmd, 1);
    const dayEnd = zonedLocalYmdTimeToUtc(nextDay, "00:00", filters.dateTimeZone);
    query = query.gte("start_at", dayStart.toISOString()).lt("start_at", dayEnd.toISOString());
  }

  if (filters.searchOrFilter) {
    query = query.or(filters.searchOrFilter);
  }

  if (filters.paymentMethod === "none") {
    query = query.is("payments", null);
  } else if (filters.paymentMethod) {
    query = query.eq("payments.method", filters.paymentMethod);
  }

  return query;
}

async function resolveSearchOrFilter(
  adminSupabase: SupabaseClient,
  qText: string,
): Promise<{ searchOrFilter: string | null; searchEmpty: boolean }> {
  const needle = `%${qText}%`;

  const [clientsRes, therapistsRes, servicesRes] = await Promise.all([
    adminSupabase
      .from("profiles")
      .select("user_id")
      .or(`full_name.ilike.${needle},email.ilike.${needle},phone.ilike.${needle}`),
    adminSupabase
      .from("profiles")
      .select("user_id")
      .eq("role", "therapist")
      .ilike("full_name", needle),
    adminSupabase.from("services").select("service_id").ilike("name", needle),
  ]);

  if (clientsRes.error) throw new Error(clientsRes.error.message);
  if (therapistsRes.error) throw new Error(therapistsRes.error.message);
  if (servicesRes.error) throw new Error(servicesRes.error.message);

  const clientIds = (clientsRes.data ?? [])
    .map((row) => str((row as { user_id?: string }).user_id))
    .filter(Boolean);
  const therapistIds = (therapistsRes.data ?? [])
    .map((row) => str((row as { user_id?: string }).user_id))
    .filter(Boolean);
  const serviceIds = (servicesRes.data ?? [])
    .map((row) => str((row as { service_id?: string }).service_id))
    .filter(Boolean);

  const orParts: string[] = [];
  if (clientIds.length) orParts.push(`client_id.in.(${clientIds.join(",")})`);
  if (therapistIds.length) orParts.push(`therapist_id.in.(${therapistIds.join(",")})`);
  if (serviceIds.length) orParts.push(`service_id.in.(${serviceIds.join(",")})`);

  if (!orParts.length) return { searchOrFilter: null, searchEmpty: true };
  return { searchOrFilter: orParts.join(","), searchEmpty: false };
}

function statusCountSelectString(paymentMethod: PaymentMethodFilter | null): string {
  if (paymentMethod && paymentMethod !== "none") {
    return "status, payments!inner(method)";
  }
  if (paymentMethod === "none") {
    return "status, payments(method)";
  }
  return "status";
}

async function computeStatusCounts(
  adminSupabase: SupabaseClient,
  filters: ListFilters,
): Promise<AppointmentCounts> {
  if (filters.searchEmpty) {
    return { all: 0, pending_payment: 0, pending_confirmation: 0, confirmed: 0 };
  }

  let query = adminSupabase
    .from("appointments")
    .select(statusCountSelectString(filters.paymentMethod));
  query = applyListFilters(query, filters, { applyStatus: false });

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const counts: AppointmentCounts = {
    all: 0,
    pending_payment: 0,
    pending_confirmation: 0,
    confirmed: 0,
  };

  for (const row of data ?? []) {
    const status = str((row as { status?: string }).status);
    if (status === "pending_payment") counts.pending_payment += 1;
    else if (status === "pending_confirmation") counts.pending_confirmation += 1;
    else if (status === "confirmed") counts.confirmed += 1;
    if (LISTABLE_APPOINTMENT_STATUSES.includes(status as ListableStatus)) {
      counts.all += 1;
    }
  }

  return counts;
}

async function mapRowsToItems(
  adminSupabase: SupabaseClient,
  rows: AppointmentRow[],
) {
  const therapistIds = [...new Set(rows.map((r) => r.therapist_id).filter(Boolean))];

  const therapistNameById = new Map<string, string>();
  if (therapistIds.length > 0) {
    const { data: therapistProfiles, error: profileError } = await adminSupabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", therapistIds);
    if (profileError) throw new Error(profileError.message);
    for (const p of therapistProfiles ?? []) {
      const row = p as { user_id?: string; full_name?: string | null };
      if (row.user_id) {
        therapistNameById.set(row.user_id, str(row.full_name));
      }
    }
  }

  return Promise.all(
    rows.map(async (row) => {
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
  const clientId = sp.get("clientId")?.trim() || null;
  const qText = sp.get("q")?.trim() || null;
  const therapistId = sp.get("therapistId")?.trim() || null;
  const serviceId = sp.get("serviceId")?.trim() || null;
  const dateParam = sp.get("date")?.trim() || null;
  const paymentMethodRaw = sp.get("paymentMethod")?.trim() || null;
  const upcomingOnlyParam = parseBooleanQueryParam(sp.get("upcomingOnly"));
  const timeScope = resolveTimeScope(
    sp.get("timeScope")?.trim() || null,
    upcomingOnlyParam,
    clientId,
  );

  const paymentMethods: PaymentMethodFilter[] = [
    "gateway",
    "bank_transfer",
    "cash",
    "none",
  ];
  const paymentMethod =
    paymentMethodRaw &&
    paymentMethods.includes(paymentMethodRaw as PaymentMethodFilter)
      ? (paymentMethodRaw as PaymentMethodFilter)
      : null;

  if (
    statusParam &&
    !LISTABLE_APPOINTMENT_STATUSES.includes(statusParam as ListableStatus)
  ) {
    return err(`Invalid status filter "${statusParam}"`, 400);
  }

  const dateYmd = parseDateParam(dateParam);
  if (dateParam && !dateYmd) {
    return err(`Invalid date filter "${dateParam}"`, 400);
  }

  const paginate = !clientId || sp.has("page") || sp.has("limit");
  const page = parseIntParam(sp.get("page"), 1, { min: 1, max: 10_000 });
  const limit = parseIntParam(sp.get("limit"), 30, { min: 1, max: 100 });
  const { from, to, page: safePage, limit: safeLimit } = rangeFromPageLimit(page, limit);

  const adminSupabase = createSupabaseServiceRoleClient();

  let dateTimeZone = DEFAULT_THERAPIST_TIMEZONE;
  if (therapistId) {
    const { data: therapistRow, error: therapistError } = await adminSupabase
      .from("therapists")
      .select("timezone")
      .eq("therapist_id", therapistId)
      .maybeSingle();
    if (therapistError) return err(therapistError.message, 400);
    if (therapistRow?.timezone) {
      dateTimeZone = normalizeTimeZone(str(therapistRow.timezone));
    }
  }

  let searchOrFilter: string | null = null;
  let searchEmpty = false;
  if (qText) {
    try {
      const search = await resolveSearchOrFilter(adminSupabase, qText);
      searchOrFilter = search.searchOrFilter;
      searchEmpty = search.searchEmpty;
    } catch (e) {
      return err(e instanceof Error ? e.message : "Search failed", 400);
    }
  }

  const filters: ListFilters = {
    clientId,
    statusParam,
    qText,
    therapistId,
    serviceId,
    paymentMethod,
    dateYmd,
    dateTimeZone,
    timeScope,
    searchOrFilter,
    searchEmpty,
  };

  const ascending = timeScope !== "past";
  const selectString = appointmentSelectString(paymentMethod);

  let listQuery = adminSupabase
    .from("appointments")
    .select(selectString, paginate ? { count: "exact" } : undefined)
    .order("start_at", { ascending });

  listQuery = applyListFilters(listQuery, filters);

  if (paginate) {
    listQuery = listQuery.range(from, to);
  }

  const includeStatusCounts = !clientId;

  try {
    const [listResult, statusCounts] = await Promise.all([
      listQuery,
      includeStatusCounts ? computeStatusCounts(adminSupabase, filters) : Promise.resolve(null),
    ]);

    if (listResult.error) return err(listResult.error.message, 400);

    const rows = (listResult.data ?? []) as unknown as AppointmentRow[];
    const items = await mapRowsToItems(adminSupabase, rows);

    const totalItems = paginate ? (listResult.count ?? items.length) : items.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / safeLimit));

    const res = ok(
      {
        items,
        total: totalItems,
        ...(paginate
          ? {
              pagination: {
                totalItems,
                page: safePage,
                limit: safeLimit,
                totalPages,
              },
            }
          : {}),
        ...(statusCounts ? { statusCounts } : {}),
      },
      "Appointments retrieved successfully",
    );
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (e) {
    return err(e instanceof Error ? e.message : "Failed to load appointments", 400);
  }
}
