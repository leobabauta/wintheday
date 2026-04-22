import { NextRequest, NextResponse } from 'next/server';
import { execute, insertReturning, queryOne } from '@/lib/db';
import { requireAuth, handleAuthError } from '@/lib/api-auth';
import { notifyNewMessage } from '@/lib/message-notifications';

// Coach clicks "Acknowledge & thank" on the session detail page.
// Sends a thank-you message to the client and stamps acknowledged_at so
// the button hides on return visits.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = requireAuth(request, 'coach');
    const { id } = await params;
    const logId = parseInt(id);

    const row = await queryOne<{
      id: number;
      meeting_id: number;
      client_id: number;
      coach_id: number;
      starts_at: string;
      acknowledged_at: string | null;
    }>(
      `SELECT pcl.id, pcl.meeting_id, pcl.client_id, pcl.coach_id, pcl.acknowledged_at,
              m.starts_at
       FROM pre_coaching_logs pcl
       JOIN meetings m ON m.id = pcl.meeting_id
       WHERE pcl.id = $1 AND pcl.coach_id = $2`,
      [logId, auth.userId]
    );
    if (!row) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (row.acknowledged_at) {
      return NextResponse.json({ ok: true, alreadyAcknowledged: true });
    }

    const client = await queryOne<{ name: string }>('SELECT name FROM users WHERE id = $1', [row.client_id]);
    const sessionDate = new Date(row.starts_at).toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric',
    });
    const firstName = client?.name?.split(' ')[0] || 'there';
    const content = `Thanks for sending your pre-coaching form ahead of our ${sessionDate} session, ${firstName}. I've read it and I'll see you then.`;

    const inserted = await insertReturning<{ id: number }>(
      `INSERT INTO messages (sender_id, recipient_id, type, content)
       VALUES ($1, $2, 'reply', $3) RETURNING id`,
      [auth.userId, row.client_id, content]
    );

    await execute(
      'UPDATE pre_coaching_logs SET acknowledged_at = NOW() WHERE id = $1',
      [logId]
    );

    notifyNewMessage(auth.userId, row.client_id, content).catch(() => {});

    return NextResponse.json({ ok: true, messageId: inserted.id });
  } catch (error) {
    return handleAuthError(error);
  }
}
