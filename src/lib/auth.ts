import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { JWT_SECRET, COOKIE_NAME } from './config';
import { execute } from './db';

export function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, 10);
}

export function verifyPassword(plain: string, hash: string): boolean {
  return bcrypt.compareSync(plain, hash);
}

export function createSessionToken(userId: number, role: string): string {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '7d' });
}

export function verifySessionToken(token: string): { userId: number; role: string } | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: number; role: string };
    return payload;
  } catch {
    return null;
  }
}

// Module-scope throttle so the happy path of getSession() stays read-only.
// Serverless cold starts can lose this state — the worst case is a few extra
// writes per user across instances, still bounded and cheap.
const lastActiveTouched = new Map<number, number>();
const TOUCH_THROTTLE_MS = 5 * 60 * 1000;

export function touchLastActive(userId: number): void {
  const now = Date.now();
  const prev = lastActiveTouched.get(userId);
  if (prev && now - prev < TOUCH_THROTTLE_MS) return;
  lastActiveTouched.set(userId, now);
  execute('UPDATE users SET last_active_at = NOW() WHERE id = $1', [userId]).catch((err) => {
    console.error('Failed to bump last_active_at:', err);
  });
}

export async function getSession(): Promise<{ userId: number; role: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const session = verifySessionToken(token);
  if (session) touchLastActive(session.userId);
  return session;
}
