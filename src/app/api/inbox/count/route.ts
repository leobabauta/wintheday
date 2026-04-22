import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { requireAuth, handleAuthError } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request, 'coach');
    // Inbox = unarchived messages + submitted pre-coaching forms the coach
    // hasn't opened yet. Kept as a single count so the nav badge stays one
    // number.
    const result = await queryOne<{ count: string }>(
      `SELECT
         (SELECT COUNT(*) FROM messages WHERE recipient_id = $1 AND archived = 0)
         +
         (SELECT COUNT(*) FROM pre_coaching_logs
          WHERE coach_id = $1 AND submitted_at IS NOT NULL AND opened_at IS NULL)
         AS count`,
      [auth.userId]
    );
    return NextResponse.json({ count: parseInt(result?.count || '0') });
  } catch (error) {
    return handleAuthError(error);
  }
}
