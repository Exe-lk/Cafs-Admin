import type { NextRequest } from "next/server";

export function getQuery(request: NextRequest) {
  return request.nextUrl.searchParams;
}

export function parseIntParam(
  raw: string | null,
  fallback: number,
  opts?: { min?: number; max?: number },
): number {
  const n = raw ? Number.parseInt(raw, 10) : Number.NaN;
  if (!Number.isFinite(n)) return fallback;
  const min = opts?.min ?? Number.NEGATIVE_INFINITY;
  const max = opts?.max ?? Number.POSITIVE_INFINITY;
  return Math.min(max, Math.max(min, n));
}

export function parseBoolParam(raw: string | null): boolean | null {
  if (raw == null) return null;
  const v = raw.trim().toLowerCase();
  if (v === "true" || v === "1" || v === "yes") return true;
  if (v === "false" || v === "0" || v === "no") return false;
  return null;
}

export function parseIsoDateParam(raw: string | null): Date | null {
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export function rangeFromPageLimit(page: number, limit: number) {
  const safePage = Math.max(1, Math.floor(page));
  const safeLimit = Math.max(1, Math.min(100, Math.floor(limit)));
  const from = (safePage - 1) * safeLimit;
  const to = from + safeLimit - 1;
  return { from, to, page: safePage, limit: safeLimit };
}

export async function readJson<T>(request: NextRequest): Promise<T> {
  return (await request.json()) as T;
}

