import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleAuthError } from '@/lib/api-auth';

const BUCKET = 'message-photos';
const MAX_BYTES = 4 * 1024 * 1024; // 4 MB — Vercel payload limit
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

export async function POST(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    const form = await request.formData();
    const file = form.get('file') as File | null;

    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });
    if (!ALLOWED.has(file.type)) return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: 'File too large (max 4 MB)' }, { status: 400 });

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Storage not configured' }, { status: 500 });
    }

    const ext = file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1];
    const path = `${auth.userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const upload = await fetch(`${supabaseUrl}/storage/v1/object/${BUCKET}/${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': file.type,
        'x-upsert': 'false',
      },
      body: await file.arrayBuffer(),
    });

    if (!upload.ok) {
      const msg = await upload.text();
      console.error('Storage upload failed:', msg);
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }

    const url = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${path}`;
    return NextResponse.json({ url });
  } catch (error) {
    return handleAuthError(error);
  }
}
