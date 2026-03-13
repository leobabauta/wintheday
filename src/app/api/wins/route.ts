import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getTodaysWins } from '@/lib/wins';
import { requireAuth, handleAuthError } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    const date = request.nextUrl.searchParams.get('date') || undefined;
    const wins = getTodaysWins(auth.userId, date);
    return NextResponse.json(wins);
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    const { id, completed } = await request.json();

    const db = getDb();
    // Verify the win entry belongs to the user
    const entry = db.prepare(
      'SELECT id FROM win_entries WHERE id = ? AND user_id = ?'
    ).get(id, auth.userId);

    if (!entry) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    db.prepare('UPDATE win_entries SET completed = ? WHERE id = ?').run(completed ? 1 : 0, id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleAuthError(error);
  }
}
