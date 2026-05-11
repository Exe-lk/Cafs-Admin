"use client";

import { useEffect, useMemo, useState } from "react";
import MaterialSymbol from "@/components/admin/MaterialSymbol";
import { useAdminTherapist } from "@/components/admin/AdminTherapistContext";

type DayKey =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

type DayModel = {
  key: DayKey;
  label: string;
  enabled: boolean;
  start: string; // "09:00"
  end: string; // "17:00"
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const TIME_OPTIONS = [
  "06:00",
  "07:00",
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
] as const;

function formatTimeLabel(value: string) {
  const [hh, mm] = value.split(":").map((n) => Number(n));
  const hours = hh ?? 0;
  const minutes = mm ?? 0;
  const isPm = hours >= 12;
  const displayH = ((hours + 11) % 12) + 1;
  const displayM = String(minutes).padStart(2, "0");
  return `${displayH}:${displayM} ${isPm ? "PM" : "AM"}`;
}

const DAY_ORDER: DayKey[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

function createEmptyWorkingDays(): DayModel[] {
  return DAY_ORDER.map((k) => ({
    key: k,
    label: k[0]!.toUpperCase() + k.slice(1),
    enabled: false,
    start: "09:00",
    end: "17:00",
  }));
}

export default function TheraphistSettingsWorkingHoursPage() {
  const { selectedId } = useAdminTherapist();
  const [days, setDays] = useState<DayModel[]>(createEmptyWorkingDays);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingDayKey, setDeletingDayKey] = useState<DayKey | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const timeOptions = useMemo(
    () =>
      TIME_OPTIONS.map((t) => ({
        value: t,
        label: formatTimeLabel(t),
      })),
    [],
  );

  const [serverSnapshot, setServerSnapshot] = useState<string>("");
  /** Per weekday (1=Mon..7=Sun): all time blocks starting that day are visible to clients. */
  const [dayClientVisibility, setDayClientVisibility] = useState<Record<string, boolean>>({});
  const [visibilityTogglingKey, setVisibilityTogglingKey] = useState<DayKey | null>(null);
  const draftSnapshot = useMemo(() => JSON.stringify(days), [days]);
  const dirty = serverSnapshot !== "" && draftSnapshot !== serverSnapshot;

  async function persistDayClientVisibility(dayOfWeek: number, isVisibleToClient: boolean) {
    if (!selectedId) throw new Error("Select a therapist first");
    const res = await fetch(`/api/v1/admin/therapists/${selectedId}/time-blocks`, {
      method: "PATCH",
      cache: "no-store",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ dayOfWeek, isVisibleToClient }),
    });
    const json: unknown = await res.json();
    if (!res.ok || !isSuccessEnvelope(json)) {
      throw new Error(
        (isEnvelope(json) && typeof json.message === "string" && json.message) ||
          `Failed to update client visibility (HTTP ${res.status})`,
      );
    }
    setDayClientVisibility((prev) => ({
      ...prev,
      [String(dayOfWeek)]: isVisibleToClient,
    }));
  }

  async function persistWorkingHours(nextDays: DayModel[]) {
    if (!selectedId) throw new Error("Select a therapist first");
    const items = nextDays.map((d, idx) => ({
      dayOfWeek: idx + 1,
      startTime: d.start,
      endTime: d.end,
      isActive: Boolean(d.enabled),
    }));
    const res = await fetch(`/api/v1/admin/therapists/${selectedId}/working-hours`, {
      method: "PUT",
      cache: "no-store",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ items }),
    });
    const json: unknown = await res.json();
    if (!res.ok || !isSuccessEnvelope(json)) {
      throw new Error(
        (isEnvelope(json) && typeof json.message === "string" && json.message) ||
          `Failed to save working hours (HTTP ${res.status})`,
      );
    }
    setServerSnapshot(JSON.stringify(nextDays));
  }

  useEffect(() => {
    if (!selectedId) return;
    const ac = new AbortController();
    setLoading(true);
    setErrorMsg(null);
    (async () => {
      async function refreshDayClientVisibility() {
        const visRes = await fetch(
          `/api/v1/admin/therapists/${selectedId}/time-blocks?dayClientVisibility=true&omitItems=1`,
          { method: "GET", cache: "no-store", signal: ac.signal },
        );
        const visJson: unknown = await visRes.json();
        if (
          !visRes.ok ||
          !isSuccessEnvelope(visJson) ||
          !visJson.data ||
          typeof visJson.data !== "object"
        ) {
          setDayClientVisibility({});
          return;
        }
        const rec = visJson.data as Record<string, unknown>;
        const raw = rec.dayClientVisibility;
        if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
          setDayClientVisibility({});
          return;
        }
        const o = raw as Record<string, unknown>;
        const next: Record<string, boolean> = {};
        for (let d = 1; d <= 7; d++) {
          next[String(d)] = Boolean(o[String(d)]);
        }
        setDayClientVisibility(next);
      }

      try {
        const res = await fetch(`/api/v1/admin/therapists/${selectedId}/working-hours`, {
          method: "GET",
          cache: "no-store",
          signal: ac.signal,
        });
        const json: unknown = await res.json();
        if (!res.ok || !isSuccessEnvelope(json) || !json.data) {
          throw new Error(
            (isEnvelope(json) && typeof json.message === "string" && json.message) ||
              `Failed to load working hours (HTTP ${res.status})`,
          );
        }

        const items = (json.data as { items?: unknown })?.items;
        const rows = Array.isArray(items) ? items : [];
        if (!rows.length) {
          const emptyDays = createEmptyWorkingDays();
          setDays(emptyDays);
          setServerSnapshot(JSON.stringify(emptyDays));
          await refreshDayClientVisibility();
          return;
        }

        const byDow = new Map<number, Record<string, unknown>>();
        for (const it of rows) {
          if (!it || typeof it !== "object") continue;
          const rec = it as Record<string, unknown>;
          const dow = Number(rec.dayOfWeek);
          if (!byDow.has(dow)) byDow.set(dow, it);
        }

        const nextDays: DayModel[] = DAY_ORDER.map((k, idx) => {
          const dow = idx + 1; // 1=Mon
          const found = byDow.get(dow);
          const label = k[0]!.toUpperCase() + k.slice(1);
          return {
            key: k,
            label,
            enabled: found ? Boolean(found.isActive) : false,
            start: found && typeof found.startTime === "string" ? found.startTime : "09:00",
            end: found && typeof found.endTime === "string" ? found.endTime : "17:00",
          };
        });

        setDays(nextDays);
        setServerSnapshot(JSON.stringify(nextDays));
        await refreshDayClientVisibility();
      } catch (e) {
        if (typeof e === "object" && e !== null && "name" in e && (e as { name?: unknown }).name === "AbortError")
          return;
        setErrorMsg(e instanceof Error ? e.message : "Failed to load working hours");
      } finally {
        setLoading(false);
      }
    })();
    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-8 lg:px-12 lg:py-10">
      <div className="max-w-3xl space-y-6">
        <h3 className="mb-6 text-lg font-semibold text-mgmt-on-surface">
          Weekly availability
        </h3>

        {loading ? (
          <div className="text-sm text-mgmt-on-surface-variant">Loading…</div>
        ) : errorMsg ? (
          <div className="text-sm text-red-700">{errorMsg}</div>
        ) : null}

        {days.map((d, rowIdx) => {
          const dayOff = !d.enabled;
          const dow = rowIdx + 1; // 1=Mon..7=Sun, matches working-hours API dayOfWeek
          return (
            <div
              key={d.key}
              className={cx("group flex items-center justify-between py-4", dayOff && "opacity-60")}
            >
              <div className="flex w-32 items-center gap-6">
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    className="peer sr-only"
                    type="checkbox"
                    checked={d.enabled}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setDays((prev) =>
                        prev.map((x) => (x.key === d.key ? { ...x, enabled: checked } : x)),
                      );
                    }}
                    aria-label={`${d.label} availability toggle`}
                  />
                  <div className="h-6 w-11 rounded-full bg-mgmt-surface-container-high after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-mgmt-primary peer-checked:after:translate-x-full" />
                </label>
                <span className="text-sm font-medium text-mgmt-on-surface">{d.label}</span>
              </div>

              <div className="flex flex-1 items-center gap-4">
                {d.enabled ? (
                  <>
                    <div className="relative flex items-center gap-2 rounded-lg border border-transparent bg-mgmt-surface-container-low px-4 py-2 transition-all focus-within:border-mgmt-primary/30 focus-within:bg-mgmt-surface-container-lowest">
                      <select
                        className="appearance-none bg-transparent pr-6 text-sm font-medium text-mgmt-on-surface outline-none"
                        value={d.start}
                        onChange={(e) => {
                          const start = e.target.value;
                          setDays((prev) =>
                            prev.map((x) => (x.key === d.key ? { ...x, start } : x)),
                          );
                        }}
                        aria-label={`${d.label} start time`}
                      >
                        {timeOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <MaterialSymbol
                        name="keyboard_arrow_down"
                        className="pointer-events-none absolute right-3 text-xs text-mgmt-on-surface-variant"
                      />
                    </div>

                    <span className="text-mgmt-on-surface-variant">—</span>

                    <div className="relative flex items-center gap-2 rounded-lg border border-transparent bg-mgmt-surface-container-low px-4 py-2 transition-all focus-within:border-mgmt-primary/30 focus-within:bg-mgmt-surface-container-lowest">
                      <select
                        className="appearance-none bg-transparent pr-6 text-sm font-medium text-mgmt-on-surface outline-none"
                        value={d.end}
                        onChange={(e) => {
                          const end = e.target.value;
                          setDays((prev) =>
                            prev.map((x) => (x.key === d.key ? { ...x, end } : x)),
                          );
                        }}
                        aria-label={`${d.label} end time`}
                      >
                        {timeOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <MaterialSymbol
                        name="keyboard_arrow_down"
                        className="pointer-events-none absolute right-3 text-xs text-mgmt-on-surface-variant"
                      />
                    </div>
                  </>
                ) : (
                  <span className="text-sm italic text-mgmt-on-surface-variant">Day off</span>
                )}
              </div>

              {d.enabled ? (
                <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <label className="inline-flex cursor-pointer items-center p-2">
                    <input
                      className="peer sr-only"
                      type="checkbox"
                      checked={Boolean(dayClientVisibility[String(dow)])}
                      disabled={
                        saving ||
                        loading ||
                        deletingDayKey === d.key ||
                        visibilityTogglingKey === d.key
                      }
                      onChange={async (e) => {
                        const next = e.target.checked;
                        const prevVis = { ...dayClientVisibility };
                        setSaveError(null);
                        setVisibilityTogglingKey(d.key);
                        setDayClientVisibility((p) => ({ ...p, [String(dow)]: next }));
                        try {
                          await persistDayClientVisibility(dow, next);
                        } catch (err) {
                          setDayClientVisibility(prevVis);
                          setSaveError(
                            err instanceof Error ? err.message : "Failed to update client visibility",
                          );
                        } finally {
                          setVisibilityTogglingKey(null);
                        }
                      }}
                      aria-label={`${d.label}: show related time blocks to clients`}
                    />
                    <div
                      className={cx(
                        "relative h-5 w-9 shrink-0 rounded-full bg-mgmt-surface-container-high after:absolute after:top-[2px] after:left-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-mgmt-primary peer-checked:after:translate-x-4",
                        "peer-focus-visible:ring-2 peer-focus-visible:ring-mgmt-primary/40 peer-focus-visible:ring-offset-2",
                      )}
                    />
                  </label>
                  <button
                    type="button"
                    className="p-2 text-mgmt-on-surface-variant hover:text-red-600"
                    disabled={saving || loading || deletingDayKey === d.key || visibilityTogglingKey === d.key}
                    onClick={async () => {
                      const prevDays = days;
                      const nextDays = prevDays.map((x) =>
                        x.key === d.key ? { ...x, enabled: false } : x,
                      );
                      setSaveError(null);
                      setDeletingDayKey(d.key);
                      setDays(nextDays);
                      try {
                        await persistWorkingHours(nextDays);
                      } catch (e) {
                        setDays(prevDays);
                        setSaveError(e instanceof Error ? e.message : "Failed to update working hours");
                      } finally {
                        setDeletingDayKey(null);
                      }
                    }}
                    aria-label={`Set ${d.label} as day off`}
                  >
                    <MaterialSymbol name="delete" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="p-2 text-mgmt-on-surface-variant transition-colors hover:text-mgmt-primary"
                  onClick={() => {
                    setDays((prev) =>
                      prev.map((x) => (x.key === d.key ? { ...x, enabled: true } : x)),
                    );
                  }}
                  aria-label={`Enable ${d.label}`}
                >
                  <MaterialSymbol name="add_circle" />
                </button>
              )}
            </div>
          );
        })}

        <div className="pt-4">
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
            {saveError ? <p className="mr-auto text-sm text-red-700">{saveError}</p> : null}
            <button
              type="button"
              className="h-11 rounded-xl border border-mgmt-outline-variant/30 bg-white px-5 text-sm font-semibold text-mgmt-on-surface-variant transition-colors hover:bg-mgmt-surface-container-low disabled:opacity-50"
              disabled={!dirty || saving || loading || Boolean(deletingDayKey) || Boolean(visibilityTogglingKey)}
              onClick={() => {
                if (!serverSnapshot) return;
                setSaveError(null);
                try {
                  setDays(JSON.parse(serverSnapshot) as DayModel[]);
                } catch {
                  // ignore
                }
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="h-11 rounded-xl bg-gradient-to-br from-mgmt-primary to-mgmt-primary-dim px-6 text-sm font-bold text-mgmt-on-primary shadow-md transition-all active:scale-95 disabled:opacity-40"
              disabled={!dirty || saving || loading || Boolean(deletingDayKey) || Boolean(visibilityTogglingKey)}
              onClick={async () => {
                setSaving(true);
                setSaveError(null);
                try {
                  await persistWorkingHours(days);
                } catch (e) {
                  setSaveError(e instanceof Error ? e.message : "Failed to save working hours");
                } finally {
                  setSaving(false);
                }
              }}
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

type Envelope = { status?: unknown; message?: unknown; data?: unknown };

function isEnvelope(v: unknown): v is Envelope {
  return typeof v === "object" && v !== null;
}

function isSuccessEnvelope(v: unknown): v is Envelope & { status: "success" } {
  return isEnvelope(v) && v.status === "success";
}

