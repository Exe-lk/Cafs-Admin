import { google } from "googleapis";
import { getOAuthClient } from "./googleClient";

type TokenParams = {
  accessToken: string;
  refreshToken: string;
};

type CreateEventParams = TokenParams & {
  start: string;
  end: string;
  patientEmail: string;
  therapistEmail: string;
  /** When true, attach a Google Meet conference to the calendar event. */
  includeMeetLink?: boolean;
};

type UpdateEventParams = TokenParams & {
  eventId: string;
  start: string;
  end: string;
};

type DeleteEventParams = TokenParams & {
  eventId: string;
};

type CheckAvailabilityParams = TokenParams & {
  start: string;
  end: string;
  email: string;
};

function getCalendarClient(accessToken: string, refreshToken: string) {
  const oauth2 = getOAuthClient();
  oauth2.setCredentials({ access_token: accessToken, refresh_token: refreshToken });
  return google.calendar({ version: "v3", auth: oauth2 });
}

export async function createEvent(params: CreateEventParams) {
  const calendar = getCalendarClient(params.accessToken, params.refreshToken);
  const includeMeetLink = params.includeMeetLink === true;

  const requestBody: {
    summary: string;
    start: { dateTime: string };
    end: { dateTime: string };
    attendees: Array<{ email: string }>;
    conferenceData?: {
      createRequest: {
        requestId: string;
        conferenceSolutionKey: { type: string };
      };
    };
  } = {
    summary: "Therapy Session",
    start: { dateTime: params.start },
    end: { dateTime: params.end },
    attendees: [{ email: params.patientEmail }, { email: params.therapistEmail }],
  };

  if (includeMeetLink) {
    requestBody.conferenceData = {
      createRequest: {
        requestId: crypto.randomUUID(),
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    };
  }

  const response = await calendar.events.insert({
    calendarId: "primary",
    ...(includeMeetLink ? { conferenceDataVersion: 1 } : {}),
    requestBody,
  });

  const event = response.data;
  const meetLink = includeMeetLink
    ? event.hangoutLink ||
      event.conferenceData?.entryPoints?.find((entry) => entry.entryPointType === "video")?.uri ||
      null
    : null;

  return {
    eventId: event.id ?? null,
    meetLink,
  };
}

export async function updateEvent(params: UpdateEventParams) {
  const calendar = getCalendarClient(params.accessToken, params.refreshToken);
  await calendar.events.patch({
    calendarId: "primary",
    eventId: params.eventId,
    requestBody: {
      start: { dateTime: params.start },
      end: { dateTime: params.end },
    },
  });
}

export async function deleteEvent(params: DeleteEventParams) {
  const calendar = getCalendarClient(params.accessToken, params.refreshToken);
  await calendar.events.delete({
    calendarId: "primary",
    eventId: params.eventId,
  });
}

export async function checkAvailability(params: CheckAvailabilityParams) {
  const oauth2 = getOAuthClient();
  oauth2.setCredentials({
    access_token: params.accessToken,
    refresh_token: params.refreshToken,
  });
  const calendar = google.calendar({ version: "v3", auth: oauth2 });
  const response = await calendar.freebusy.query({
    requestBody: {
      timeMin: params.start,
      timeMax: params.end,
      items: [{ id: params.email }],
    },
  });

  return (response.data.calendars?.[params.email]?.busy ?? []).map((slot) => ({
    start: slot.start ?? "",
    end: slot.end ?? "",
  }));
}
