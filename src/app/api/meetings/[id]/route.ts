import { NextRequest, NextResponse } from 'next/server';
import { execute, queryOne } from '@/lib/db';
import { requireAuth, handleAuthError } from '@/lib/api-auth';

// Coach saves per-session notes. Only the meeting's coach can write.
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = requireAuth(request, 'coach');
    const { id } = await params;
    const meetingId = parseInt(id);
    const body = await request.json();

    const meeting = await queryOne<{ id: number }>(
      'SELECT id FROM meetings WHERE id = $1 AND coach_id = $2',
      [meetingId, auth.userId]
    );
    if (!meeting) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (body.coach_notes !== undefined) {
      const notes: string | null = body.coach_notes || null;
      await execute(
        'UPDATE meetings SET coach_notes = $1, updated_at = NOW() WHERE id = $2',
        [notes, meetingId]
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleAuthError(error);
  }
}
