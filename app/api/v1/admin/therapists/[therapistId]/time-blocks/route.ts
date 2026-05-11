import type { NextRequest } from "next/server";
import { ok, created, err } from "@/lib/api/envelope";
import { getAuthContext, requireRoleService } from "@/lib/api/auth";
import { parseIsoDateParam } from "@/lib/api/http";
import { newUuid } from "@/lib/api/ids";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

type Scope = "all" | "time_off" | "breaks";

type PatchBody = {
  dayOfWeek?: number;
  isVisibleToClient?: boolean;
};

type PostBody = {
  startAt?: string;
  endAt?: string;
  reason?: string;
  isVisibleToClient?: boolean;
  scope?: Scope;
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ therapistId: string }> },
) {
  const { therapistId } = await params;
  const auth = await getAuthContext(request);
  if (!auth.ok) return err("Unauthorized", 401);
  const roleCheck = await requireRoleService(auth.ctx.user.id, ["admin"]);
  if (!roleCheck.ok) return err("Forbidden", 403);

  const sp = request.nextUrl.searchParams;
  const fromD = parseIsoDateParam(sp.get("from"));
  const toD = parseIsoDateParam(sp.get("to"));
  const scope = (sp.get("scope")?.trim() as Scope | null) ?? "all";
  const omitItems = sp.get("omitItems") === "1";
  const wantDayClientVisibility = sp.get("dayClientVisibility") === "true";

  const adminSupabase = createSupabaseServiceRoleClient();

  let items: Array<{
    timeBlockId: string;
    startAt: string;
    endAt: string;
    reason: string | null;
    isVisibleToClient: boolean;
    createdAt: string;
  }> = [];

  if (!omitItems) {
    let q = adminSupabase
      .from("therapist_time_blocks")
      .select("time_block_id,start_at,end_at,reason,is_visible_to_client,created_at")
      .eq("therapist_id", therapistId)
      .order("start_at", { ascending: true });

    if (fromD) q = q.gte("start_at", fromD.toISOString());
    if (toD) q = q.lt("start_at", toD.toISOString());

    // Convention-based scoping so UI can separate time-off vs breaks without new tables.
    if (scope === "time_off") {
      q = q.eq("is_visible_to_client", true).like("reason", "time-off:%");
    } else if (scope === "breaks") {
      // All break rows (visibility is independent; admin weekly breaks UI must list them regardless).
      q = q.like("reason", "break:%");
    }

    const { data, error } = await q;
    if (error) return err(error.message, 400);

    items = (data ?? []).map((row) => {
      const b = (row && typeof row === "object" ? (row as Record<string, unknown>) : {}) as Record<
        string,
        unknown
      >;
      return {
        timeBlockId: String(b.time_block_id),
        startAt: String(b.start_at),
        endAt: String(b.end_at),
        reason: b.reason === null ? null : String(b.reason),
        isVisibleToClient: Boolean(b.is_visible_to_client),
        createdAt: String(b.created_at),
      };
    });
  }

  let dayClientVisibility: Record<string, boolean> | undefined;
  if (wantDayClientVisibility) {
    try {
      dayClientVisibility = await computeDayClientVisibility(adminSupabase, therapistId);
    } catch (e) {
      return err(e instanceof Error ? e.message : "Failed to load day visibility", 400);
    }
  }

  const data: { items: typeof items; dayClientVisibility?: Record<string, boolean> } = { items };
  if (wantDayClientVisibility && dayClientVisibility) {
    data.dayClientVisibility = dayClientVisibility;
  }

  const res = ok(data, "Time blocks retrieved successfully");
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ therapistId: string }> },
) {
  const { therapistId } = await params;
  const auth = await getAuthContext(request);
  if (!auth.ok) return err("Unauthorized", 401);
  const roleCheck = await requireRoleService(auth.ctx.user.id, ["admin"]);
  if (!roleCheck.ok) return err("Forbidden", 403);

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return err("Invalid JSON body", 400);
  }

  if (typeof body.dayOfWeek !== "number" || !Number.isFinite(body.dayOfWeek)) {
    return err("Validation error", 400, [{ field: "dayOfWeek", message: "Required" }]);
  }
  if (typeof body.isVisibleToClient !== "boolean") {
    return err("Validation error", 400, [{ field: "isVisibleToClient", message: "Required boolean" }]);
  }
  const dayOfWeek = clampInt(body.dayOfWeek, 1, 7);

  const adminSupabase = createSupabaseServiceRoleClient();
  const timezone = await getTherapistTimezone(adminSupabase, therapistId);

  let rows: TimeBlockVisibilityRow[];
  try {
    rows = await fetchAllTimeBlockVisibilityRows(adminSupabase, therapistId);
  } catch (e) {
    return err(e instanceof Error ? e.message : "Failed to load time blocks", 400);
  }
  const ids = rows
    .filter((r) => dayOfWeek1to7InTimeZone(new Date(r.start_at), timezone) === dayOfWeek)
    .map((r) => r.time_block_id);

  const CHUNK = 250;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK);
    const { error } = await adminSupabase
      .from("therapist_time_blocks")
      .update({ is_visible_to_client: body.isVisibleToClient })
      .eq("therapist_id", therapistId)
      .in("time_block_id", chunk);
    if (error) return err(error.message, 400);
  }

  const res = ok({ updated: ids.length }, "Time block visibility updated");
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ therapistId: string }> },
) {
  const { therapistId } = await params;
  const auth = await getAuthContext(request);
  if (!auth.ok) return err("Unauthorized", 401);
  const roleCheck = await requireRoleService(auth.ctx.user.id, ["admin"]);
  if (!roleCheck.ok) return err("Forbidden", 403);

  let body: PostBody;
  try {
    body = (await request.json()) as PostBody;
  } catch {
    return err("Invalid JSON body", 400);
  }

  const startD = parseIsoDateParam(typeof body.startAt === "string" ? body.startAt : null);
  const endD = parseIsoDateParam(typeof body.endAt === "string" ? body.endAt : null);
  if (!startD || !endD || !(endD > startD)) return err("Invalid startAt/endAt", 400);

  const scope = body.scope ?? "all";
  const reasonRaw = typeof body.reason === "string" ? body.reason.trim() : "";
  const isVisibleToClient =
    typeof body.isVisibleToClient === "boolean" ? body.isVisibleToClient : scope === "time_off";

  const timeBlockId = newUuid();
  const now = new Date().toISOString();

  const adminSupabase = createSupabaseServiceRoleClient();
  const { error } = await adminSupabase.from("therapist_time_blocks").insert({
    time_block_id: timeBlockId,
    therapist_id: therapistId,
    start_at: startD.toISOString(),
    end_at: endD.toISOString(),
    reason: buildReason(scope, reasonRaw),
    is_visible_to_client: isVisibleToClient,
    created_by: auth.ctx.user.id,
    created_at: now,
  });
  if (error) return err(error.message, 400);

  const res = created({ timeBlockId }, "Time block created successfully");
  res.headers.set("Cache-Control", "no-store");
  return res;
}

