import { fetchTherapistGoogleRefreshToken } from "@/lib/google/therapistGoogleRefreshToken";
import { getOAuthClient } from "@/lib/google/googleClient";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

function devRefreshFallback(): string {
  return process.env.CAFS_DEV_THERAPIST_GOOGLE_REFRESH_TOKEN ?? "";
}

function devAccessFallback(): string {
  return process.env.CAFS_DEV_THERAPIST_GOOGLE_ACCESS_TOKEN ?? "";
}

/**
 * Loads the therapist's Google refresh token from `therapists.google_refresh_token_encrypted`.
 * Falls back to `CAFS_DEV_THERAPIST_GOOGLE_REFRESH_TOKEN` when missing (local dev only).
 */
export async function getRefreshByID(therapistId: string): Promise<string> {
  const supabase = createSupabaseServiceRoleClient();
  const { refreshToken, error } = await fetchTherapistGoogleRefreshToken(
    supabase,
    therapistId,
  );

  if (error) {
    console.error("[getRefreshByID] Failed to load refresh token", {
      therapistId,
      error,
    });
    return devRefreshFallback();
  }

  if (refreshToken) return refreshToken;
  return devRefreshFallback();
}

/**
 * Returns a short-lived Google access token for the therapist.
 * Uses the DB refresh token when present; otherwise dev env fallback.
 */
export async function GetAccessoken(therapistId: string): Promise<string> {
  const refreshToken = await getRefreshByID(therapistId);
  if (!refreshToken) return devAccessFallback();

  const oauth2 = getOAuthClient();
  oauth2.setCredentials({ refresh_token: refreshToken });

  try {
    const { token } = await oauth2.getAccessToken();
    if (token) return token;
  } catch (e) {
    console.error("[GetAccessoken] Failed to refresh access token", {
      therapistId,
      error: e,
    });
  }

  return devAccessFallback();
}
