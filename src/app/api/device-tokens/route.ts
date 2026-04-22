import { NextRequest, NextResponse } from 'next/server';
import { execute } from '@/lib/db';
import { requireAuth, handleAuthError } from '@/lib/api-auth';

// Called by the Capacitor wrapper after the user approves push permission.
// Upserts on token — same physical device moving between accounts updates
// its user_id instead of creating a duplicate.
export async function POST(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    const { token, platform } = await request.json();

    if (!token || !platform) {
      return NextResponse.json({ error: 'token and platform required' }, { status: 400 });
    }
    if (platform !== 'ios' && platform !== 'android') {
      return NextResponse.json({ error: 'platform must be ios or android' }, { status: 400 });
    }

    await execute(
      `INSERT INTO device_tokens (user_id, platform, token, last_seen_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (token) DO UPDATE SET
         user_id = EXCLUDED.user_id,
         platform = EXCLUDED.platform,
         last_seen_at = NOW()`,
      [auth.userId, platform, token]
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleAuthError(error);
  }
}

// Called on logout so we don't push to a device whose user signed out.
export async function DELETE(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    const { token } = await request.json();

    if (token) {
      await execute('DELETE FROM device_tokens WHERE token = $1 AND user_id = $2', [token, auth.userId]);
    } else {
      await execute('DELETE FROM device_tokens WHERE user_id = $1', [auth.userId]);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleAuthError(error);
  }
}
