import type { NextRequest } from "next/server";
import { ok, err } from "@/lib/api/envelope";
import { getAuthContext, requireRole } from "@/lib/api/auth";

type Body = {
  profile?: {
    fullName?: string;
    email?: string | null;
    phone?: string | null;
    isActive?: boolean;
  };
  therapist?: {
    visibility?: "public" | "private";
    title?: string | null;
    bio?: string | null;
    languages?: string[]; // stored as csv
    specialties?: string[];
    profilePhotoUrl?: string | null;
    timezone?: string;
    isAcceptingNewClients?: boolean;
  };
};

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ therapistId: string }> },
) {
  const { therapistId } = await params;
  const auth = await getAuthContext(request);
  if (!auth.ok) return err("Unauthorized", 401);
  const roleCheck = await requireRole(auth.supabase, auth.ctx.user.id, ["admin"]);
  if (!roleCheck.ok) return err("Forbidden", 403);

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return err("Invalid JSON body", 400);
  }

  const now = new Date().toISOString();

  // Update profile fields.
  if (body.profile) {
    const p: Record<string, unknown> = { updated_at: now };
    if (typeof body.profile.fullName === "string")
      p.full_name = body.profile.fullName.trim();
    if (body.profile.email === null || typeof body.profile.email === "string")
      p.email = body.profile.email;
    if (body.profile.phone === null || typeof body.profile.phone === "string")
      p.phone = body.profile.phone;
    if (typeof body.profile.isActive === "boolean")
      p.is_active = body.profile.isActive;

    const { error } = await auth.supabase
      .from("profiles")
      .update(p)
      .eq("user_id", therapistId);
    if (error) return err(error.message, 400);
  }

  // Update therapist fields.
  if (body.therapist) {
    const t: Record<string, unknown> = { updated_at: now };
    if (body.therapist.visibility === "public" || body.therapist.visibility === "private")
      t.visibility = body.therapist.visibility;
    if (body.therapist.title === null || typeof body.therapist.title === "string")
      t.title = body.therapist.title;
    if (body.therapist.bio === null || typeof body.therapist.bio === "string")
      t.bio = body.therapist.bio;
    if (Array.isArray(body.therapist.languages))
      t.languages = body.therapist.languages.join(", ");
    if (Array.isArray(body.therapist.specialties))
      t.specialties = body.therapist.specialties.join(", ");
    if (
      body.therapist.profilePhotoUrl === null ||
      typeof body.therapist.profilePhotoUrl === "string"
    )
      t.profile_photo_url = body.therapist.profilePhotoUrl;
    if (typeof body.therapist.timezone === "string") t.timezone = body.therapist.timezone;
    if (typeof body.therapist.isAcceptingNewClients === "boolean")
      t.is_accepting_new_clients = body.therapist.isAcceptingNewClients;

    const { error } = await auth.supabase
      .from("therapists")
      .update(t)
      .eq("therapist_id", therapistId);
    if (error) return err(error.message, 400);
  }

  const res = ok(null, "Therapist updated successfully");
  res.headers.set("Cache-Control", "no-store");
  return res;
}

