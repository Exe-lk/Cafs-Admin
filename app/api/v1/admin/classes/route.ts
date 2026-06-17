import type { NextRequest } from "next/server";
import { ok, created, err } from "@/lib/api/envelope";
import { getAuthContext, requireRoleService } from "@/lib/api/auth";
import { newUuid } from "@/lib/api/ids";
import { parseIsoDateParam } from "@/lib/api/http";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

type CreateBody = {
  title?: string;
  description?: string | null;
  startAt?: string;
  endAt?: string;
  capacity?: number | null;
  isActive?: boolean;
};

export async function GET(request: NextRequest) {
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
    .select("class_id,title,description,start_at,end_at,capacity,is_active,created_at,updated_at")
    .order("start_at", { ascending: false });
  if (error) return err(error.message, 400);

  const res = ok({ items: data ?? [] }, "Classes retrieved successfully");
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export async function POST(request: NextRequest) {
  const auth = await getAuthContext(request);
  if (!auth.ok) return err("Unauthorized", 401);
  const roleCheck = await requireRoleService(auth.ctx.user.id, [
    "admin",
    "front_office",
  ]);
  if (!roleCheck.ok) return err("Forbidden", 403);

  let body: CreateBody;
  try {
    body = (await request.json()) as CreateBody;
  } catch {
    return err("Invalid JSON body", 400);
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const startD = parseIsoDateParam(typeof body.startAt === "string" ? body.startAt : null);
  const endD = parseIsoDateParam(typeof body.endAt === "string" ? body.endAt : null);
  if (!title || !startD || !endD || !(endD > startD)) return err("Validation error", 400);

  const now = new Date().toISOString();
  const classId = newUuid();

  const adminSupabase = createSupabaseServiceRoleClient();
  const { error } = await adminSupabase.from("classes").insert({
    class_id: classId,
    title,
    description: body.description ?? null,
    start_at: startD.toISOString(),
    end_at: endD.toISOString(),
    capacity: typeof body.capacity === "number" ? Math.floor(body.capacity) : null,
    is_active: typeof body.isActive === "boolean" ? body.isActive : true,
    created_at: now,
    updated_at: now,
  });
  if (error) return err(error.message, 400);

  const res = created({ classId }, "Class created successfully");
  res.headers.set("Cache-Control", "no-store");
  return res;
}
