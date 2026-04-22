import { execute, queryOne } from './db';
import { Resend } from 'resend';

const APP_URL = process.env.APP_URL || 'https://www.wintheday.work';

// Fire-and-forget: callers don't await this. Any failure is logged but
// never surfaced to the user, so a flaky email provider can't wedge the
// message-send path.
export async function notifyNewMessage(senderId: number, recipientId: number, content: string) {
  if (!process.env.RESEND_API_KEY) return;

  try {
    const recipient = await queryOne<{
      email: string;
      name: string;
      role: string;
      last_active_at: string | null;
      last_message_email_sent_at: string | null;
    }>(
      `SELECT email, name, role, last_active_at, last_message_email_sent_at
       FROM users WHERE id = $1`,
      [recipientId]
    );
    if (!recipient) return;

    const now = Date.now();
    const activeMs = recipient.last_active_at ? now - new Date(recipient.last_active_at).getTime() : Infinity;
    const emailedMs = recipient.last_message_email_sent_at ? now - new Date(recipient.last_message_email_sent_at).getTime() : Infinity;

    // Skip: recipient is actively using the app, they'll see the message there.
    if (activeMs < 10 * 60 * 1000) return;
    // Skip: we already emailed them recently, don't stack notifications.
    if (emailedMs < 15 * 60 * 1000) return;

    const sender = await queryOne<{ name: string }>('SELECT name FROM users WHERE id = $1', [senderId]);
    if (!sender) return;

    const resend = new Resend(process.env.RESEND_API_KEY);
    const firstName = recipient.name.split(' ')[0];
    const fromFirstName = sender.name.split(' ')[0];
    const snippet = content.length > 160 ? content.slice(0, 160) + '…' : content;
    const link = recipient.role === 'coach' ? `${APP_URL}/dashboard/inbox` : `${APP_URL}/messages`;

    await resend.emails.send({
      from: process.env.REMINDER_FROM_EMAIL || 'Win the Day <onboarding@resend.dev>',
      to: recipient.email,
      subject: `New message from ${fromFirstName}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
          <h2 style="color: #1A1714; font-size: 20px; margin-bottom: 8px;">Hey ${firstName},</h2>
          <p style="color: #5A4F45; font-size: 15px; line-height: 1.6; margin-bottom: 16px;">
            ${fromFirstName} sent you a message on Win the Day:
          </p>
          <blockquote style="margin: 0 0 20px; padding: 14px 18px; background: #F5F1EB; border-left: 3px solid #B5705A; color: #1A1714; font-size: 15px; line-height: 1.55;">
            ${snippet.replace(/</g, '&lt;').replace(/\n/g, '<br>')}
          </blockquote>
          <a href="${link}"
             style="display: inline-block; padding: 12px 24px; background: #B5705A; color: white; text-decoration: none; border-radius: 999px; font-weight: 500; font-size: 14px;">
            Open ${recipient.role === 'coach' ? 'inbox' : 'messages'}
          </a>
        </div>
      `,
    });

    await execute(
      'UPDATE users SET last_message_email_sent_at = NOW() WHERE id = $1',
      [recipientId]
    );
  } catch (err) {
    console.error('notifyNewMessage failed:', err);
  }
}
