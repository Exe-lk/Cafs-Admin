import type { NextRequest } from "next/server";
import { ok, created, err } from "@/lib/api/envelope";
import { getAuthContext, requireRole } from "@/lib/api/auth";
import { newUuid } from "@/lib/api/ids";

type CreateBody = {
  body?: string;
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> },
) {
  const { threadId } = await params;
  const auth = await getAuthContext(request);
  if (!auth.ok) return err("Unauthorized", 401);
  const roleCheck = await requireRole(auth.supabase, auth.ctx.user.id, [
    "admin",
    "front_office",
  ]);
  if (!roleCheck.ok) return err("Forbidden", 403);

  const { data, error } = await auth.supabase
    .from("messages")
    .select("message_id,thread_id,sender_id,body,created_at")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });
  if (error) return err(error.message, 400);

  const res = ok({ items: data ?? [] }, "Messages retrieved successfully");
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> },
) {
  const { threadId } = await params;
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

  const text = typeof body.body === "string" ? body.body.trim() : "";
  if (!text) return err("Validation error", 400, [{ field: "body", message: "Required" }]);

  const now = new Date().toISOString();
  const messageId = newUuid();

  const { error } = await auth.supabase.from("messages").insert({
    message_id: messageId,
    thread_id: threadId,
    sender_id: auth.ctx.user.id,
    body: text,
    created_at: now,
  });
  if (error) return err(error.message, 400);

  // Touch thread updated_at for ordering
  await auth.supabase
    .from("message_threads")
    .update({ updated_at: now })
    .eq("thread_id", threadId);

  const res = created({ messageId }, "Message sent successfully");
  res.headers.set("Cache-Control", "no-store");
  return res;
}

