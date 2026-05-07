import type { NextRequest } from "next/server";
import { ok, created, err } from "@/lib/api/envelope";
import { getAuthContext, requireRoleService } from "@/lib/api/auth";
import { newUuid } from "@/lib/api/ids";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

type CreateBody = {
  userId?: string;
  visibility?: "public" | "private";
  title?: string;
  bio?: string;
  languages?: string[];
  specialties?: string[];
  timezone?: string;
  isAcceptingNewClients?: boolean;
};

export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request);
  if (!auth.ok) return err("Unauthorized", 401);
  const roleCheck = await requireRoleService(auth.ctx.user.id, ["admin"]);
  if (!roleCheck.ok) return err("Forbidden", 403);

  const adminSupabase = createSupabaseServiceRoleClient();
  const { data, error } = await adminSupabase
    .from("therapists")
    .select(
      "therapist_id,visibility,title,bio,languages,specialties,profile_photo_url,timezone,is_accepting_new_clients,updated_at,profiles(full_name,email,phone)",
    )
    .order("updated_at", { ascending: false });
  if (error) return err(error.message, 400);

  const res = ok({ items: data ?? [] }, "Therapists retrieved successfully");
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export async function POST(request: NextRequest) {
  const auth = await getAuthContext(request);
  if (!auth.ok) return err("Unauthorized", 401);
  const roleCheck = await requireRoleService(auth.ctx.user.id, ["admin"]);
  if (!roleCheck.ok) return err("Forbidden", 403);

  const adminSupabase = createSupabaseServiceRoleClient();
  let body: CreateBody;
  try {
    body = (await request.json()) as CreateBody;
  } catch {
    return err("Invalid JSON body", 400);
  }

  const userId = typeof body.userId === "string" ? body.userId.trim() : "";
  if (!userId) return err("Validation error", 400, [{ field: "userId", message: "Required" }]);

  const now = new Date().toISOString();

  // Ensure profile role is therapist.
  await adminSupabase
    .from("profiles")
    .update({ role: "therapist", updated_at: now })
    .eq("user_id", userId);

  const { error } = await adminSupabase.from("therapists").insert({
    therapist_id: userId,
    visibility: body.visibility ?? "public",
    title: body.title ?? null,
    bio: body.bio ?? null,
    languages: Array.isArray(body.languages) ? body.languages.join(", ") : null,
    specialties: Array.isArray(body.specialties) ? body.specialties.join(", ") : null,
    profile_photo_url: null,
    timezone: body.timezone ?? "Asia/Colombo",
    is_accepting_new_clients: body.isAcceptingNewClients ?? true,
    updated_at: now,
  });
  if (error) return err(error.message, 400);

  const res = created({ therapistId: userId }, "Therapist profile created successfully");
  res.headers.set("Cache-Control", "no-store");
  return res;
}

