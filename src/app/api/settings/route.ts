import { NextRequest, NextResponse } from 'next/server';
import { execute } from '@/lib/db';
import { requireAuth, handleAuthError } from '@/lib/api-auth';
import { getUserSettings, updateUserSettings } from '@/lib/settings';

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    const settings = await getUserSettings(auth.userId);
    return NextResponse.json(settings);
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    const body = await request.json();

    // Handle name update separately (stored in users table)
    if (body.name !== undefined) {
      await execute('UPDATE users SET name = $1 WHERE id = $2', [body.name, auth.userId]);
    }

    // Handle other settings
    const { name, ...settingsUpdates } = body;
    if (Object.keys(settingsUpdates).length > 0) {
      await updateUserSettings(auth.userId, settingsUpdates);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleAuthError(error);
  }
}
