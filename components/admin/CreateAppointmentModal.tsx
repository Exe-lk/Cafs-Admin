"use client";

import { useEffect, useId, useMemo, useState } from "react";
import MaterialSymbol from "@/components/admin/MaterialSymbol";

type TabKey = "service" | "class" | "event" | "reminder";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function pad2(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

function toDateInputValue(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function toTimeInputValue(d: Date) {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function addMinutes(d: Date, mins: number) {
  return new Date(d.getTime() + mins * 60_000);
}

function formatTime(d: Date) {
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export type CreateAppointmentInitialSchedule = {
  date: string;
  startTime: string;
  durationMin: number;
};

export default function CreateAppointmentModal({
  open,
  onClose,
  therapistId,
  onCreated,
  initialSchedule,
}: {
  open: boolean;
  onClose: () => void;
  therapistId?: string;
  initialSchedule?: CreateAppointmentInitialSchedule | null;
  onCreated?: (created: {
    appointmentId: string;
    therapistId: string;
    startAt: string;
    endAt: string;
    appointmentType: "online" | "in_person";
  }) => void;
}) {
  const titleId = useId();
  const [tab, setTab] = useState<TabKey>("service");

  const [services, setServices] = useState<Array<{ serviceId: string; name: string }>>([]);
  const [clients, setClients] = useState<Array<{ clientId: string; fullName: string }>>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [serviceId, setServiceId] = useState("");
  const [clientId, setClientId] = useState("");
  const [appointmentType, setAppointmentType] = useState<"online" | "in_person">("online");
  const [date, setDate] = useState(() => toDateInputValue(new Date()));
  const [startTime, setStartTime] = useState(() => {
    const now = new Date();
    now.setSeconds(0, 0);
    return toTimeInputValue(now);
  });
  const [durationMin, setDurationMin] = useState(15);
  const [videoLink, setVideoLink] = useState("");
  const [notes, setNotes] = useState("");

  const scheduleLabel = useMemo(() => {
    const [y, m, d] = date.split("-").map((x) => Number(x));
    const [hh, mm] = startTime.split(":").map((x) => Number(x));
    const start = new Date(y ?? 0, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0, 0, 0);
    const end = addMinutes(start, durationMin);
    const dayLabel = start.toLocaleDateString("en-US", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
    return `${dayLabel} · ${formatTime(start)} — ${formatTime(end)}`;
  }, [date, durationMin, startTime]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    // Defer to avoid setState-in-effect lint rule.
    queueMicrotask(() => {
      setTab("service");
      setServiceId("");
      setClientId("");
      setAppointmentType("online");
      setVideoLink("");
      setNotes("");
      setErrorMsg(null);
      if (initialSchedule) {
        setDate(initialSchedule.date);
        setStartTime(initialSchedule.startTime);
        setDurationMin(initialSchedule.durationMin);
      }
    });
  }, [open, initialSchedule]);

  useEffect(() => {
    if (!open) return;
    const ac = new AbortController();
    setLoadingData(true);
    setErrorMsg(null);
    (async () => {
      try {
        const [servicesRes, clientsRes] = await Promise.all([
          fetch("/api/v1/admin/services", { method: "GET", cache: "no-store", signal: ac.signal }),
          fetch("/api/v1/admin/clients?page=1&limit=100", {
            method: "GET",
            cache: "no-store",
            signal: ac.signal,
          }),
        ]);

        const servicesJson = (await servicesRes.json()) as any;
        const clientsJson = (await clientsRes.json()) as any;

        if (!servicesRes.ok || servicesJson?.status !== "success") {
          throw new Error(servicesJson?.message || "Failed to load services");
        }
        if (!clientsRes.ok || clientsJson?.status !== "success") {
          throw new Error(clientsJson?.message || "Failed to load clients");
        }

        const nextServices = (servicesJson.data?.items ?? []).map((s: any) => ({
          serviceId: String(s.service_id),
          name: String(s.name),
        }));
        const nextClients = (clientsJson.data?.items ?? []).map((c: any) => ({
          clientId: String(c.clientId),
          fullName: String(c.fullName),
        }));

        setServices(nextServices);
        setClients(nextClients);
      } catch (e) {
        if ((e as any)?.name === "AbortError") return;
        setErrorMsg(e instanceof Error ? e.message : "Failed to load form data");
      } finally {
        setLoadingData(false);
      }
    })();

    return () => ac.abort();
  }, [open]);

  if (!open) return null;

  const tabBtn = (key: TabKey, label: string) => {
    const active = tab === key;
    return (
      <button
        key={key}
        type="button"
        onClick={() => setTab(key)}
        className={cx(
          "px-3 py-2.5 text-sm",
          active
            ? "font-semibold text-mgmt-primary border-b-2 border-mgmt-primary"
            : "font-medium text-mgmt-on-surface-variant hover:text-mgmt-on-surface",
        )}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-mgmt-inverse-surface/10 backdrop-blur-[2px]">
      <button
        type="button"
        aria-label="Close dialog"
        className="fixed inset-0"
        onClick={onClose}
      />

      <div className="relative z-[101] flex min-h-full items-start justify-center p-4 sm:items-center sm:p-6">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="flex w-full max-w-[480px] flex-col overflow-hidden rounded-xl bg-white shadow-[0_10px_40px_-10px_rgba(47,51,52,0.15)]"
          style={{ maxHeight: "calc(100vh - 2rem)" }}
        >
          <div className="flex items-center justify-between px-6 pt-5 pb-3">
            <h3 id={titleId} className="text-lg font-semibold text-mgmt-on-surface">
              Appointment
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1 text-mgmt-on-surface-variant transition-colors hover:bg-mgmt-surface-container-low"
              aria-label="Close"
            >
              <MaterialSymbol name="close" className="text-xl" />
            </button>
          </div>

          <div className="flex px-6 border-b border-mgmt-surface-container-low">
            {tabBtn("service", "Service")}
            {tabBtn("class", "Class")}
            {tabBtn("event", "Event")}
            {tabBtn("reminder", "Reminder")}
          </div>

          <div className="min-h-0 flex-1 space-y-7 overflow-y-auto px-6 py-6">
            {errorMsg ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMsg}
              </div>
            ) : null}
            <div className="flex items-start gap-4">
            <div className="mt-0.5">
              <div className="h-5 w-5 rounded-full border-2 border-slate-300" />
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium text-mgmt-on-surface-variant">Select a service</label>
              <div className="mt-2">
                <select
                  value={serviceId}
                  onChange={(e) => setServiceId(e.target.value)}
                  className="h-10 w-full rounded-lg bg-mgmt-surface-container-low px-3 text-sm text-mgmt-on-surface outline-none ring-1 ring-transparent focus:ring-mgmt-primary/30 disabled:opacity-60"
                  disabled={loadingData || services.length === 0}
                  aria-label="Service"
                >
                  <option value="">{loadingData ? "Loading services…" : "Select a service"}</option>
                  {services.map((s) => (
                    <option key={s.serviceId} value={s.serviceId}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <MaterialSymbol name="schedule" className="mt-0.5 text-slate-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-mgmt-on-surface">{scheduleLabel}</p>
              <div className="mt-3 grid grid-cols-3 gap-3">
                <div className="col-span-3">
                  <label className="block text-[11px] font-semibold text-mgmt-on-surface-variant">
                    Appointment type
                  </label>
                  <select
                    value={appointmentType}
                    onChange={(e) => setAppointmentType(e.target.value as "online" | "in_person")}
                    className="mt-1 h-10 w-full rounded-lg bg-mgmt-surface-container-low px-3 text-sm text-mgmt-on-surface outline-none ring-1 ring-transparent focus:ring-mgmt-primary/30"
                    aria-label="Appointment type"
                  >
                    <option value="online">Online</option>
                    <option value="in_person">In-person</option>
                  </select>
                </div>
                <div className="col-span-3 sm:col-span-1">
                  <label className="block text-[11px] font-semibold text-mgmt-on-surface-variant">
                    Date
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="mt-1 w-full rounded-lg bg-mgmt-surface-container-low px-3 py-2 text-sm text-mgmt-on-surface outline-none ring-1 ring-transparent focus:ring-mgmt-primary/30"
                  />
                </div>
                <div className="col-span-3 sm:col-span-1">
                  <label className="block text-[11px] font-semibold text-mgmt-on-surface-variant">
                    Start time
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="mt-1 w-full rounded-lg bg-mgmt-surface-container-low px-3 py-2 text-sm text-mgmt-on-surface outline-none ring-1 ring-transparent focus:ring-mgmt-primary/30"
                  />
                </div>
                <div className="col-span-3 sm:col-span-1">
                  <label className="block text-[11px] font-semibold text-mgmt-on-surface-variant">
                    Duration
                  </label>
                  <select
                    value={durationMin}
                    onChange={(e) => setDurationMin(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg bg-mgmt-surface-container-low px-3 py-2 text-sm text-mgmt-on-surface outline-none ring-1 ring-transparent focus:ring-mgmt-primary/30"
                  >
                    {[15, 30, 45, 60, 75, 90, 120].map((m) => (
                      <option key={m} value={m}>
                        {m} min
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <MaterialSymbol name="person" className="mt-0.5 text-slate-400" />
            <div className="flex-1">
              <label className="text-sm font-medium text-mgmt-on-surface-variant">Add guest(s)</label>
              <div className="mt-2">
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="h-10 w-full rounded-lg bg-mgmt-surface-container-low px-3 text-sm text-mgmt-on-surface outline-none ring-1 ring-transparent focus:ring-mgmt-primary/30 disabled:opacity-60"
                  disabled={loadingData || clients.length === 0}
                  aria-label="Client"
                >
                  <option value="">{loadingData ? "Loading clients…" : "Select a client"}</option>
                  {clients.map((c) => (
                    <option key={c.clientId} value={c.clientId}>
                      {c.fullName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <MaterialSymbol name="videocam" className="mt-0.5 text-slate-400" />
            <div className="flex-1">
              <label className="text-sm font-medium text-mgmt-on-surface">Video link</label>
              <div className="mt-2">
                <input
                  value={videoLink}
                  onChange={(e) => setVideoLink(e.target.value)}
                  placeholder="Paste meeting URL…"
                  className="w-full rounded-lg bg-mgmt-surface-container-low px-3 py-2 text-sm text-mgmt-on-surface outline-none ring-1 ring-transparent focus:ring-mgmt-primary/30"
                />
              </div>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <MaterialSymbol name="notes" className="mt-0.5 text-slate-400" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <label className="truncate text-sm font-medium text-mgmt-on-surface-variant">
                  Notes to provider and guest(s)
                </label>

              </div>
              <div className="mt-2">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Type notes…"
                  className="min-h-24 w-full resize-none rounded-lg bg-mgmt-surface-container-low px-3 py-2 text-sm text-mgmt-on-surface outline-none ring-1 ring-transparent focus:ring-mgmt-primary/30"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex h-5 w-5 items-center justify-center" />
            <div className="flex items-center gap-2 rounded-full border border-mgmt-surface-container-low bg-mgmt-surface-container-lowest py-0.5 pl-0.5 pr-3">
            </div>
          </div>

          {tab !== "service" && (
            <div className="rounded-xl border border-mgmt-outline-variant/20 bg-mgmt-surface-container-lowest p-4 text-sm text-mgmt-on-surface-variant">
              This tab is UI-only for now.
            </div>
          )}
          </div>

          <div className="flex justify-end border-t border-mgmt-surface-container-low p-4">
            <button
              type="button"
              disabled={submitting || loadingData || !serviceId || !clientId || !therapistId}
              className="rounded-xl bg-black px-8 py-2.5 text-sm font-bold text-white transition-transform active:scale-95 disabled:opacity-40"
              onClick={async () => {
                if (!therapistId) {
                  setErrorMsg("Select a therapist first.");
                  return;
                }
                if (!serviceId || !clientId) {
                  setErrorMsg("Select a service and a client.");
                  return;
                }
                setSubmitting(true);
                setErrorMsg(null);
                try {
                  const [y, m, d] = date.split("-").map((x) => Number(x));
                  const [hh, mm] = startTime.split(":").map((x) => Number(x));
                  const start = new Date(y ?? 0, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0, 0, 0);
                  const end = addMinutes(start, durationMin);

                  const res = await fetch("/api/v1/admin/appointments", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({
                      client: { clientId },
                      therapistId,
                      serviceId,
                      appointmentType,
                      startAt: start.toISOString(),
                      endAt: end.toISOString(),
                      note: notes || undefined,
                      videoLink: videoLink || undefined,
                    }),
                  });
                  const json = (await res.json()) as any;
                  if (!res.ok || json?.status !== "success") {
                    throw new Error(json?.message || `Create failed (HTTP ${res.status})`);
                  }
                  const appointmentId = String(json?.data?.appointmentId ?? "");
                  if (!appointmentId) throw new Error("Create succeeded but no appointmentId returned");

                  onCreated?.({
                    appointmentId,
                    therapistId,
                    startAt: start.toISOString(),
                    endAt: end.toISOString(),
                    appointmentType,
                  });
                  onClose();
                } catch (e) {
                  setErrorMsg(e instanceof Error ? e.message : "Failed to create appointment");
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              Create
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

