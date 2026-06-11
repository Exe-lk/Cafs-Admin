import type { NextRequest } from "next/server";
import { ok, err } from "@/lib/api/envelope";
import { getAuthContext, requireRoleService } from "@/lib/api/auth";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { formatDbUtcTimestamp, parseDbUtcTimestamp } from "@/lib/timezone";

type PaymentRow = {
  method?: "gateway" | "bank_transfer" | "cash";
  status?: string;
  amount?: number | string;
  currency?: string;
  paid_at?: string | null;
  due_at?: string | null;
  provider?: string | null;
  provider_payment_ref?: string | null;
  confirmed_at?: string | null;
  confirmation_note?: string | null;
  confirmer?:
    | { full_name?: string | null }
    | Array<{ full_name?: string | null }>
    | null;
};

type NotificationRow = {
  notification_id: string;
  channel?: "email" | "sms";
  type?: string;
  status?: string;
  to_address?: string;
  subject?: string | null;
  provider?: string | null;
  provider_message_id?: string | null;
  sent_at?: string | null;
  created_at?: string;
};

type AppointmentHistoryRow = {
  appointment_id: string;
  payments: PaymentRow | PaymentRow[] | null;
  notification_outbox: NotificationRow | NotificationRow[] | null;
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ appointmentId: string }> },
) {
  const { appointmentId } = await params;
  const auth = await getAuthContext(request);
  if (!auth.ok) return err("Unauthorized", 401);
  const roleCheck = await requireRoleService(auth.ctx.user.id, [
    "admin",
    "front_office",
  ]);
  if (!roleCheck.ok) return err("Forbidden", 403);

  const adminSupabase = createSupabaseServiceRoleClient();
  const { data, error } = await adminSupabase
    .from("appointments")
    .select(
      `
      appointment_id,
      payments(
        method,
        status,
        amount,
        currency,
        paid_at,
        due_at,
        provider,
        provider_payment_ref,
        confirmed_at,
        confirmation_note,
        confirmer:profiles!payments_confirmed_by_fkey(full_name)
      ),
      notification_outbox(
        notification_id,
        channel,
        type,
        status,
        to_address,
        subject,
        provider,
        provider_message_id,
        sent_at,
        created_at
      )
    `,
    )
    .eq("appointment_id", appointmentId)
    .maybeSingle();

  if (error) return err(error.message, 400);
  if (!data) return err("Appointment not found", 404);

  const row = data as AppointmentHistoryRow;
  const paymentRow = firstOrSelf(row.payments);
  const payment =
    paymentRow && str(paymentRow.status) === "paid"
      ? {
          method: paymentRow.method as "gateway" | "bank_transfer" | "cash",
          status: "paid" as const,
          amount: paymentRow.amount == null ? 0 : Number(paymentRow.amount),
          currency: str(paymentRow.currency) || "LKR",
          paidAt: formatOptionalTimestamp(paymentRow.paid_at),
          dueAt: formatOptionalTimestamp(paymentRow.due_at),
          provider: paymentRow.provider ?? null,
          providerPaymentRef: paymentRow.provider_payment_ref ?? null,
          confirmedAt: formatOptionalTimestamp(paymentRow.confirmed_at),
          confirmedByName: str(firstOrSelf(paymentRow.confirmer)?.full_name) || null,
          confirmationNote: paymentRow.confirmation_note ?? null,
        }
      : null;

  const notificationRows = Array.isArray(row.notification_outbox)
    ? row.notification_outbox
    : row.notification_outbox
      ? [row.notification_outbox]
      : [];

  const notifications = notificationRows
    .filter((n) => str(n.status) === "sent")
    .sort((a, b) => {
      const aTime = parseDbUtcTimestamp(str(a.created_at))?.getTime() ?? 0;
      const bTime = parseDbUtcTimestamp(str(b.created_at))?.getTime() ?? 0;
      return bTime - aTime;
    })
    .map((n) => ({
      notificationId: n.notification_id,
      channel: (n.channel ?? "email") as "email" | "sms",
      notificationType: str(n.type),
      toAddress: str(n.to_address),
      subject: n.subject ?? null,
      provider: n.provider ?? null,
      providerMessageId: n.provider_message_id ?? null,
      sentAt: formatOptionalTimestamp(n.sent_at),
      createdAt: formatOptionalTimestamp(n.created_at) ?? str(n.created_at),
    }));

  const res = ok(
    {
      appointmentId: row.appointment_id,
      payment,
      notifications,
    },
    "Appointment history retrieved successfully",
  );
  res.headers.set("Cache-Control", "no-store");
  return res;
}
