import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { execute } from '@/lib/db';
import { getOAuthClient } from '@/lib/google';
import { getAuthFromRequest } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  const settingsUrl = new URL('/dashboard/settings', url.origin);

  if (error || !code) {
    settingsUrl.searchParams.set('gcal', 'error');
    return NextResponse.redirect(settingsUrl);
  }

  const auth = getAuthFromRequest(request);
  const userId = auth?.role === 'coach' ? auth.userId : state ? parseInt(state) : null;
  if (!userId) {
    settingsUrl.searchParams.set('gcal', 'unauthorized');
    return NextResponse.redirect(settingsUrl);
  }

  try {
    const oauth = getOAuthClient();
    const { tokens } = await oauth.getToken(code);
    if (!tokens.refresh_token) {
      settingsUrl.searchParams.set('gcal', 'no_refresh_token');
      return NextResponse.redirect(settingsUrl);
    }

    oauth.setCredentials(tokens);
    let email: string | null = null;
    try {
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth });
      const profile = await oauth2.userinfo.get();
      email = profile.data.email ?? null;
    } catch (err) {
      console.warn('Failed to fetch Google userinfo (non-fatal):', err);
    }

    await execute(
      `INSERT INTO coach_integrations (user_id, google_refresh_token, google_calendar_email, updated_at)
       VALUES ($1, $2, $3, now())
       ON CONFLICT (user_id) DO UPDATE SET
         google_refresh_token = EXCLUDED.google_refresh_token,
         google_calendar_email = EXCLUDED.google_calendar_email,
         updated_at = now()`,
      [userId, tokens.refresh_token, email]
    );

    settingsUrl.searchParams.set('gcal', 'connected');
    return NextResponse.redirect(settingsUrl);
  } catch (err) {
    console.error('Google OAuth callback failed:', err);
    settingsUrl.searchParams.set('gcal', 'error');
    return NextResponse.redirect(settingsUrl);
  }
}
