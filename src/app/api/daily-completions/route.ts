import { NextRequest, NextResponse } from 'next/server';
import { execute } from '@/lib/db';
import { requireAuth, handleAuthError } from '@/lib/api-auth';

// Coach-only: mark daily-completion rows as seen so they drop from the
// inbox. Body shape: { rows: [{ userId, date }, ...] }
export async function PATCH(request: NextRequest) {
  try {
    const auth = requireAuth(request, 'coach');
    const { rows } = await request.json();

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'rows required' }, { status: 400 });
    }

    for (const row of rows) {
      const userId = Number(row?.userId);
      const date = typeof row?.date === 'string' ? row.date : null;
      if (!userId || !date) continue;
      await execute(
        `UPDATE daily_completions SET coach_opened_at = NOW()
         WHERE user_id = $1 AND date = $2
           AND user_id IN (SELECT user_id FROM client_info WHERE coach_id = $3)`,
        [userId, date, auth.userId]
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleAuthError(error);
  }
}
