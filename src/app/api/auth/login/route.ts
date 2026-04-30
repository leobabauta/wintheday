import { NextRequest, NextResponse } from 'next/server';
import { execute, queryOne } from '@/lib/db';
import { verifyPassword, createSessionToken } from '@/lib/auth';
import { COOKIE_NAME } from '@/lib/config';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    // Normalize email lookup so phone-autocapitalized "Vivek.Bakshi@…" matches
    // the lowercase row in the DB. Stored emails are kept lowercase at write
    // time (see clients/route.ts, settings/route.ts).
    const normalizedEmail = email.trim().toLowerCase();
    const user = await queryOne<{ id: number; email: string; password_hash: string; name: string; role: string }>(
      'SELECT id, email, password_hash, name, role FROM users WHERE email = $1',
      [normalizedEmail]
    );

    if (!user || !verifyPassword(password, user.password_hash)) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const token = createSessionToken(user.id, user.role);

    await execute('UPDATE users SET last_active_at = NOW() WHERE id = $1', [user.id]);

    const response = NextResponse.json({
      ok: true,
      role: user.role,
      name: user.name,
    });

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Login error:', msg, error);
    return NextResponse.json({ error: `Internal server error: ${msg}` }, { status: 500 });
  }
}
