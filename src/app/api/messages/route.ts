import { NextRequest, NextResponse } from 'next/server';
import { query, execute, insertReturning } from '@/lib/db';
import { requireAuth, handleAuthError } from '@/lib/api-auth';
import { notifyNewMessage } from '@/lib/message-notifications';

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    const clientId = request.nextUrl.searchParams.get('clientId');

    let messages;

    if (auth.role === 'coach' && clientId) {
      messages = await query(
        `SELECT m.*, u.name as sender_name
         FROM messages m
         JOIN users u ON u.id = m.sender_id
         WHERE (m.sender_id = $1 AND m.recipient_id = $2)
            OR (m.sender_id = $2 AND m.recipient_id = $1)
         ORDER BY m.created_at DESC
         LIMIT 50`,
        [parseInt(clientId), auth.userId]
      );
    } else {
      messages = await query(
        `SELECT m.*, u.name as sender_name
         FROM messages m
         JOIN users u ON u.id = m.sender_id
         WHERE m.sender_id = $1 OR m.recipient_id = $1
         ORDER BY m.created_at DESC
         LIMIT 50`,
        [auth.userId]
      );
    }

    return NextResponse.json(messages);
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    const { recipientId, type, content, parentId } = await request.json();

    if (!recipientId || !type) {
      return NextResponse.json({ error: 'Recipient and type required' }, { status: 400 });
    }

    const result = await insertReturning<{ id: number }>(
      'INSERT INTO messages (sender_id, recipient_id, type, content, parent_id) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [auth.userId, recipientId, type, content || '', parentId || null]
    );

    // Coach replying anywhere (inbox, client detail chat) counts as attending
    // to that client's pending messages — drop them off the inbox.
    if (auth.role === 'coach') {
      await execute(
        'UPDATE messages SET archived = 1, read = 1 WHERE sender_id = $1 AND recipient_id = $2 AND archived = 0',
        [recipientId, auth.userId]
      );
    }

    // Fire-and-forget email notification; throttled inside the helper.
    notifyNewMessage(auth.userId, recipientId, content || '').catch(() => {});

    return NextResponse.json({ id: result.id, ok: true });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    const { ids } = await request.json();

    if (!ids || !Array.isArray(ids)) {
      return NextResponse.json({ error: 'Message IDs required' }, { status: 400 });
    }

    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
    await execute(
      `UPDATE messages SET read = 1, archived = 1 WHERE id IN (${placeholders}) AND recipient_id = $${ids.length + 1}`,
      [...ids, auth.userId]
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleAuthError(error);
  }
}
