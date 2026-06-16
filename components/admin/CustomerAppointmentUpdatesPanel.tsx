"use client";

import { useCallback, useEffect, useState } from "react";
import MaterialSymbol from "@/components/admin/MaterialSymbol";
import { iconForAuditAction } from "@/lib/audit/labels";

export type ClientAppointmentUpdateItem = {
  auditId: string;
  appointmentId: string;
  action: string;
  title: string;
  description: string;
  createdAt: string;
  actorName: string | null;
  appointmentContext: {
    serviceName: string | null;
    startAt: string | null;
  };
};

type UpdatesData = {
  items: ClientAppointmentUpdateItem[];
  total: number;
};

export default function CustomerAppointmentUpdatesPanel({
  clientId,
  enabled,
  reloadKey = 0,
}: {
  clientId: string;
  enabled: boolean;
  reloadKey?: number;
}) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [data, setData] = useState<UpdatesData | null>(null);

  const loadUpdates = useCallback(
    async (signal: AbortSignal) => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const res = await fetch(`/api/v1/admin/clients/${clientId}/updates`, {
          method: "GET",
          cache: "no-store",
          signal,
        });
        const json = (await res.json()) as {
          status?: string;
          message?: string;
          data?: UpdatesData;
        };
        if (!res.ok || json.status !== "success" || !json.data) {
          throw new Error(json.message || `Failed to load updates (HTTP ${res.status})`);
        }
        setData(json.data);
      } catch (e) {
        if ((e as { name?: string })?.name === "AbortError") return;
        setErrorMsg(e instanceof Error ? e.message : "Failed to load updates");
        setData(null);
      } finally {
        setLoading(false);
      }
    },
    [clientId],
  );

  useEffect(() => {
    if (!enabled || !clientId) return;
    const ac = new AbortController();
    void loadUpdates(ac.signal);
    return () => ac.abort();
  }, [enabled, clientId, reloadKey, loadUpdates]);

  if (!enabled) {
    return null;
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
            void loadUpdates(ac.signal);
          }}
          className="rounded-xl bg-mgmt-primary px-4 py-2 text-sm font-semibold text-mgmt-on-primary transition-opacity hover:opacity-90"
        >
          Retry
        </button>
      </div>
    );
  }

  const items = data?.items ?? [];

  if (!items.length) {
    return (
      <p className="py-12 text-center text-sm text-mgmt-on-surface-variant">
        No appointment updates yet.
      </p>
    );
  }

  return (
    <ul className="space-y-8">
      {items.map((item) => {
        const contextParts = [
          item.appointmentContext.serviceName,
          item.appointmentContext.startAt,
        ].filter(Boolean);

        return (
          <li key={item.auditId} className="flex gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-mgmt-primary-container">
              <MaterialSymbol
                name={iconForAuditAction(item.action)}
                className="text-[22px] text-mgmt-primary"
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-2 gap-y-1">
                <p className="text-sm font-semibold text-mgmt-on-surface">{item.title}</p>
                <time className="shrink-0 text-xs text-mgmt-on-surface-variant">
                  {item.createdAt}
                </time>
              </div>
              {item.actorName ? (
                <p className="mt-0.5 text-xs text-mgmt-on-surface-variant">
                  by {item.actorName}
                </p>
              ) : null}
              <p className="mt-1 text-sm leading-relaxed text-mgmt-on-surface-variant">
                {item.description}
              </p>
              {contextParts.length ? (
                <p className="mt-2 text-xs text-mgmt-on-surface-variant">
                  {contextParts.join(" · ")}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
