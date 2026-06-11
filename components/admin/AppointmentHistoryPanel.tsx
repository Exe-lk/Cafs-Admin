"use client";

import { useCallback, useEffect, useState } from "react";
import {
  labelForNotificationChannel,
  labelForNotificationType,
  labelForPaymentMethod,
} from "@/lib/calendar/notificationLabels";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export type AppointmentHistoryPayment = {
  method: "gateway" | "bank_transfer" | "cash";
  status: "paid";
  amount: number;
  currency: string;
  paidAt: string | null;
  dueAt: string | null;
  provider: string | null;
  providerPaymentRef: string | null;
  confirmedAt: string | null;
  confirmedByName: string | null;
  confirmationNote: string | null;
};

export type AppointmentHistoryNotification = {
  notificationId: string;
  channel: "email" | "sms";
  notificationType: string;
  toAddress: string;
  subject: string | null;
  provider: string | null;
  providerMessageId: string | null;
  sentAt: string | null;
  createdAt: string;
};

type HistoryData = {
  appointmentId: string;
  payment: AppointmentHistoryPayment | null;
  notifications: AppointmentHistoryNotification[];
};

export default function AppointmentHistoryPanel({
  appointmentId,
  enabled,
  reloadKey = 0,
}: {
  appointmentId: string;
  enabled: boolean;
  reloadKey?: number;
}) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [data, setData] = useState<HistoryData | null>(null);

  const loadHistory = useCallback(
    async (signal: AbortSignal) => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const res = await fetch(
          `/api/v1/admin/appointments/${appointmentId}/history`,
          { method: "GET", cache: "no-store", signal },
        );
        const json = (await res.json()) as {
          status?: string;
          message?: string;
          data?: HistoryData;
        };
        if (!res.ok || json.status !== "success" || !json.data) {
          throw new Error(json.message || `Failed to load history (HTTP ${res.status})`);
        }
        setData(json.data);
      } catch (e) {
        if ((e as { name?: string })?.name === "AbortError") return;
        setErrorMsg(e instanceof Error ? e.message : "Failed to load history");
        setData(null);
      } finally {
        setLoading(false);
      }
    },
    [appointmentId],
  );

  useEffect(() => {
    if (!enabled || !appointmentId) {
      return;
    }
    const ac = new AbortController();
    void loadHistory(ac.signal);
    return () => ac.abort();
  }, [enabled, appointmentId, reloadKey, loadHistory]);

  if (!enabled) {
    return (
      <p className="text-sm text-mgmt-on-surface-variant">
        History is available for saved appointments only.
      </p>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-mgmt-primary border-t-transparent" />
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMsg}
        </div>
        <button
          type="button"
          onClick={() => {
            const ac = new AbortController();
            void loadHistory(ac.signal);
          }}
          className="rounded-xl bg-mgmt-primary px-4 py-2 text-sm font-semibold text-mgmt-on-primary transition-opacity hover:opacity-90"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {data?.payment ? (
        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-mgmt-on-surface">Payment</h4>
          <div className="rounded-xl border border-mgmt-outline-variant/15 bg-mgmt-surface-container-low px-4 py-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-lg font-bold text-mgmt-on-surface">
                  {data.payment.currency}{" "}
                  {data.payment.amount.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
                <p className="mt-0.5 text-xs text-mgmt-on-surface-variant">
                  {labelForPaymentMethod(data.payment.method)}
                </p>
              </div>
              <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">
                Paid
              </span>
            </div>
            <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              {data.payment.paidAt ? (
                <div>
                  <dt className="text-[11px] font-semibold text-mgmt-on-surface-variant">
                    Paid at
                  </dt>
                  <dd className="text-mgmt-on-surface">{data.payment.paidAt}</dd>
                </div>
              ) : null}
              {data.payment.dueAt ? (
                <div>
                  <dt className="text-[11px] font-semibold text-mgmt-on-surface-variant">
                    Due at
                  </dt>
                  <dd className="text-mgmt-on-surface">{data.payment.dueAt}</dd>
                </div>
              ) : null}
              {data.payment.provider ? (
                <div>
                  <dt className="text-[11px] font-semibold text-mgmt-on-surface-variant">
                    Provider
                  </dt>
                  <dd className="text-mgmt-on-surface">{data.payment.provider}</dd>
                </div>
              ) : null}
              {data.payment.providerPaymentRef ? (
                <div className="sm:col-span-2">
                  <dt className="text-[11px] font-semibold text-mgmt-on-surface-variant">
                    Provider reference
                  </dt>
                  <dd className="break-all font-mono text-xs text-mgmt-on-surface">
                    {data.payment.providerPaymentRef}
                  </dd>
                </div>
              ) : null}
              {data.payment.confirmedByName ? (
                <div>
                  <dt className="text-[11px] font-semibold text-mgmt-on-surface-variant">
                    Confirmed by
                  </dt>
                  <dd className="text-mgmt-on-surface">{data.payment.confirmedByName}</dd>
                </div>
              ) : null}
              {data.payment.confirmedAt ? (
                <div>
                  <dt className="text-[11px] font-semibold text-mgmt-on-surface-variant">
                    Confirmed at
                  </dt>
                  <dd className="text-mgmt-on-surface">{data.payment.confirmedAt}</dd>
                </div>
              ) : null}
              {data.payment.confirmationNote ? (
                <div className="sm:col-span-2">
                  <dt className="text-[11px] font-semibold text-mgmt-on-surface-variant">
                    Confirmation note
                  </dt>
                  <dd className="text-mgmt-on-surface">{data.payment.confirmationNote}</dd>
                </div>
              ) : null}
            </dl>
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <h4 className="text-sm font-semibold text-mgmt-on-surface">Notifications</h4>
        {data?.notifications.length ? (
          <ul className="space-y-3">
            {data.notifications.map((n) => (
              <li
                key={n.notificationId}
                className="rounded-xl border border-mgmt-outline-variant/15 bg-white px-4 py-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-mgmt-on-surface">
                    {labelForNotificationType(n.notificationType)}
                  </p>
                  <span
                    className={cx(
                      "inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold",
                      n.channel === "sms"
                        ? "bg-violet-100 text-violet-800"
                        : "bg-sky-100 text-sky-800",
                    )}
                  >
                    {labelForNotificationChannel(n.channel)}
                  </span>
                </div>
                {n.subject ? (
                  <p className="mt-1 text-sm text-mgmt-on-surface">{n.subject}</p>
                ) : null}
                <p className="mt-1 text-xs text-mgmt-on-surface-variant">
                  To: {n.toAddress}
                </p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-mgmt-on-surface-variant">
                  {n.sentAt ? <span>Sent: {n.sentAt}</span> : null}
                  {n.provider ? <span>Provider: {n.provider}</span> : null}
                  {n.providerMessageId ? (
                    <span className="break-all">ID: {n.providerMessageId}</span>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-mgmt-on-surface-variant">
            No sent notifications for this appointment.
          </p>
        )}
      </section>
    </div>
  );
}
