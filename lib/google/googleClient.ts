import { google } from "googleapis";

const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;

export function getOAuthClient() {
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

// Reusable instance for secondary therapist calendar OAuth routes.
export const googleOAuth2Client = getOAuthClient();
