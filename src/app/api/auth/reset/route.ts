import { NextRequest, NextResponse } from 'next/server';
import { queryOne, execute } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '@/lib/config';
import { Resend } from 'resend';

// POST: request a password reset email
export async function POST(request: NextRequest) {
  const { email } = await request.json();

  if (!email) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 });
  }

  const user = await queryOne<{ id: number; name: string }>(
    'SELECT id, name FROM users WHERE email = $1',
    [email.toLowerCase().trim()]
  );

  // Always return success to avoid leaking which emails exist
  if (!user) {
    return NextResponse.json({ ok: true });
  }

  // Create a short-lived reset token (15 min)
  const token = jwt.sign({ userId: user.id, purpose: 'reset' }, JWT_SECRET, { expiresIn: '15m' });

  const resetUrl = `https://www.wintheday.work/reset-password?token=${token}`;

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: process.env.REMINDER_FROM_EMAIL || 'Win the Day <onboarding@resend.dev>',
      to: email,
      subject: 'Reset your Win the Day password',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
          <h2 style="color: #1B1F3B; font-size: 20px; margin-bottom: 8px;">Hey ${user.name.split(' ')[0]}!</h2>
          <p style="color: #4A5068; font-size: 15px; line-height: 1.6;">
            We received a request to reset your password. Click the button below to set a new one.
          </p>
          <a href="${resetUrl}"
             style="display: inline-block; margin-top: 16px; padding: 12px 24px; background: #1B1F3B; color: white; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 14px;">
            Reset Password
          </a>
          <p style="color: #9CA3AF; font-size: 12px; margin-top: 24px;">This link expires in 15 minutes. If you didn't request this, you can ignore this email.</p>
        </div>
      `,
    });
  } catch (err) {
    console.error('Failed to send reset email:', err);
  }

  return NextResponse.json({ ok: true });
}

// PUT: set a new password using a reset token
export async function PUT(request: NextRequest) {
  const { token, newPassword } = await request.json();

  if (!token || !newPassword || newPassword.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: number; purpose: string };
    if (payload.purpose !== 'reset') {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
    }

    await execute('UPDATE users SET password_hash = $1 WHERE id = $2', [hashPassword(newPassword), payload.userId]);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Link expired or invalid. Please request a new one.' }, { status: 400 });
  }
}
