import { queryOne } from './db';
import { Resend } from 'resend';
import { sendPushToUser } from './push';

const APP_URL = process.env.APP_URL || 'https://www.wintheday.work';

// Fire-and-forget: callers don't await. Any failure is logged but never
// surfaced to the user so a flaky provider can't wedge the submit path.
export async function notifyPreCoachingSubmitted(opts: {
  meetingId: number;
  clientId: number;
  coachId: number;
  startsAt: string;
}) {
  try {
    const coach = await queryOne<{ email: string; name: string }>(
      'SELECT email, name FROM users WHERE id = $1',
      [opts.coachId]
    );
    const client = await queryOne<{ name: string }>(
      'SELECT name FROM users WHERE id = $1',
      [opts.clientId]
    );
    if (!coach || !client) return;

    const sessionDate = new Date(opts.startsAt).toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric',
    });
    const detailPath = `/dashboard/clients/${opts.clientId}/sessions/${opts.meetingId}`;
    const detailLink = `${APP_URL}${detailPath}`;

    const pushPromise = sendPushToUser(opts.coachId, {
      title: `${client.name} sent their pre-coaching form`,
      body: `For your ${sessionDate} session.`,
      url: detailPath,
    }).catch((err) => console.error('pre-coaching push failed:', err));

    let emailPromise: Promise<unknown> = Promise.resolve();
    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      emailPromise = resend.emails
        .send({
          from: process.env.REMINDER_FROM_EMAIL || 'Win the Day <onboarding@resend.dev>',
          to: coach.email,
          subject: `${client.name} sent their pre-coaching form`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
              <h2 style="color: #1A1714; font-size: 20px; margin-bottom: 8px;">Pre-coaching form received</h2>
              <p style="color: #5A4F45; font-size: 15px; line-height: 1.6;">
                <strong>${client.name}</strong> submitted their pre-coaching form for the session on ${sessionDate}.
              </p>
              <a href="${detailLink}"
                 style="display: inline-block; margin-top: 16px; padding: 12px 24px; background: #B5705A; color: white; text-decoration: none; border-radius: 999px; font-weight: 500; font-size: 14px;">
                Read responses
              </a>
            </div>
          `,
        })
        .catch((err) => console.error('pre-coaching email failed:', err));
    }

    await Promise.all([pushPromise, emailPromise]);
  } catch (err) {
    console.error('notifyPreCoachingSubmitted failed:', err);
  }
}
