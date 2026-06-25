import type { SupabaseClient } from "@supabase/supabase-js";
import { checkAvailability, createEvent } from "@/lib/google/calendarService";
import { getRefreshByID, GetAccessoken } from "@/lib/google/therapistGoogleTokens";

export type CreateGoogleCalendarForAppointmentInput = {
  therapistId: string;
  clientId: string;
  appointmentType: "online" | "in_person";
  startUtc: Date;
  endUtc: Date;
};

export type CreateGoogleCalendarForAppointmentResult =
  | {
      ok: true;
      meetLink: string | null;
      googleCalendarEventId: string;
    }
  | {
      ok: false;
      status: number;
      message: string;
    };

function calendarBusyOverlapsRange(
  busyStartIso: string,
  busyEndIso: string,
  rangeStart: Date,
  rangeEnd: Date,
): boolean {
  if (!busyStartIso || !busyEndIso) return false;
  const busyStart = new Date(busyStartIso).getTime();
  const busyEnd = new Date(busyEndIso).getTime();
  if (!Number.isFinite(busyStart) || !Number.isFinite(busyEnd)) return false;
  return busyStart < rangeEnd.getTime() && busyEnd > rangeStart.getTime();
}

/**
 * Creates a Google Calendar event on the therapist's calendar (with Meet for online).
 * Uses `therapists.google_refresh_token_encrypted` for the given therapistId.
 */
export async function createGoogleCalendarForAppointment(
  adminSupabase: SupabaseClient,
  input: CreateGoogleCalendarForAppointmentInput,
): Promise<CreateGoogleCalendarForAppointmentResult> {
  const { therapistId, clientId, appointmentType, startUtc, endUtc } = input;

  const [{ data: clientProfile }, { data: therapistRow }] = await Promise.all([
    adminSupabase
      .from("profiles")
      .select("email")
      .eq("user_id", clientId)
      .maybeSingle(),
    adminSupabase
      .from("therapists")
      .select("therapist_id,profiles(email)")
      .eq("therapist_id", therapistId)
      .maybeSingle(),
  ]);

  if (!therapistRow) {
    return { ok: false, status: 400, message: "Invalid therapistId" };
  }

  const patientEmail =
    typeof clientProfile?.email === "string" ? clientProfile.email.trim() : "";
  const therapistEmail = String(
    (therapistRow as { profiles?: { email?: string | null } | null }).profiles?.email ?? "",
  ).trim();

  if (!patientEmail || !therapistEmail) {
    return {
      ok: false,
      status: 400,
      message:
        "Client and therapist must have an email on file to create a calendar booking.",
    };
  }

  const refreshToken = await getRefreshByID(therapistId);
  if (!refreshToken) {
    console.error(
      "[createGoogleCalendarForAppointment] Missing Google OAuth tokens for therapist",
      therapistId,
    );
    return {
      ok: false,
      status: 503,
      message: "Calendar is not configured for this therapist.",
    };
  }

  const accessToken = (await GetAccessoken(therapistId)) || "";
  if (!accessToken) {
    return {
      ok: false,
      status: 503,
      message: "Calendar is not configured for this therapist.",
    };
  }

  try {
    const busySlots = await checkAvailability({
      accessToken,
      refreshToken,
      start: startUtc.toISOString(),
      end: endUtc.toISOString(),
      email: therapistEmail,
    });
    const therapistBusy = busySlots.some((slot) =>
      calendarBusyOverlapsRange(slot.start, slot.end, startUtc, endUtc),
    );
    if (therapistBusy) {
      return {
        ok: false,
        status: 409,
        message: "Therapist is not available at this time on Google Calendar.",
      };
    }
  } catch (e) {
    console.error("[createGoogleCalendarForAppointment] checkAvailability failed", e);
    return { ok: false, status: 502, message: "Could not verify calendar availability." };
  }

  const isOnline = appointmentType === "online";

  try {
    const cal = await createEvent({
      accessToken,
      refreshToken,
      start: startUtc.toISOString(),
      end: endUtc.toISOString(),
      patientEmail,
      therapistEmail,
      includeMeetLink: isOnline,
    });

    if (!cal.eventId) {
      console.error("[createGoogleCalendarForAppointment] Google Calendar returned no event id", {
        therapistId,
        startAt: startUtc.toISOString(),
        endAt: endUtc.toISOString(),
      });
      return { ok: false, status: 502, message: "Calendar event could not be created." };
    }

    const meetLink = isOnline ? cal.meetLink : null;
    if (isOnline && !meetLink) {
      return {
        ok: false,
        status: 502,
        message: "Google Meet link could not be created for this online appointment.",
      };
    }

    return {
      ok: true,
      meetLink,
      googleCalendarEventId: cal.eventId,
    };
  } catch (e) {
    console.error("[createGoogleCalendarForAppointment] createEvent failed", e);
    return { ok: false, status: 502, message: "Calendar event could not be created." };
  }
}
