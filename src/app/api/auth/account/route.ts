import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { verifyPassword } from '@/lib/auth';
import { requireAuth, handleAuthError } from '@/lib/api-auth';
import { deleteClientAccount } from '@/lib/account-deletion';
import { COOKIE_NAME } from '@/lib/config';

// Clients only — deleting the coach would orphan every client.
export async function DELETE(request: NextRequest) {
  try {
    const auth = requireAuth(request, 'client');
    const { password } = await request.json();

    const user = await queryOne<{ password_hash: string }>(
      'SELECT password_hash FROM users WHERE id = $1',
      [auth.userId]
    );
    if (!user || !password || !verifyPassword(password, user.password_hash)) {
      return NextResponse.json({ error: 'Password is incorrect' }, { status: 401 });
    }

    await deleteClientAccount(auth.userId);

    const response = NextResponse.json({ ok: true });
    response.cookies.set(COOKIE_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });
    return response;
  } catch (error) {
    return handleAuthError(error);
  }
}
