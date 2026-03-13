import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth, handleAuthError } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    const clientId = request.nextUrl.searchParams.get('clientId');

    const db = getDb();
    let messages;

    if (auth.role === 'coach' && clientId) {
      // Coach viewing messages for a specific client
      messages = db.prepare(
        `SELECT m.*, u.name as sender_name
         FROM messages m
         JOIN users u ON u.id = m.sender_id
         WHERE (m.sender_id = ? AND m.recipient_id = ?)
            OR (m.sender_id = ? AND m.recipient_id = ?)
         ORDER BY m.created_at DESC
         LIMIT 50`
      ).all(parseInt(clientId), auth.userId, auth.userId, parseInt(clientId));
    } else {
      // Client viewing their own messages, or coach viewing all
      messages = db.prepare(
        `SELECT m.*, u.name as sender_name
         FROM messages m
         JOIN users u ON u.id = m.sender_id
         WHERE m.sender_id = ? OR m.recipient_id = ?
         ORDER BY m.created_at DESC
         LIMIT 50`
      ).all(auth.userId, auth.userId);
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

    const db = getDb();
    const result = db.prepare(
      'INSERT INTO messages (sender_id, recipient_id, type, content, parent_id) VALUES (?, ?, ?, ?, ?)'
    ).run(auth.userId, recipientId, type, content || '', parentId || null);

    return NextResponse.json({ id: result.lastInsertRowid, ok: true });
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

    const db = getDb();
    const placeholders = ids.map(() => '?').join(',');
    db.prepare(
      `UPDATE messages SET read = 1 WHERE id IN (${placeholders}) AND recipient_id = ?`
    ).run(...ids, auth.userId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleAuthError(error);
  }
}
