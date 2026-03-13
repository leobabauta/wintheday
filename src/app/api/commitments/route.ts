import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, execute, insertReturning } from '@/lib/db';
import { requireAuth, requireCoachOwnsClient, handleAuthError } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    const clientId = request.nextUrl.searchParams.get('userId');
    let targetUserId = auth.userId;

    if (clientId && auth.role === 'coach') {
      targetUserId = parseInt(clientId);
      await requireCoachOwnsClient(auth.userId, targetUserId);
    }

    const commitments = await query(
      'SELECT * FROM commitments WHERE user_id = $1 ORDER BY type, title',
      [targetUserId]
    );

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
      await requireCoachOwnsClient(auth.userId, targetUserId);
    }

    if (!title || !type || !days_of_week) {
      return NextResponse.json({ error: 'Title, type, and days_of_week required' }, { status: 400 });
    }

    const result = await insertReturning<{ id: number }>(
      'INSERT INTO commitments (user_id, title, type, days_of_week) VALUES ($1, $2, $3, $4) RETURNING id',
      [targetUserId, title, type, JSON.stringify(days_of_week)]
    );

    return NextResponse.json({ id: result.id, ok: true });
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
      await requireCoachOwnsClient(auth.userId, targetUserId);
    }

    const commitment = await queryOne(
      'SELECT id FROM commitments WHERE id = $1 AND user_id = $2',
      [id, targetUserId]
    );

    if (!commitment) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (title !== undefined) {
      await execute('UPDATE commitments SET title = $1, updated_at = now() WHERE id = $2', [title, id]);
    }
    if (days_of_week !== undefined) {
      await execute('UPDATE commitments SET days_of_week = $1, updated_at = now() WHERE id = $2', [JSON.stringify(days_of_week), id]);
    }
    if (active !== undefined) {
      await execute('UPDATE commitments SET active = $1, updated_at = now() WHERE id = $2', [active ? 1 : 0, id]);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleAuthError(error);
  }
}
