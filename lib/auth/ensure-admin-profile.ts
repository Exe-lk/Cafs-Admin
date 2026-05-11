import type { SupabaseClient, User } from "@supabase/supabase-js";

type AdminProfileInput = {
  fullName: string;
  email: string | null;
  phone?: string | null;
};

type ExistingProfile = {
  role: "admin" | "therapist" | "front_office" | "client";
  is_active: boolean;
};

/**
 * Ensures `profiles` exists for the user with role `admin`.
 * Does NOT create a `client_profiles` row.
 */
export async function ensureAdminProfile(
  supabase: SupabaseClient,
  userId: string,
  input: AdminProfileInput,
): Promise<{ profileError: string | null }> {
  const now = new Date().toISOString();

  const { error: insErr } = await supabase.from("profiles").insert({
    user_id: userId,
    role: "admin",
    full_name: input.fullName,
    email: input.email,
    phone: input.phone ?? null,
    is_active: true,
    created_at: now,
    updated_at: now,
  });

  if (insErr) {
    if (insErr.code !== "23505") {
      return { profileError: insErr.message };
    }

    const { data: existing, error: readErr } = await supabase
      .from("profiles")
      .select("role,is_active")
      .eq("user_id", userId)
      .maybeSingle<ExistingProfile>();

    if (readErr) return { profileError: readErr.message };
    if (!existing) return { profileError: "profile_not_found" };
    if (existing.role !== "admin" || !existing.is_active) {
      return { profileError: "admin_access_denied" };
    }

    const { error: upErr } = await supabase
      .from("profiles")
      .update({
        full_name: input.fullName,
        email: input.email,
        phone: input.phone ?? null,
        updated_at: now,
      })
      .eq("user_id", userId);

    if (upErr) return { profileError: upErr.message };
  }

  return { profileError: null };
}

export function displayNameFromUser(user: User): string {
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const full =
    (typeof meta?.full_name === "string" && meta.full_name) ||
    (typeof meta?.name === "string" && meta.name) ||
    "";
  if (full.trim()) return full.trim();
  if (user.email) return user.email.split("@")[0] ?? "Admin";
  return "Admin";
}

