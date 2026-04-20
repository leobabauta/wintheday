import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleAuthError } from '@/lib/api-auth';
import { getOAuthClient, GCAL_SCOPES } from '@/lib/google';

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request, 'coach');
    const oauth = getOAuthClient();
    const url = oauth.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: GCAL_SCOPES,
      state: String(auth.userId),
    });
    return NextResponse.redirect(url);
  } catch (error) {
    return handleAuthError(error);
  }
}
