import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
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
    requireCoachOwnsClient(auth.userId, clientId);

    const db = getDb();

    const user = db.prepare('SELECT id, name, email, created_at FROM users WHERE id = ?').get(clientId);
    const clientInfo = db.prepare('SELECT * FROM client_info WHERE user_id = ?').get(clientId);
    const commitments = db.prepare(
      'SELECT * FROM commitments WHERE user_id = ? ORDER BY active DESC, type, title'
    ).all(clientId);
    const winHistory = getClientWinHistory(clientId, 14);
    const journalEntries = db.prepare(
      'SELECT * FROM journal_entries WHERE user_id = ? ORDER BY date DESC LIMIT 14'
    ).all(clientId);
    const messages = db.prepare(
      `SELECT m.*, u.name as sender_name FROM messages m
       JOIN users u ON u.id = m.sender_id
       WHERE (m.sender_id = ? OR m.recipient_id = ?)
         AND (m.sender_id = ? OR m.recipient_id = ?)
       ORDER BY m.created_at DESC LIMIT 20`
    ).all(clientId, clientId, auth.userId, auth.userId);

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
    requireCoachOwnsClient(auth.userId, clientId);

    const body = await request.json();
    const db = getDb();

    const fields = ['sign_on_date', 'closing_date', 'coaching_day', 'coaching_time', 'coaching_frequency'];
    for (const field of fields) {
      if (body[field] !== undefined) {
        db.prepare(`UPDATE client_info SET ${field} = ? WHERE user_id = ?`).run(body[field], clientId);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleAuthError(error);
  }
}
