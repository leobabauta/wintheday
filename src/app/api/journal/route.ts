import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth, requireCoachOwnsClient, handleAuthError } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    const date = request.nextUrl.searchParams.get('date');
    const clientId = request.nextUrl.searchParams.get('userId');

    let targetUserId = auth.userId;
    if (clientId && auth.role === 'coach') {
      targetUserId = parseInt(clientId);
      requireCoachOwnsClient(auth.userId, targetUserId);
    }

    const db = getDb();

    if (date) {
      const entry = db.prepare(
        'SELECT * FROM journal_entries WHERE user_id = ? AND date = ?'
      ).get(targetUserId, date);
      return NextResponse.json(entry || null);
    }

    // Return recent entries
    const entries = db.prepare(
      'SELECT * FROM journal_entries WHERE user_id = ? ORDER BY date DESC LIMIT 14'
    ).all(targetUserId);
    return NextResponse.json(entries);
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    const { date, content } = await request.json();

    if (!date) {
      return NextResponse.json({ error: 'Date required' }, { status: 400 });
    }

    const db = getDb();
    const existing = db.prepare(
      'SELECT id FROM journal_entries WHERE user_id = ? AND date = ?'
    ).get(auth.userId, date);

    if (existing) {
      db.prepare(
        'UPDATE journal_entries SET content = ?, updated_at = datetime(\'now\') WHERE user_id = ? AND date = ?'
      ).run(content || '', auth.userId, date);
    } else {
      db.prepare(
        'INSERT INTO journal_entries (user_id, date, content) VALUES (?, ?, ?)'
      ).run(auth.userId, date, content || '');
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleAuthError(error);
  }
}
