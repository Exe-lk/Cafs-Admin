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

type BreakRange = {
  id: string;
  start: string; // "12:00"
  end: string; // "13:00"
};

type BreakDay = {
  key: DayKey;
  label: string;
  kind: "workday" | "day_off";
  enabled: boolean; // breaks enabled
  breaks: BreakRange[];
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function parseHHMM(value: string): { hh: number; mm: number } | null {
  const m = /^(\d{2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return { hh, mm };
}

function hhmmToMinutes(value: string): number {
  const p = parseHHMM(value);
  if (!p) return 0;
  return p.hh * 60 + p.mm;
}

function generateTimeOptions(stepMinutes: number): string[] {
  const step = Math.max(1, Math.trunc(stepMinutes));
  const out: string[] = [];
  for (let m = 0; m < 24 * 60; m += step) {
    const hh = String(Math.floor(m / 60)).padStart(2, "0");
    const mm = String(m % 60).padStart(2, "0");
    out.push(`${hh}:${mm}`);
  }
  return out;
}

function formatTimeLabel(value: string) {
  const [hh, mm] = value.split(":").map((n) => Number(n));
  const hours = hh ?? 0;
  const minutes = mm ?? 0;
  const isPm = hours >= 12;
  const displayH = ((hours + 11) % 12) + 1;
  const displayM = String(minutes).padStart(2, "0");
  return `${displayH}:${displayM} ${isPm ? "PM" : "AM"}`;
}

function createEmptyBreakDays(): BreakDay[] {
  return [
    { key: "monday", label: "MONDAY", kind: "workday", enabled: false, breaks: [] },
    { key: "tuesday", label: "TUESDAY", kind: "workday", enabled: false, breaks: [] },
    { key: "wednesday", label: "WEDNESDAY", kind: "workday", enabled: false, breaks: [] },
    { key: "thursday", label: "THURSDAY", kind: "workday", enabled: false, breaks: [] },
    { key: "friday", label: "FRIDAY", kind: "workday", enabled: false, breaks: [] },
    { key: "saturday", label: "SATURDAY", kind: "day_off", enabled: false, breaks: [] },
    { key: "sunday", label: "SUNDAY", kind: "day_off", enabled: false, breaks: [] },
  ];
}

export default function TheraphistSettingsBreaksPage() {
  const { selectedId, profile } = useAdminTherapist();
  const therapistTimezone = (profile.timezone ?? "").trim() || "Asia/Colombo";

  const [days, setDays] = useState<BreakDay[]>(createEmptyBreakDays);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [serverSnapshot, setServerSnapshot] = useState<string>("");

  const dirty = useMemo(() => {
    if (!serverSnapshot) return false;
    return JSON.stringify(days) !== serverSnapshot;
  }, [days, serverSnapshot]);

  const timeOptions = useMemo(() => {
    const base = generateTimeOptions(15); // supports :15/:30 offsets + short breaks
    const extra = new Set<string>();
    for (const d of days) {
      for (const b of d.breaks) {
        if (parseHHMM(b.start)) extra.add(b.start);
        if (parseHHMM(b.end)) extra.add(b.end);
      }
    }
    const all = Array.from(new Set<string>([...base, ...extra]));
    all.sort((a, b) => hhmmToMinutes(a) - hhmmToMinutes(b));
    return all.map((t) => ({ value: t, label: formatTimeLabel(t) }));
  }, [days]);

  useEffect(() => {
    if (!selectedId) return;
    const ac = new AbortController();
    setLoading(true);
    setErrorMsg(null);
    (async () => {
      try {
        const from = new Date();
        const to = new Date(from.getTime() + 7 * 86_400_000);
        const url = new URL(
          `/api/v1/admin/therapists/${selectedId}/time-blocks`,
          window.location.origin,
        );
        url.searchParams.set("scope", "breaks");
        url.searchParams.set("from", from.toISOString());
        url.searchParams.set("to", to.toISOString());

        const res = await fetch(url.toString(), {
          method: "GET",
          cache: "no-store",
          signal: ac.signal,
        });
        const json: unknown = await res.json();
        if (!res.ok || !isSuccessEnvelope(json) || !json.data) {
          throw new Error(
            (isEnvelope(json) && typeof json.message === "string" && json.message) ||
              `Failed to load breaks (HTTP ${res.status})`,
          );
        }

        const items = (json.data as { items?: unknown })?.items;
        const rows = Array.isArray(items) ? items : [];
        if (!rows.length) {
          const emptyDays = createEmptyBreakDays();
          setDays(emptyDays);
          setServerSnapshot(JSON.stringify(emptyDays));
          return;
        }

        const byDow = new Map<number, Array<{ start: string; end: string }>>();
        for (const it of rows) {
          const rec = (it && typeof it === "object" ? (it as Record<string, unknown>) : {}) as Record<
            string,
            unknown
          >;
          const reason = typeof rec.reason === "string" ? rec.reason : null;
          const parsed = parseBreakReason(reason);
          let dow: number;
          let start: string;
          let end: string;
          if (parsed) {
            // Admin weekly breaks encode exact local day/time in reason.
            dow = parsed.dayOfWeek;
            start = parsed.start;
            end = parsed.end;
          } else {
            // Fallback for legacy/manual rows that don't follow encoded break reason format.
            const s = new Date(String(rec.startAt ?? ""));
            const e = new Date(String(rec.endAt ?? ""));
            dow = dayOfWeek1to7InTimeZone(s, therapistTimezone);
            start = toHHMMInTimeZone(s, therapistTimezone);
            end = toHHMMInTimeZone(e, therapistTimezone);
          }
          if (!byDow.has(dow)) byDow.set(dow, []);
          byDow.get(dow)!.push({ start, end });
        }

        const nextDays = days.map((d, idx) => {
          const dow = idx + 1; // monday=1
          if (d.kind === "day_off") return d;
          const ranges = uniqRanges(byDow.get(dow) ?? []);
          return {
            ...d,
            enabled: ranges.length > 0,
            breaks: ranges.map((r) => ({
              id: `${d.key}-${r.start}-${r.end}`,
              start: r.start,
              end: r.end,
            })),
          } satisfies BreakDay;
        });

        setDays(nextDays);
        setServerSnapshot(JSON.stringify(nextDays));
      } catch (e) {
        if (typeof e === "object" && e !== null && "name" in e && (e as { name?: unknown }).name === "AbortError")
          return;
        setErrorMsg(e instanceof Error ? e.message : "Failed to load breaks");
      } finally {
        setLoading(false);
      }
    })();
    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, therapistTimezone]);

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-8 lg:px-12 lg:py-10">
      <div className="max-w-3xl space-y-6">
        <h3 className="mb-1 text-lg font-semibold text-mgmt-on-surface">Weekly breaks</h3>
        <p className="-mt-2 text-sm text-mgmt-on-surface-variant">
          Schedule recurring breaks for each day of the week.
        </p>

        {loading ? <div className="text-sm text-mgmt-on-surface-variant">Loading…</div> : null}
        {errorMsg ? <div className="text-sm text-red-700">{errorMsg}</div> : null}

        <div className="space-y-2">
          {days.map((d) => {
            const isDayOff = d.kind === "day_off";
            return (
              <div
                key={d.key}
                className={cx(
                  "group flex items-center justify-between py-4",
                  isDayOff && "opacity-60",
                )}
              >
                <div className="flex w-32 items-center gap-6">
                  {isDayOff ? (
                    <span className="text-sm font-medium text-mgmt-on-surface">{d.label}</span>
                  ) : (
                    <>
                      <label className="relative inline-flex cursor-pointer items-center">
                        <input
                          className="peer sr-only"
                          type="checkbox"
                          checked={d.enabled}
                          onChange={(e) => {
                            const enabled = e.target.checked;
                            setDays((prev) =>
                              prev.map((x) =>
                                x.key === d.key
                                  ? {
                                      ...x,
                                      enabled,
                                      breaks: enabled ? x.breaks : [],
                                    }
                                  : x,
                              ),
                            );
                          }}
                          aria-label={`${d.label} breaks toggle`}
                        />
                        <div className="h-6 w-11 rounded-full bg-mgmt-surface-container-high after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-mgmt-primary peer-checked:after:translate-x-full" />
                      </label>
                      <span className="text-sm font-medium text-mgmt-on-surface">{d.label}</span>
                    </>
                  )}
                </div>

                <div className="flex flex-1 items-center gap-4">
                  {isDayOff ? (
                    <span className="text-sm italic text-mgmt-on-surface-variant ml-20">Day off</span>
                  ) : !d.enabled ? (
                    <span className="text-sm text-mgmt-on-surface-variant ml-20">No breaks</span>
                  ) : d.breaks.length === 0 ? (
                    <span className="text-sm italic text-mgmt-on-surface-variant ml-20">No breaks</span>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {d.breaks.map((b) => (
                        <div key={b.id} className="flex items-center gap-3">
                          <div className="ml-10 flex items-center gap-2 rounded-lg border border-transparent bg-mgmt-surface-container-low px-4 py-2 transition-all focus-within:border-mgmt-primary/30 focus-within:bg-mgmt-surface-container-lowest">
                            <select
                              className="appearance-none bg-transparent pr-2 text-sm font-medium text-mgmt-on-surface outline-none "
                              value={b.start}
                              onChange={(e) => {
                                const start = e.target.value;
                                setDays((prev) =>
                                  prev.map((x) =>
                                    x.key !== d.key
                                      ? x
                                      : {
                                          ...x,
                                          breaks: x.breaks.map((bb) =>
                                            bb.id === b.id ? { ...bb, start } : bb,
                                          ),
                                        },
                                  ),
                                );
                              }}
                              aria-label={`${d.label} break start`}
                            >
                              {timeOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                            <span className="text-mgmt-on-surface-variant">—</span>
                            <select
                              className="appearance-none bg-transparent pr-2 text-sm font-medium text-mgmt-on-surface outline-none"
                              value={b.end}
                              onChange={(e) => {
                                const end = e.target.value;
                                setDays((prev) =>
                                  prev.map((x) =>
                                    x.key !== d.key
                                      ? x
                                      : {
                                          ...x,
                                          breaks: x.breaks.map((bb) =>
                                            bb.id === b.id ? { ...bb, end } : bb,
                                          ),
                                        },
                                  ),
                                );
                              }}
                              aria-label={`${d.label} break end`}
                            >
                              {timeOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          <button
                            type="button"
                            className="p-2 text-mgmt-on-surface-variant transition-colors hover:text-red-600"
                            onClick={() => {
                              setDays((prev) =>
                                prev.map((x) =>
                                  x.key !== d.key
                                    ? x
                                    : { ...x, breaks: x.breaks.filter((bb) => bb.id !== b.id) },
                                ),
                              );
                            }}
                            aria-label={`Remove break ${b.start}-${b.end} on ${d.label}`}
                          >
                            <MaterialSymbol name="delete" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {!isDayOff && d.enabled ? (
                  <button
                    type="button"
                    className="p-2 text-mgmt-on-surface-variant transition-colors hover:text-mgmt-primary"
                    onClick={() => {
                      setDays((prev) =>
                        prev.map((x) =>
                          x.key !== d.key
                            ? x
                            : {
                                ...x,
                                breaks: [
                                  ...x.breaks,
                                  {
                                    id: `${d.key}-${Date.now()}`,
                                    start: "12:00",
                                    end: "12:15",
                                  },
                                ],
                              },
                        ),
                      );
                    }}
                    aria-label={`Add break on ${d.label}`}
                  >
                    <MaterialSymbol name="add_circle" />
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="pt-4">
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
            {saveError ? <p className="mr-auto text-sm text-red-700">{saveError}</p> : null}
            <button
              type="button"
              className="h-11 rounded-xl border border-mgmt-outline-variant/30 bg-white px-5 text-sm font-semibold text-mgmt-on-surface-variant transition-colors hover:bg-mgmt-surface-container-low disabled:opacity-50"
              disabled={!dirty || saving || loading}
              onClick={() => {
                if (!serverSnapshot) return;
                setSaveError(null);
                try {
                  setDays(JSON.parse(serverSnapshot) as BreakDay[]);
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
              disabled={!dirty || saving || loading}
              onClick={async () => {
                setSaving(true);
                setSaveError(null);
                try {
                  // Validate before sending to API (prevents silent drops server-side).
                  for (const d of days) {
                    if (d.kind !== "workday" || !d.enabled) continue;
                    for (const b of d.breaks) {
                      if (!parseHHMM(b.start) || !parseHHMM(b.end)) {
                        throw new Error("Invalid break time format");
                      }
                      if (hhmmToMinutes(b.end) <= hhmmToMinutes(b.start)) {
                        throw new Error("Break end time must be after start time");
                      }
                    }
                  }

                  const items = days
                    .map((d, idx) => ({ d, dow: idx + 1 }))
                    .filter(({ d }) => d.kind === "workday" && d.enabled)
                    .map(({ d, dow }) => ({
                      dayOfWeek: dow,
                      ranges: d.breaks.map((b) => ({ startTime: b.start, endTime: b.end })),
                    }));

                  const res = await fetch(`/api/v1/admin/therapists/${selectedId}/breaks`, {
                    method: "PUT",
                    cache: "no-store",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ items, horizonDays: 56 }),
                  });
                  const json: unknown = await res.json();
                  if (!res.ok || !isSuccessEnvelope(json)) {
                    throw new Error(
                      (isEnvelope(json) && typeof json.message === "string" && json.message) ||
                        `Failed to save breaks (HTTP ${res.status})`,
                    );
                  }
                  setServerSnapshot(JSON.stringify(days));
                } catch (e) {
                  setSaveError(e instanceof Error ? e.message : "Failed to save breaks");
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

function dayOfWeek1to7InTimeZone(d: Date, timeZone: string): number {
  const wd = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(d);
  const map: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  return map[wd] ?? 1;
}

function toHHMMInTimeZone(d: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const hh = parts.find((p) => p.type === "hour")?.value ?? "00";
  const mm = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${hh}:${mm}`;
}

function uniqRanges(ranges: Array<{ start: string; end: string }>): Array<{ start: string; end: string }> {
  const seen = new Set<string>();
  const out: Array<{ start: string; end: string }> = [];
  for (const r of ranges) {
    const key = `${r.start}-${r.end}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out.sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
}

function parseBreakReason(
  value: string | null,
): { dayOfWeek: number; start: string; end: string } | null {
  if (!value) return null;
  const m = /^break:(\d):(\d{2}:\d{2})-(\d{2}:\d{2})$/.exec(value.trim());
  if (!m) return null;
  const dayOfWeek = Number(m[1]);
  if (!Number.isFinite(dayOfWeek) || dayOfWeek < 1 || dayOfWeek > 7) return null;
  const start = m[2];
  const end = m[3];
  if (!parseHHMM(start) || !parseHHMM(end)) return null;
  return { dayOfWeek, start, end };
}

type Envelope = { status?: unknown; message?: unknown; data?: unknown };

function isEnvelope(v: unknown): v is Envelope {
  return typeof v === "object" && v !== null;
}

function isSuccessEnvelope(v: unknown): v is Envelope & { status: "success" } {
  return isEnvelope(v) && v.status === "success";
}

