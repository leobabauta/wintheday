import { NextRequest, NextResponse } from 'next/server';
import { queryOne, execute } from '@/lib/db';
import { requireAuth, handleAuthError } from '@/lib/api-auth';
import { isReactionEmoji } from '@/lib/reactions';

// Toggle a reaction: first POST adds it, a second POST with the same emoji
// removes it. Reactions are silent by design — no push, no email, no inbox
// row; the thread poll picks them up on both sides.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = requireAuth(request);
    const { id } = await params;
    const messageId = parseInt(id, 10);
    if (!Number.isFinite(messageId)) {
      return NextResponse.json({ error: 'Bad message id' }, { status: 400 });
    }

    const { emoji } = await request.json();
    if (!isReactionEmoji(emoji)) {
      return NextResponse.json({ error: 'Unsupported emoji' }, { status: 400 });
    }

    // Either side of the conversation may react, to any message in it —
    // including their own.
    const msg = await queryOne<{ id: number }>(
      'SELECT id FROM messages WHERE id = $1 AND (sender_id = $2 OR recipient_id = $2)',
      [messageId, auth.userId]
    );
    if (!msg) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const added = await execute(
      `INSERT INTO message_reactions (message_id, user_id, emoji)
       VALUES ($1, $2, $3)
       ON CONFLICT (message_id, user_id, emoji) DO NOTHING`,
      [messageId, auth.userId, emoji]
    );

    if (added.rowCount === 0) {
      await execute(
        'DELETE FROM message_reactions WHERE message_id = $1 AND user_id = $2 AND emoji = $3',
        [messageId, auth.userId, emoji]
      );
      return NextResponse.json({ ok: true, reacted: false });
    }

    return NextResponse.json({ ok: true, reacted: true });
  } catch (error) {
    return handleAuthError(error);
  }
}
