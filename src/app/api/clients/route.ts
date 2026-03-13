import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { requireAuth, handleAuthError } from '@/lib/api-auth';
import { getClientWinHistory } from '@/lib/client-stats';

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request, 'coach');

    const db = getDb();
    const clients = db.prepare(
      `SELECT u.id, u.name, u.email, ci.sign_on_date, ci.closing_date,
              ci.coaching_day, ci.coaching_time, ci.coaching_frequency
       FROM users u
       JOIN client_info ci ON ci.user_id = u.id
       WHERE ci.coach_id = ?
       ORDER BY u.name`
    ).all(auth.userId) as Array<{
      id: number; name: string; email: string;
      sign_on_date: string; closing_date: string;
      coaching_day: string; coaching_time: string; coaching_frequency: string;
    }>;

    // Enrich with commitment counts and win history
    const enriched = clients.map(client => {
      const commitmentCount = db.prepare(
        'SELECT COUNT(*) as count FROM commitments WHERE user_id = ? AND active = 1'
      ).get(client.id) as { count: number };

      const winHistory = getClientWinHistory(client.id, 14);

      const unreadMessages = db.prepare(
        'SELECT COUNT(*) as count FROM messages WHERE recipient_id = ? AND sender_id = ? AND read = 0'
      ).get(auth.userId, client.id) as { count: number };

      return {
        ...client,
        commitmentCount: commitmentCount.count,
        winHistory,
        unreadMessages: unreadMessages.count,
      };
    });

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

    const db = getDb();

    // Check if email already exists
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
    }

    const userResult = db.prepare(
      'INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)'
    ).run(email, hashPassword(password), name, 'client');

    db.prepare(
      `INSERT INTO client_info (user_id, coach_id, sign_on_date, closing_date, coaching_day, coaching_time, coaching_frequency)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      userResult.lastInsertRowid,
      auth.userId,
      signOnDate || new Date().toISOString().split('T')[0],
      closingDate || null,
      coachingDay || null,
      coachingTime || null,
      coachingFrequency || 'Every 2 weeks'
    );

    return NextResponse.json({ id: userResult.lastInsertRowid, ok: true });
  } catch (error) {
    return handleAuthError(error);
  }
}
