import type { NextRequest } from "next/server";
import { ok, created, err } from "@/lib/api/envelope";
import { getAuthContext, requireRole } from "@/lib/api/auth";
import { newUuid } from "@/lib/api/ids";

type CreateBody = {
  title?: string | null;
};

export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request);
  if (!auth.ok) return err("Unauthorized", 401);
  const roleCheck = await requireRole(auth.supabase, auth.ctx.user.id, [
    "admin",
    "front_office",
  ]);
  if (!roleCheck.ok) return err("Forbidden", 403);

  const { data, error } = await auth.supabase
    .from("message_threads")
    .select("thread_id,title,created_by,created_at,updated_at")
    .order("updated_at", { ascending: false });
  if (error) return err(error.message, 400);

  const res = ok({ items: data ?? [] }, "Threads retrieved successfully");
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export async function POST(request: NextRequest) {
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

  const now = new Date().toISOString();
  const threadId = newUuid();

  const { error } = await auth.supabase.from("message_threads").insert({
    thread_id: threadId,
    title: body.title ?? null,
    created_by: auth.ctx.user.id,
    created_at: now,
    updated_at: now,
  });
  if (error) return err(error.message, 400);

  const res = created({ threadId }, "Thread created successfully");
  res.headers.set("Cache-Control", "no-store");
  return res;
}

