import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, execute } from '@/lib/db';
import { requireAuth, requireCoachOwnsClient, handleAuthError } from '@/lib/api-auth';
import { getClientWinHistory } from '@/lib/client-stats';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = requireAuth(request, 'coach');
    const { id } = await params;
    const clientId = parseInt(id);
    await requireCoachOwnsClient(auth.userId, clientId);

    const user = await queryOne('SELECT id, name, email, created_at FROM users WHERE id = $1', [clientId]);
    const clientInfo = await queryOne('SELECT * FROM client_info WHERE user_id = $1', [clientId]);
    const commitments = await query(
      'SELECT * FROM commitments WHERE user_id = $1 ORDER BY active DESC, type, title',
      [clientId]
    );
    const winHistory = await getClientWinHistory(clientId, 14);
    const journalEntries = await query(
      'SELECT * FROM journal_entries WHERE user_id = $1 ORDER BY date DESC LIMIT 14',
      [clientId]
    );
    const messages = await query(
      `SELECT m.*, u.name as sender_name FROM messages m
       JOIN users u ON u.id = m.sender_id
       WHERE (m.sender_id = $1 OR m.recipient_id = $1)
         AND (m.sender_id = $2 OR m.recipient_id = $2)
       ORDER BY m.created_at DESC LIMIT 20`,
      [clientId, auth.userId]
    );

    return NextResponse.json({
      user,
      clientInfo,
      commitments,
      winHistory,
      journalEntries,
      messages,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = requireAuth(request, 'coach');
    const { id } = await params;
    const clientId = parseInt(id);
    await requireCoachOwnsClient(auth.userId, clientId);

    const body = await request.json();

    // Update user name if provided
    if (body.name !== undefined) {
      await execute('UPDATE users SET name = $1 WHERE id = $2', [body.name, clientId]);
    }

    const fields = ['sign_on_date', 'closing_date', 'coaching_day', 'coaching_time', 'coaching_frequency', 'payment_amount', 'payment_frequency', 'renewal_day'];
    for (const field of fields) {
      if (body[field] !== undefined) {
        await execute(`UPDATE client_info SET ${field} = $1 WHERE user_id = $2`, [body[field], clientId]);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = requireAuth(request, 'coach');
    const { id } = await params;
    const clientId = parseInt(id);
    await requireCoachOwnsClient(auth.userId, clientId);

    // Delete in order respecting foreign keys
    await execute('DELETE FROM win_entries WHERE user_id = $1', [clientId]);
    await execute('DELETE FROM commitments WHERE user_id = $1', [clientId]);
    await execute('DELETE FROM journal_entries WHERE user_id = $1', [clientId]);
    await execute('DELETE FROM messages WHERE sender_id = $1 OR recipient_id = $1', [clientId]);
    await execute('DELETE FROM user_settings WHERE user_id = $1', [clientId]);
    await execute('DELETE FROM client_info WHERE user_id = $1', [clientId]);
    await execute('DELETE FROM users WHERE id = $1', [clientId]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleAuthError(error);
  }
}
