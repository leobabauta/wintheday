import { NextRequest, NextResponse } from 'next/server';
import { execute, queryOne } from '@/lib/db';
import { requireAuth, handleAuthError } from '@/lib/api-auth';
import { notifyCompletionHearted } from '@/lib/coach-activity-notifications';

// Client-side Today page calls this with ?date=YYYY-MM-DD to learn whether
// today's all-done state was hearted, and to show a 24h banner for a prior
// date the coach hearted recently. Returns whatever exists; nulls are fine.
export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    const date = request.nextUrl.searchParams.get('date');
    if (!date) {
      return NextResponse.json({ error: 'date required' }, { status: 400 });
    }

    const today = await queryOne<{ date: string; coach_heart_at: string | null }>(
      `SELECT date, coach_heart_at FROM daily_completions
       WHERE user_id = $1 AND date = $2`,
      [auth.userId, date]
    );

    const banner = await queryOne<{ date: string; coach_heart_at: string }>(
      `SELECT date, coach_heart_at FROM daily_completions
       WHERE user_id = $1
         AND date <> $2
         AND coach_heart_at IS NOT NULL
         AND coach_heart_at > NOW() - INTERVAL '24 hours'
       ORDER BY coach_heart_at DESC
       LIMIT 1`,
      [auth.userId, date]
    );

    return NextResponse.json({
      todayHearted: !!today?.coach_heart_at,
      banner: banner ? { date: banner.date, heartedAt: banner.coach_heart_at } : null,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

// Coach-only: mark daily-completion rows as seen so they drop from the
// inbox. Body shape: { rows: [{ userId, date }, ...], heart?: true }
// With heart=true also stamps coach_heart_at and pushes a love-note to
// the client (one-way, no un-heart).
export async function PATCH(request: NextRequest) {
  try {
    const auth = requireAuth(request, 'coach');
    const { rows, heart } = await request.json();

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'rows required' }, { status: 400 });
    }

    for (const row of rows) {
      const userId = Number(row?.userId);
      const date = typeof row?.date === 'string' ? row.date : null;
      if (!userId || !date) continue;

      let firstHeart = false;
      if (heart) {
        // Only notify on the transition — don't spam if the coach
        // double-taps the heart.
        const existing = await queryOne<{ coach_heart_at: string | null }>(
          `SELECT coach_heart_at FROM daily_completions
           WHERE user_id = $1 AND date = $2`,
          [userId, date]
        );
        firstHeart = !!existing && !existing.coach_heart_at;
      }

      const setClause = heart
        ? `coach_opened_at = NOW(), coach_heart_at = COALESCE(coach_heart_at, NOW())`
        : `coach_opened_at = NOW()`;
      await execute(
        `UPDATE daily_completions SET ${setClause}
         WHERE user_id = $1 AND date = $2
           AND user_id IN (SELECT user_id FROM client_info WHERE coach_id = $3)`,
        [userId, date, auth.userId]
      );

      if (firstHeart) {
        void notifyCompletionHearted({ clientId: userId, date });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleAuthError(error);
  }
}
