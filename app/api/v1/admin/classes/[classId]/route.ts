import type { NextRequest } from "next/server";
import { ok, err } from "@/lib/api/envelope";
import { getAuthContext, requireRoleService } from "@/lib/api/auth";
import { parseIsoDateParam } from "@/lib/api/http";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

const SELECT_COLUMNS =
  "class_id,title,description,start_at,end_at,capacity,is_active,created_at,updated_at";

type PutBody = {
  title?: string;
  description?: string | null;
  startAt?: string;
  endAt?: string;
  capacity?: number | null;
  isActive?: boolean;
};

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ classId: string }> },
) {
  const { classId } = await params;
  const auth = await getAuthContext(request);
  if (!auth.ok) return err("Unauthorized", 401);
  const roleCheck = await requireRoleService(auth.ctx.user.id, [
    "admin",
    "front_office",
  ]);
  if (!roleCheck.ok) return err("Forbidden", 403);

  let body: PutBody;
  try {
    body = (await request.json()) as PutBody;
  } catch {
    return err("Invalid JSON body", 400);
  }

  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.title === "string") payload.title = body.title.trim();
  if (body.description === null || typeof body.description === "string")
    payload.description = body.description;
  if (typeof body.startAt === "string") {
    const d = parseIsoDateParam(body.startAt);
    if (!d) return err("Invalid startAt", 400);
    payload.start_at = d.toISOString();
  }
  if (typeof body.endAt === "string") {
    const d = parseIsoDateParam(body.endAt);
    if (!d) return err("Invalid endAt", 400);
    payload.end_at = d.toISOString();
  }
  if (body.capacity === null || typeof body.capacity === "number")
    payload.capacity = body.capacity === null ? null : Math.floor(body.capacity);
  if (typeof body.isActive === "boolean") payload.is_active = body.isActive;

  const adminSupabase = createSupabaseServiceRoleClient();
  const { data, error } = await adminSupabase
    .from("classes")
    .update(payload)
    .eq("class_id", classId)
    .select(SELECT_COLUMNS)
    .maybeSingle();
  if (error) return err(error.message, 400);
  if (!data) return err("Class not found", 404);

  const res = ok(data, "Class updated successfully");
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ classId: string }> },
) {
  const { classId } = await params;
  const auth = await getAuthContext(request);
  if (!auth.ok) return err("Unauthorized", 401);
  const roleCheck = await requireRoleService(auth.ctx.user.id, [
    "admin",
    "front_office",
  ]);
  if (!roleCheck.ok) return err("Forbidden", 403);

  const adminSupabase = createSupabaseServiceRoleClient();
  const { data, error } = await adminSupabase
    .from("classes")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("class_id", classId)
    .select("class_id")
    .maybeSingle();
  if (error) return err(error.message, 400);
  if (!data) return err("Class not found", 404);

  const res = ok(null, "Class deleted successfully");
  res.headers.set("Cache-Control", "no-store");
  return res;
}
