import { google } from 'googleapis';

export const GCAL_SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
];

export function getOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Google OAuth env vars missing: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI');
  }
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function getCalendarClient(refreshToken: string) {
  const oauth = getOAuthClient();
  oauth.setCredentials({ refresh_token: refreshToken });
  return google.calendar({ version: 'v3', auth: oauth });
}