function buildReason(scope: Scope, reason: string): string | null {
  const clean = reason.trim();
  if (scope === "time_off") return `time-off:${clean || "Time off"}`;
  if (scope === "breaks") return `break:${clean || "Break"}`;
  return clean || null;
}

type TimeBlockVisibilityRow = {
  time_block_id: string;
  start_at: string;
  is_visible_to_client: boolean;
};

async function fetchAllTimeBlockVisibilityRows(
  adminSupabase: ReturnType<typeof createSupabaseServiceRoleClient>,
  therapistId: string,
): Promise<TimeBlockVisibilityRow[]> {
  const pageSize = 1000;
  const out: TimeBlockVisibilityRow[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await adminSupabase
      .from("therapist_time_blocks")
      .select("time_block_id,start_at,is_visible_to_client")
      .eq("therapist_id", therapistId)
      .order("start_at", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    const batch = data ?? [];
    for (const row of batch) {
      const r = (row && typeof row === "object" ? (row as Record<string, unknown>) : {}) as Record<
        string,
        unknown
      >;
      out.push({
        time_block_id: String(r.time_block_id),
        start_at: String(r.start_at),
        is_visible_to_client: Boolean(r.is_visible_to_client),
      });
    }
    if (batch.length < pageSize) break;
  }
  return out;
}

async function computeDayClientVisibility(
  adminSupabase: ReturnType<typeof createSupabaseServiceRoleClient>,
  therapistId: string,
): Promise<Record<string, boolean>> {
  const timezone = await getTherapistTimezone(adminSupabase, therapistId);
  const rows = await fetchAllTimeBlockVisibilityRows(adminSupabase, therapistId);
  const byDow = new Map<number, TimeBlockVisibilityRow[]>();
  for (const r of rows) {
    const dow = dayOfWeek1to7InTimeZone(new Date(r.start_at), timezone);
    if (!byDow.has(dow)) byDow.set(dow, []);
    byDow.get(dow)!.push(r);
  }
  const out: Record<string, boolean> = {};
  for (let d = 1; d <= 7; d++) {
    const list = byDow.get(d) ?? [];
    out[String(d)] = list.length > 0 && list.every((x) => x.is_visible_to_client);
  }
  return out;
}

async function getTherapistTimezone(
  supabase: ReturnType<typeof createSupabaseServiceRoleClient>,
  therapistId: string,
): Promise<string> {
  const { data, error } = await supabase
    .from("therapists")
    .select("timezone")
    .eq("therapist_id", therapistId)
    .maybeSingle();
  if (error) return "Asia/Colombo";
  const tz = String((data as { timezone?: unknown } | null)?.timezone ?? "").trim();
  return tz || "Asia/Colombo";
}

function dayOfWeek1to7InTimeZone(d: Date, timeZone: string): number {
  const wd = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(d);
  const map: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  return map[wd] ?? 1;
}

function clampInt(n: unknown, min: number, max: number): number {
  const x = Number(n);
  if (!Number.isFinite(x)) return min;
  return Math.min(max, Math.max(min, Math.trunc(x)));
}

