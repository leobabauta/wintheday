import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, insertReturning } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { requireAuth, handleAuthError } from '@/lib/api-auth';
import { getClientWinHistory } from '@/lib/client-stats';

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request, 'coach');

    const clients = await query<{
      id: number; name: string; email: string;
      sign_on_date: string; closing_date: string;
      coaching_day: string; coaching_time: string; coaching_frequency: string;
    }>(
      `SELECT u.id, u.name, u.email, ci.sign_on_date, ci.closing_date,
              ci.coaching_day, ci.coaching_time, ci.coaching_frequency
       FROM users u
       JOIN client_info ci ON ci.user_id = u.id
       WHERE ci.coach_id = $1
       ORDER BY u.name`,
      [auth.userId]
    );

    const enriched = await Promise.all(clients.map(async client => {
      const commitmentCount = await queryOne<{ count: string }>(
        'SELECT COUNT(*) as count FROM commitments WHERE user_id = $1 AND active = 1',
        [client.id]
      );

      const winHistory = await getClientWinHistory(client.id, 14);

      const unreadMessages = await queryOne<{ count: string }>(
        'SELECT COUNT(*) as count FROM messages WHERE recipient_id = $1 AND sender_id = $2 AND read = 0',
        [auth.userId, client.id]
      );

      return {
        ...client,
        commitmentCount: parseInt(commitmentCount?.count || '0'),
        winHistory,
        unreadMessages: parseInt(unreadMessages?.count || '0'),
      };
    }));

    return NextResponse.json(enriched);
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = requireAuth(request, 'coach');
    const { email, name, password, signOnDate, closingDate, coachingDay, coachingTime, coachingFrequency } = await request.json();

    if (!email || !name || !password) {
      return NextResponse.json({ error: 'Email, name, and password required' }, { status: 400 });
    }

    const existing = await queryOne('SELECT id FROM users WHERE email = $1', [email]);
    if (existing) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
    }

    const userResult = await insertReturning<{ id: number }>(
      'INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING id',
      [email, hashPassword(password), name, 'client']
    );

    await insertReturning(
      `INSERT INTO client_info (user_id, coach_id, sign_on_date, closing_date, coaching_day, coaching_time, coaching_frequency)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [
        userResult.id,
        auth.userId,
        signOnDate || new Date().toISOString().split('T')[0],
        closingDate || null,
        coachingDay || null,
        coachingTime || null,
        coachingFrequency || 'Every 2 weeks'
      ]
    );

    return NextResponse.json({ id: userResult.id, ok: true });
  } catch (error) {
    return handleAuthError(error);
  }
}
