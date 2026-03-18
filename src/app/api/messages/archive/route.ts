import { NextRequest, NextResponse } from 'next/server';
import { execute } from '@/lib/db';
import { requireAuth, handleAuthError } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
  try {
    const auth = requireAuth(request, 'coach');
    const { ids } = await request.json();

    if (!ids || !Array.isArray(ids)) {
      return NextResponse.json({ error: 'Message IDs required' }, { status: 400 });
    }

    const placeholders = ids.map((_: number, i: number) => `$${i + 1}`).join(',');
    await execute(
      `UPDATE messages SET archived = 1, read = 1 WHERE id IN (${placeholders}) AND recipient_id = $${ids.length + 1}`,
      [...ids, auth.userId]
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleAuthError(error);
  }
}
