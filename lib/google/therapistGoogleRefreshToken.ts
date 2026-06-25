import type { SupabaseClient } from "@supabase/supabase-js";
import {
  decryptGoogleRefreshToken,
  encryptGoogleRefreshToken,
} from "@/lib/crypto/googleRefreshToken";

/**
 * Persists an encrypted Google refresh token on the therapist row.
 */
export async function saveTherapistGoogleRefreshToken(
  supabase: SupabaseClient,
  therapistId: string,
  refreshToken: string,
): Promise<{ error: string | null }> {
  const encrypted = encryptGoogleRefreshToken(refreshToken);
  const { error } = await supabase
    .from("therapists")
    .update({
      google_refresh_token_encrypted: encrypted,
      updated_at: new Date().toISOString(),
    })
    .eq("therapist_id", therapistId);

  return { error: error?.message ?? null };
}

/**
 * Loads and decrypts the therapist's Google refresh token, if present.
 */
export async function fetchTherapistGoogleRefreshToken(
  supabase: SupabaseClient,
  therapistId: string,
): Promise<{ refreshToken: string | null; error: string | null }> {
  const { data, error } = await supabase
    .from("therapists")
    .select("google_refresh_token_encrypted")
    .eq("therapist_id", therapistId)
    .maybeSingle();

  if (error) return { refreshToken: null, error: error.message };

  const encrypted = data?.google_refresh_token_encrypted;
  if (!encrypted || typeof encrypted !== "string") {
    return { refreshToken: null, error: null };
  }

  try {
    return {
      refreshToken: decryptGoogleRefreshToken(encrypted),
      error: null,
    };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Failed to decrypt Google refresh token";
    return { refreshToken: null, error: message };
  }
}
