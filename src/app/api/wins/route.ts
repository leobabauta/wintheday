import { NextRequest, NextResponse } from 'next/server';
import { queryOne, execute } from '@/lib/db';
import { getTodaysWins } from '@/lib/wins';
import { requireAuth, handleAuthError } from '@/lib/api-auth';
import { notifyAllCommitmentsDone } from '@/lib/coach-activity-notifications';

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    const date = request.nextUrl.searchParams.get('date') || undefined;
    const wins = await getTodaysWins(auth.userId, date);
    return NextResponse.json(wins);
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    const { id, completed } = await request.json();

    const entry = await queryOne<{ id: number; date: string }>(
      'SELECT id, date FROM win_entries WHERE id = $1 AND user_id = $2',
      [id, auth.userId]
    );

    if (!entry) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await execute('UPDATE win_entries SET completed = $1 WHERE id = $2', [completed ? 1 : 0, id]);

    if (completed && auth.role === 'client') {
      const counts = await queryOne<{ total: string; done: string }>(
        `SELECT COUNT(*) AS total,
                SUM(CASE WHEN w.completed = 1 THEN 1 ELSE 0 END) AS done
         FROM win_entries w
         JOIN commitments c ON c.id = w.commitment_id
         WHERE w.user_id = $1 AND w.date = $2 AND c.active = 1`,
        [auth.userId, entry.date]
      );
      const total = parseInt(counts?.total || '0');
      const done = parseInt(counts?.done || '0');
      if (total > 0 && done === total) {
        const inserted = await execute(
          `INSERT INTO daily_completions (user_id, date) VALUES ($1, $2)
           ON CONFLICT (user_id, date) DO NOTHING`,
          [auth.userId, entry.date]
        );
        if (inserted.rowCount > 0) {
          void notifyAllCommitmentsDone({ clientId: auth.userId, date: entry.date, total });
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleAuthError(error);
  }
}
