import { NextRequest, NextResponse } from 'next/server';
import { queryOne, execute } from '@/lib/db';
import { requireAuth, handleAuthError } from '@/lib/api-auth';

const BUCKET = 'message-photos';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = requireAuth(request);
    const { id } = await params;

    const msg = await queryOne<{ id: number; sender_id: number; attachment_url: string | null }>(
      'SELECT id, sender_id, attachment_url FROM messages WHERE id = $1',
      [id]
    );

    if (!msg) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (msg.sender_id !== auth.userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    await execute('DELETE FROM messages WHERE id = $1 AND sender_id = $2', [id, auth.userId]);

    // Best-effort storage cleanup — don't fail the request if this errors
    if (msg.attachment_url) {
      const supabaseUrl = process.env.SUPABASE_URL;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (supabaseUrl && serviceKey) {
        const marker = `/storage/v1/object/public/${BUCKET}/`;
        const idx = msg.attachment_url.indexOf(marker);
        if (idx !== -1) {
          const storagePath = msg.attachment_url.slice(idx + marker.length);
          fetch(`${supabaseUrl}/storage/v1/object/${BUCKET}/${storagePath}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${serviceKey}` },
          }).catch(() => {});
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleAuthError(error);
  }
}
