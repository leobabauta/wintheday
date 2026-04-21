import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { requireAuth, handleAuthError } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request, 'coach');
    const result = await queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM messages WHERE recipient_id = $1 AND read = 0 AND archived = 0',
      [auth.userId]
    );
    return NextResponse.json({ count: parseInt(result?.count || '0') });
  } catch (error) {
    return handleAuthError(error);
  }
}
