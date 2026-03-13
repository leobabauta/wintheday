import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth, requireCoachOwnsClient, handleAuthError } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    const clientId = request.nextUrl.searchParams.get('userId');
    let targetUserId = auth.userId;

    if (clientId && auth.role === 'coach') {
      targetUserId = parseInt(clientId);
      requireCoachOwnsClient(auth.userId, targetUserId);
    }

    const db = getDb();
    const commitments = db.prepare(
      'SELECT * FROM commitments WHERE user_id = ? ORDER BY type, title'
    ).all(targetUserId);

    return NextResponse.json(commitments);
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    const { title, type, days_of_week, userId } = await request.json();

    let targetUserId = auth.userId;
    if (userId && auth.role === 'coach') {
      targetUserId = userId;
      requireCoachOwnsClient(auth.userId, targetUserId);
    }

    if (!title || !type || !days_of_week) {
      return NextResponse.json({ error: 'Title, type, and days_of_week required' }, { status: 400 });
    }

    const db = getDb();
    const result = db.prepare(
      'INSERT INTO commitments (user_id, title, type, days_of_week) VALUES (?, ?, ?, ?)'
    ).run(targetUserId, title, type, JSON.stringify(days_of_week));

    return NextResponse.json({ id: result.lastInsertRowid, ok: true });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    const { id, title, days_of_week, active, userId } = await request.json();

    let targetUserId = auth.userId;
    if (userId && auth.role === 'coach') {
      targetUserId = userId;
      requireCoachOwnsClient(auth.userId, targetUserId);
    }

    const db = getDb();
    const commitment = db.prepare(
      'SELECT id FROM commitments WHERE id = ? AND user_id = ?'
    ).get(id, targetUserId);

    if (!commitment) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (title !== undefined) {
      db.prepare('UPDATE commitments SET title = ?, updated_at = datetime(\'now\') WHERE id = ?').run(title, id);
    }
    if (days_of_week !== undefined) {
      db.prepare('UPDATE commitments SET days_of_week = ?, updated_at = datetime(\'now\') WHERE id = ?').run(JSON.stringify(days_of_week), id);
    }
    if (active !== undefined) {
      db.prepare('UPDATE commitments SET active = ?, updated_at = datetime(\'now\') WHERE id = ?').run(active ? 1 : 0, id);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleAuthError(error);
  }
}
