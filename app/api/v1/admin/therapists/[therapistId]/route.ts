import type { NextRequest } from "next/server";
import { ok, err } from "@/lib/api/envelope";
import { getAuthContext, requireRoleService } from "@/lib/api/auth";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

type Body = {
  visibility?: "public" | "private";
  isAcceptingNewClients?: boolean;
  title?: string;
  bio?: string;
};

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ therapistId: string }> },
) {
  const { therapistId } = await params;
  const auth = await getAuthContext(request);
  if (!auth.ok) return err("Unauthorized", 401);
  const roleCheck = await requireRoleService(auth.ctx.user.id, ["admin"]);
  if (!roleCheck.ok) return err("Forbidden", 403);

  const adminSupabase = createSupabaseServiceRoleClient();
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return err("Invalid JSON body", 400);
  }

  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.visibility === "public" || body.visibility === "private")
    payload.visibility = body.visibility;
  if (typeof body.isAcceptingNewClients === "boolean")
    payload.is_accepting_new_clients = body.isAcceptingNewClients;
  if (typeof body.title === "string") payload.title = body.title;
  if (typeof body.bio === "string") payload.bio = body.bio;

  const { error } = await adminSupabase
    .from("therapists")
    .update(payload)
    .eq("therapist_id", therapistId);
  if (error) return err(error.message, 400);

  const res = ok(null, "Therapist updated successfully");
  res.headers.set("Cache-Control", "no-store");
  return res;
}

