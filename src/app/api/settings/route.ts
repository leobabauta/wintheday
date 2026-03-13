import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleAuthError } from '@/lib/api-auth';
import { getUserSettings, updateUserSettings } from '@/lib/settings';

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    const settings = getUserSettings(auth.userId);
    return NextResponse.json(settings);
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    const body = await request.json();
    updateUserSettings(auth.userId, body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleAuthError(error);
  }
}
