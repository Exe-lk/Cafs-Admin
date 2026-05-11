import type { NextRequest } from "next/server";
import { ok, created, err } from "@/lib/api/envelope";
import { getAuthContext, requireRole } from "@/lib/api/auth";
import { parseIsoDateParam } from "@/lib/api/http";
import { newUuid } from "@/lib/api/ids";

type CreateBody = {
  startAt?: string;
  endAt?: string;
  reason?: string | null;
  isVisibleToClient?: boolean;
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
    .from("therapist_time_blocks")
    .select(
      "time_block_id,start_at,end_at,reason,is_visible_to_client,created_by,created_at",
    )
    .eq("therapist_id", therapistId)
    .order("start_at", { ascending: true });
  if (error) return err(error.message, 400);

  const res = ok({ items: data ?? [] }, "Time blocks retrieved successfully");
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
  const roleCheck = await requireRole(auth.supabase, auth.ctx.user.id, [
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

  const startD = parseIsoDateParam(typeof body.startAt === "string" ? body.startAt : null);
  const endD = parseIsoDateParam(typeof body.endAt === "string" ? body.endAt : null);
  if (!startD || !endD || !(endD > startD)) return err("Invalid startAt/endAt", 400);

  const now = new Date().toISOString();
  const timeBlockId = newUuid();

  const { error } = await auth.supabase.from("therapist_time_blocks").insert({
    time_block_id: timeBlockId,
    therapist_id: therapistId,
    start_at: startD.toISOString(),
    end_at: endD.toISOString(),
    reason: body.reason ?? null,
    is_visible_to_client: Boolean(body.isVisibleToClient),
    created_by: auth.ctx.user.id,
    created_at: now,
  });
  if (error) return err(error.message, 400);

  const res = created({ timeBlockId }, "Time block created successfully");
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ therapistId: string; timeBlockId?: string }> },
) {
  const { therapistId } = await params;
  const timeBlockId = request.nextUrl.searchParams.get("timeBlockId")?.trim() || null;
  const auth = await getAuthContext(request);
  if (!auth.ok) return err("Unauthorized", 401);
  const roleCheck = await requireRole(auth.supabase, auth.ctx.user.id, [
    "admin",
    "front_office",
  ]);
  if (!roleCheck.ok) return err("Forbidden", 403);
  if (!timeBlockId) return err("Missing timeBlockId", 400);

  const { error } = await auth.supabase
    .from("therapist_time_blocks")
    .delete()
    .eq("therapist_id", therapistId)
    .eq("time_block_id", timeBlockId);
  if (error) return err(error.message, 400);

  const res = ok(null, "Time block deleted successfully");
  res.headers.set("Cache-Control", "no-store");
  return res;
}

