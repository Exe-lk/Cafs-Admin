"use client";

import { useEffect, useMemo, useState } from "react";
import MaterialSymbol from "@/components/admin/MaterialSymbol";
import { useAdminTherapist } from "@/components/admin/AdminTherapistContext";

type TimeOffItem = {
  id: string;
  title: string;
  start: string; // ISO date string YYYY-MM-DD
  end: string; // ISO date string YYYY-MM-DD
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatDateRange(start: string, end: string) {
  const s = new Date(`${start}T00:00:00`);
  const e = new Date(`${end}T00:00:00`);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };
  const sTxt = s.toLocaleDateString("en-GB", opts);
  const eTxt = e.toLocaleDateString("en-GB", opts);
  return `${sTxt} – ${eTxt}`;
}

function daysInclusive(start: string, end: string) {
  const s = new Date(`${start}T00:00:00`).getTime();
  const e = new Date(`${end}T00:00:00`).getTime();
  const diff = Math.round((e - s) / (1000 * 60 * 60 * 24));
  return Math.max(1, diff + 1);
}

export default function TheraphistSettingsTimeOffPage() {
  const { selectedId } = useAdminTherapist();
  const basePath = selectedId
    ? `/api/v1/admin/therapists/${selectedId}/time-blocks`
    : "/api/v1/therapists/me/time-blocks";
  const [items, setItems] = useState<TimeOffItem[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const todayIso = useMemo(() => toIsoDate(new Date()), []);
  const [draft, setDraft] = useState<TimeOffItem>({
    id: "draft",
    title: "",
    start: todayIso,
    end: todayIso,
  });
  const [allDay, setAllDay] = useState(true);
  const [repeat, setRepeat] = useState("Does not repeat");

  const draftDuration = useMemo(() => daysInclusive(draft.start, draft.end), [draft.end, draft.start]);

  useEffect(() => {
    if (!selectedId) return;
    const ac = new AbortController();
    setLoading(true);
    setErrorMsg(null);
    (async () => {
      try {
        const res = await fetch(
          `${basePath}?scope=time_off`,
          {
            method: "GET",
            cache: "no-store",
            signal: ac.signal,
          },
        );
        const json: unknown = await res.json();
        if (!res.ok || !isSuccessEnvelope(json) || !json.data) {
          throw new Error(
            (isEnvelope(json) && typeof json.message === "string" && json.message) ||
              `Failed to load time off (HTTP ${res.status})`,
          );
        }

        const items = (json.data as { items?: unknown })?.items;
        const rows = Array.isArray(items) ? items : [];
        const next = rows.map((r) => {
          const rec = (r && typeof r === "object" ? (r as Record<string, unknown>) : {}) as Record<
            string,
            unknown
          >;
          const startAtRaw = rec.startAt ?? rec.start_at;
          const endAtRaw = rec.endAt ?? rec.end_at;
          const startAt = new Date(String(startAtRaw ?? ""));
          const endAtExcl = new Date(String(endAtRaw ?? ""));
          const start = toIsoDate(startAt);
          const endIncl = new Date(endAtExcl.getTime() - 86_400_000);
          const end = toIsoDate(endIncl);
          const reason = typeof rec.reason === "string" ? rec.reason : "";
          const title = reason.startsWith("time-off:") ? reason.slice("time-off:".length).trim() : "Time off";
          return {
            id: String(rec.timeBlockId ?? rec.time_block_id ?? ""),
            title: title || "Time off",
            start,
            end,
          } satisfies TimeOffItem;
        });
        setItems(next);
      } catch (e) {
        if (typeof e === "object" && e !== null && "name" in e && (e as { name?: unknown }).name === "AbortError")
          return;
        setErrorMsg(e instanceof Error ? e.message : "Failed to load time off");
        setItems([]);
      } finally {
        setLoading(false);
      }
    })();
    return () => ac.abort();
  }, [basePath, selectedId]);

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-8 lg:px-12 lg:py-10">
      <div className="max-w-3xl space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="mb-1 text-lg font-semibold text-mgmt-on-surface">Time off</h3>
            <p className="-mt-2 text-sm text-mgmt-on-surface-variant">
              Block dates where this therapist should not be bookable.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSaveError(null);
              setDraft((p) => ({ ...p, start: todayIso, end: todayIso, title: "" }));
              setModalOpen(true);
            }}
            className="h-10 shrink-0 rounded-xl bg-mgmt-primary px-4 text-sm font-semibold text-mgmt-on-primary shadow-sm transition-opacity hover:opacity-90"
          >
            + Add time off
          </button>
        </div>

        {loading ? <p className="text-sm text-mgmt-on-surface-variant">Loading…</p> : null}
        {errorMsg ? <p className="text-sm text-red-700">{errorMsg}</p> : null}

        {items.length === 0 ? (
          <div className="rounded-2xl border border-mgmt-outline-variant/20 bg-white p-5">
            <p className="text-sm font-semibold text-mgmt-on-surface">No time off yet</p>
            <p className="mt-1 text-sm text-mgmt-on-surface-variant">
              Add time off to prevent bookings during vacations, leave, or other unavailability.
            </p>
            <div className="mt-4">
              <button
                type="button"
                onClick={() => {
                  setSaveError(null);
                  setDraft((p) => ({ ...p, start: todayIso, end: todayIso, title: "" }));
                  setModalOpen(true);
                }}
                className="h-10 rounded-xl bg-mgmt-surface-container-low px-4 text-sm font-semibold text-mgmt-on-surface transition-colors hover:bg-mgmt-surface-container"
              >
                Add time off
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {items.map((it) => {
              const duration = daysInclusive(it.start, it.end);
              return (
                <div key={it.id} className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-mgmt-on-surface">{it.title}</p>
                    <p className="mt-1 text-sm text-mgmt-on-surface-variant">
                      {formatDateRange(it.start, it.end)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-sm text-mgmt-on-surface-variant whitespace-nowrap">
                      {duration} days
                    </p>
                    <button
                      type="button"
                      className="rounded-lg p-2 text-mgmt-on-surface-variant transition-colors hover:text-red-600 hover:bg-mgmt-surface-container-low"
                      aria-label={`Delete time off ${it.title}`}
                      onClick={async () => {
                        const ok = window.confirm(`Delete "${it.title}" time off?`);
                        if (!ok) return;
                        try {
                          const res = await fetch(
                            `${basePath}/${it.id}`,
                            { method: "DELETE", cache: "no-store" },
                          );
                          const json: unknown = await res.json();
                          if (!res.ok || !isSuccessEnvelope(json)) {
                            throw new Error(
                              (isEnvelope(json) && typeof json.message === "string" && json.message) ||
                                `Failed to delete (HTTP ${res.status})`,
                            );
                          }
                          setItems((prev) => prev.filter((x) => x.id !== it.id));
                        } catch (e) {
                          alert(e instanceof Error ? e.message : "Failed to delete");
                        }
                      }}
                    >
                      <MaterialSymbol name="delete" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modalOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-6"
          role="dialog"
          aria-modal="true"
          aria-label="Add time off"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
        >
          <div className="w-full max-w-md rounded-2xl bg-mgmt-surface-container-lowest shadow-xl">
            <div className="flex items-center justify-between px-6 pt-5 pb-3">
              <h2 className="text-sm font-semibold text-mgmt-on-surface">Add time off</h2>
              <button
                type="button"
                className="rounded-md p-1 text-mgmt-on-surface-variant hover:bg-mgmt-surface-container-low"
                aria-label="Close"
                onClick={() => setModalOpen(false)}
              >
                <MaterialSymbol name="close" className="text-[18px]" />
              </button>
            </div>

            <div className="space-y-4 px-6 pb-5">
              {saveError ? <p className="text-sm text-red-700">{saveError}</p> : null}
              <div>
                <label className="block text-xs font-semibold tracking-widest text-mgmt-on-surface-variant">
                  TITLE
                </label>
                <input
                  className="mt-2 w-full rounded-xl border-none bg-mgmt-surface-container-low px-4 py-2.5 text-sm text-mgmt-on-surface outline-none placeholder:text-mgmt-on-surface-variant focus:ring-1 focus:ring-mgmt-primary/30"
                  placeholder="e.g. Vacation, Doctor's appointment"
                  value={draft.title}
                  onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <label className="block text-xs font-semibold tracking-widest text-mgmt-on-surface-variant">
                    START DATE
                  </label>
                  <input
                    type="date"
                    className="mt-2 w-full rounded-xl border-none bg-mgmt-surface-container-low px-4 py-2.5 pr-10 text-sm text-mgmt-on-surface outline-none focus:ring-1 focus:ring-mgmt-primary/30"
                    value={draft.start}
                    onChange={(e) => setDraft((p) => ({ ...p, start: e.target.value }))}
                  />
                  <span className="pointer-events-none absolute right-3 top-[38px] text-mgmt-on-surface-variant">
                    <MaterialSymbol name="calendar_month" className="text-[18px]" />
                  </span>
                </div>
                <div className="relative">
                  <label className="block text-xs font-semibold tracking-widest text-mgmt-on-surface-variant">
                    END DATE
                  </label>
                  <input
                    type="date"
                    className="mt-2 w-full rounded-xl border-none bg-mgmt-surface-container-low px-4 py-2.5 pr-10 text-sm text-mgmt-on-surface outline-none focus:ring-1 focus:ring-mgmt-primary/30"
                    value={draft.end}
                    onChange={(e) => setDraft((p) => ({ ...p, end: e.target.value }))}
                  />
                  <span className="pointer-events-none absolute right-3 top-[38px] text-mgmt-on-surface-variant">
                    <MaterialSymbol name="calendar_month" className="text-[18px]" />
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-mgmt-on-surface-variant">
                  <span className="relative inline-flex items-center">
                    <input
                      className="peer sr-only"
                      type="checkbox"
                      checked={allDay}
                      onChange={(e) => setAllDay(e.target.checked)}
                      aria-label="All day"
                    />
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-mgmt-surface-container-high peer-checked:bg-mgmt-primary">
                      <MaterialSymbol
                        name="check"
                        className={cx(
                          "text-[14px] text-white transition-opacity",
                          allDay ? "opacity-100" : "opacity-0",
                        )}
                      />
                    </span>
                  </span>
                  All day
                </label>

                <div className="relative flex-1">
                  <select
                    className="w-full appearance-none rounded-xl border-none bg-mgmt-surface-container-low px-4 py-2.5 pr-10 text-sm text-mgmt-on-surface outline-none focus:ring-1 focus:ring-mgmt-primary/30"
                    value={repeat}
                    onChange={(e) => setRepeat(e.target.value)}
                    aria-label="Repeat"
                  >
                    <option>Does not repeat</option>
                    <option>Daily</option>
                    <option>Weekly</option>
                    <option>Monthly</option>
                  </select>
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-mgmt-on-surface-variant">
                    <MaterialSymbol name="keyboard_arrow_down" className="text-[18px]" />
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-mgmt-surface-container-low px-6 py-4">
              <button
                type="button"
                className="px-4 py-2 text-xs font-medium text-mgmt-on-surface-variant hover:text-mgmt-on-surface"
                disabled={saving}
                onClick={() => {
                  setSaveError(null);
                  setModalOpen(false);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-full bg-mgmt-surface-container-low px-6 py-2 text-xs font-semibold text-mgmt-on-surface transition-colors hover:bg-mgmt-surface-container"
                disabled={saving}
                onClick={async () => {
                  setSaving(true);
                  setSaveError(null);
                  try {
                    const title = draft.title.trim() || "Time off";
                    const startAt = new Date(`${draft.start}T00:00:00.000Z`);
                    // End is inclusive in UI; store exclusive end at next day 00:00Z.
                    const endAt = new Date(`${draft.end}T00:00:00.000Z`);
                    endAt.setUTCDate(endAt.getUTCDate() + 1);
                    if (!(endAt > startAt)) throw new Error("End date must be after start date");

                    const res = await fetch(basePath, {
                      method: "POST",
                      cache: "no-store",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify({
                        scope: "time_off",
                        startAt: startAt.toISOString(),
                        endAt: endAt.toISOString(),
                        reason: title,
                        isVisibleToClient: true,
                      }),
                    });
                      const json: unknown = await res.json();
                      if (!res.ok || !isSuccessEnvelope(json)) {
                        throw new Error(
                          (isEnvelope(json) && typeof json.message === "string" && json.message) ||
                            `Failed to add time off (HTTP ${res.status})`,
                        );
                    }

                      const id =
                        typeof json.data === "object" && json.data !== null && "timeBlockId" in json.data
                          ? String((json.data as { timeBlockId?: unknown }).timeBlockId ?? "")
                          : "";
                    setItems((prev) => [
                      ...prev,
                      { ...draft, id: id || `${Date.now()}`, title },
                    ]);
                    setModalOpen(false);
                  } catch (e) {
                    setSaveError(e instanceof Error ? e.message : "Failed to add time off");
                  } finally {
                    setSaving(false);
                  }
                }}
                aria-label={`Add time off (${draftDuration} days)`}
              >
                {saving ? "Adding…" : "Add"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function toIsoDate(d: Date): string {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

type Envelope = { status?: unknown; message?: unknown; data?: unknown };

function isEnvelope(v: unknown): v is Envelope {
  return typeof v === "object" && v !== null;
}

function isSuccessEnvelope(v: unknown): v is Envelope & { status: "success" } {
  return isEnvelope(v) && v.status === "success";
}

