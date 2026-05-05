import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, execute } from '@/lib/db';
import { requireAuth, requireCoachOwnsClient, handleAuthError } from '@/lib/api-auth';
import { notifyJournalSubmitted } from '@/lib/coach-activity-notifications';

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
    const { date, content, rating } = await request.json();

    if (!date) {
      return NextResponse.json({ error: 'Date required' }, { status: 400 });
    }

    const existing = await queryOne<{ id: number; content: string }>(
      'SELECT id, content FROM journal_entries WHERE user_id = $1 AND date = $2',
      [auth.userId, date]
    );

    const newContent = content || '';
    const wasEmpty = !existing || !existing.content;
    const becameNonEmpty = wasEmpty && newContent.trim().length > 0;

    if (existing) {
      if (rating !== undefined) {
        await execute(
          'UPDATE journal_entries SET content = $1, rating = $2, updated_at = now() WHERE user_id = $3 AND date = $4',
          [newContent, rating, auth.userId, date]
        );
      } else {
        await execute(
          'UPDATE journal_entries SET content = $1, updated_at = now() WHERE user_id = $2 AND date = $3',
          [newContent, auth.userId, date]
        );
      }
    } else {
      await execute(
        'INSERT INTO journal_entries (user_id, date, content, rating) VALUES ($1, $2, $3, $4)',
        [auth.userId, date, newContent, rating ?? null]
      );
    }

    if (auth.role === 'client' && becameNonEmpty) {
      void notifyJournalSubmitted({ clientId: auth.userId, date });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleAuthError(error);
  }
}

// Coach-only: mark journal entries as seen so they drop from the inbox.
export async function PATCH(request: NextRequest) {
  try {
    const auth = requireAuth(request, 'coach');
    const { ids } = await request.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids required' }, { status: 400 });
    }

    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
    await execute(
      `UPDATE journal_entries SET coach_opened_at = NOW()
       WHERE id IN (${placeholders})
         AND user_id IN (SELECT user_id FROM client_info WHERE coach_id = $${ids.length + 1})`,
      [...ids, auth.userId]
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleAuthError(error);
  }
}
