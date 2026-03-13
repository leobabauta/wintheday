import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, execute } from '@/lib/db';
import { requireAuth, requireCoachOwnsClient, handleAuthError } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    const date = request.nextUrl.searchParams.get('date');
    const clientId = request.nextUrl.searchParams.get('userId');

    let targetUserId = auth.userId;
    if (clientId && auth.role === 'coach') {
      targetUserId = parseInt(clientId);
      await requireCoachOwnsClient(auth.userId, targetUserId);
    }

    if (date) {
      const entry = await queryOne(
        'SELECT * FROM journal_entries WHERE user_id = $1 AND date = $2',
        [targetUserId, date]
      );
      return NextResponse.json(entry || null);
    }

    const entries = await query(
      'SELECT * FROM journal_entries WHERE user_id = $1 ORDER BY date DESC LIMIT 14',
      [targetUserId]
    );
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

    const existing = await queryOne(
      'SELECT id FROM journal_entries WHERE user_id = $1 AND date = $2',
      [auth.userId, date]
    );

    if (existing) {
      await execute(
        'UPDATE journal_entries SET content = $1, updated_at = now() WHERE user_id = $2 AND date = $3',
        [content || '', auth.userId, date]
      );
    } else {
      await execute(
        'INSERT INTO journal_entries (user_id, date, content) VALUES ($1, $2, $3)',
        [auth.userId, date, content || '']
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleAuthError(error);
  }
}
