import type { NextRequest } from "next/server";
import { ok, err } from "@/lib/api/envelope";
import { getAuthContext, requireRole } from "@/lib/api/auth";
import { newUuid } from "@/lib/api/ids";

type Body = {
  items?: Array<{
    dayOfWeek: number;
    startTime: string; // "HH:MM"
    endTime: string; // "HH:MM"
    isActive: boolean;
  }>;
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ therapistId: string }> },
) {
  const { therapistId } = await params;
  const auth = await getAuthContext(request);
  if (!auth.ok) return err("Unauthorized", 401);
  const roleCheck = await requireRole(auth.supabase, auth.ctx.user.id, [
    "admin",
    "front_office",
  ]);
  if (!roleCheck.ok) return err("Forbidden", 403);

  const { data, error } = await auth.supabase
    .from("therapist_working_hours")
    .select("working_hours_id,day_of_week,start_time,end_time,is_active,created_at")
    .eq("therapist_id", therapistId)
    .order("day_of_week", { ascending: true });
  if (error) return err(error.message, 400);

  const res = ok({ items: data ?? [] }, "Working hours retrieved successfully");
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ therapistId: string }> },
) {
  const { therapistId } = await params;
  const auth = await getAuthContext(request);
  if (!auth.ok) return err("Unauthorized", 401);
  const roleCheck = await requireRole(auth.supabase, auth.ctx.user.id, [
    "admin",
    "front_office",
  ]);
  if (!roleCheck.ok) return err("Forbidden", 403);

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return err("Invalid JSON body", 400);
  }

  const items = Array.isArray(body.items) ? body.items : null;
  if (!items) return err("Validation error", 400, [{ field: "items", message: "Required" }]);

  const now = new Date().toISOString();

  const { error: deleteError } = await auth.supabase
    .from("therapist_working_hours")
    .delete()
    .eq("therapist_id", therapistId);
  if (deleteError) return err(deleteError.message, 400);

  const rows = items.map((it) => ({
    working_hours_id: newUuid(),
    therapist_id: therapistId,
    day_of_week: it.dayOfWeek,
    start_time: normalizeTime(it.startTime),
    end_time: normalizeTime(it.endTime),
    is_active: Boolean(it.isActive),
    created_at: now,
  }));

  const { error } = await auth.supabase.from("therapist_working_hours").insert(rows);
  if (error) return err(error.message, 400);

  const res = ok(null, "Working hours updated successfully");
  res.headers.set("Cache-Control", "no-store");
  return res;
}

function normalizeTime(raw: string): string {
  const m = /^(\d{2}):(\d{2})$/.exec(raw.trim());
  if (!m) return "00:00:00";
  return `${m[1]}:${m[2]}:00`;
}

