import { NextRequest, NextResponse } from 'next/server';
import { queryOne, execute } from '@/lib/db';
import { getTodaysWins } from '@/lib/wins';
import { requireAuth, handleAuthError } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    const date = request.nextUrl.searchParams.get('date') || undefined;
    const wins = await getTodaysWins(auth.userId, date);
    return NextResponse.json(wins);
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    const { id, completed } = await request.json();

    const entry = await queryOne(
      'SELECT id FROM win_entries WHERE id = $1 AND user_id = $2',
      [id, auth.userId]
    );

    if (!entry) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await execute('UPDATE win_entries SET completed = $1 WHERE id = $2', [completed ? 1 : 0, id]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleAuthError(error);
  }
}
