import { NextRequest, NextResponse } from 'next/server';
import { execute } from '@/lib/db';
import { requireAuth, handleAuthError } from '@/lib/api-auth';

interface Body {
  kind?: string;
  messageId?: number;
  journalId?: number;
  preCoachingLogId?: number;
  completionUserId?: number;
  completionDate?: string;
}

// Puts one attended-to item back in the inbox. Each source marks "done"
// differently (messages archive, everything else stamps an opened_at), so
// restoring means clearing whichever column that kind uses. Every statement
// is scoped to the calling coach's own clients.
export async function POST(request: NextRequest) {
  try {
    const auth = requireAuth(request, 'coach');
    const body: Body = await request.json();

    switch (body.kind) {
      case 'message': {
        if (!body.messageId) break;
        await execute(
          'UPDATE messages SET archived = 0 WHERE id = $1 AND recipient_id = $2',
          [body.messageId, auth.userId]
        );
        return NextResponse.json({ ok: true });
      }
      case 'reflection': {
        if (!body.journalId) break;
        await execute(
          `UPDATE journal_entries SET coach_opened_at = NULL
           WHERE id = $1
             AND user_id IN (SELECT user_id FROM client_info WHERE coach_id = $2)`,
          [body.journalId, auth.userId]
        );
        return NextResponse.json({ ok: true });
      }
      case 'completion': {
        if (!body.completionUserId || !body.completionDate) break;
        await execute(
          `UPDATE daily_completions SET coach_opened_at = NULL
           WHERE user_id = $1 AND date = $2
             AND user_id IN (SELECT user_id FROM client_info WHERE coach_id = $3)`,
          [body.completionUserId, body.completionDate, auth.userId]
        );
        return NextResponse.json({ ok: true });
      }
      case 'pre_coaching': {
        if (!body.preCoachingLogId) break;
        await execute(
          'UPDATE pre_coaching_logs SET opened_at = NULL WHERE id = $1 AND coach_id = $2',
          [body.preCoachingLogId, auth.userId]
        );
        return NextResponse.json({ ok: true });
      }
    }

    return NextResponse.json({ error: 'Unrecognized item' }, { status: 400 });
  } catch (error) {
    return handleAuthError(error);
  }
}
