import { verifySessionToken } from './auth';
import { COOKIE_NAME } from './config';
import { queryOne } from './db';
import { NextRequest, NextResponse } from 'next/server';

interface AuthResult {
  userId: number;
  role: string;
}

export function getAuthFromRequest(request: NextRequest): AuthResult | null {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export function requireAuth(request: NextRequest, requiredRole?: string): AuthResult {
  const auth = getAuthFromRequest(request);
  if (!auth) throw new AuthError('Unauthorized', 401);
  if (requiredRole && auth.role !== requiredRole) throw new AuthError('Forbidden', 403);
  return auth;
}

export async function requireCoachOwnsClient(coachId: number, clientUserId: number): Promise<void> {
  const row = await queryOne(
    'SELECT id FROM client_info WHERE user_id = $1 AND coach_id = $2',
    [clientUserId, coachId]
  );
  if (!row) throw new AuthError('Forbidden', 403);
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function handleAuthError(error: unknown): NextResponse {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error(error);
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}
