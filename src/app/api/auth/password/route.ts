import { NextRequest, NextResponse } from 'next/server';
import { queryOne, execute } from '@/lib/db';
import { verifyPassword, hashPassword } from '@/lib/auth';
import { requireAuth, handleAuthError } from '@/lib/api-auth';

export async function PUT(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: 'New password must be at least 6 characters' }, { status: 400 });
    }

    const user = await queryOne<{ password_hash: string }>(
      'SELECT password_hash FROM users WHERE id = $1',
      [auth.userId]
    );

    if (!user || !verifyPassword(currentPassword, user.password_hash)) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 });
    }

    await execute('UPDATE users SET password_hash = $1 WHERE id = $2', [hashPassword(newPassword), auth.userId]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleAuthError(error);
  }
}
