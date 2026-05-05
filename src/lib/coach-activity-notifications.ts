import { queryOne } from './db';
import { Resend } from 'resend';
import { sendPushToUser } from './push';

const APP_URL = process.env.APP_URL || 'https://www.wintheday.work';

async function lookupCoachAndClient(clientId: number) {
  const coach = await queryOne<{ id: number; email: string; name: string }>(
    `SELECT u.id, u.email, u.name
     FROM client_info ci
     JOIN users u ON u.id = ci.coach_id
     WHERE ci.user_id = $1`,
    [clientId]
  );
  const client = await queryOne<{ name: string }>(
    'SELECT name FROM users WHERE id = $1',
    [clientId]
  );
  if (!coach || !client) return null;
  return { coach, client };
}

// Fire-and-forget: callers don't await. Any failure is logged but never
// surfaced so a flaky provider can't wedge the client-facing write path.
export async function notifyJournalSubmitted(opts: {
  clientId: number;
  date: string;
}) {
  try {
    const ctx = await lookupCoachAndClient(opts.clientId);
    if (!ctx) return;
    const { coach, client } = ctx;

    const path = `/dashboard/clients/${opts.clientId}/journal`;
    const link = `${APP_URL}${path}`;

    const pushPromise = sendPushToUser(coach.id, {
      title: `${client.name} wrote a reflection`,
      body: `New journal entry for ${opts.date}.`,
      url: path,
    }).catch((err) => console.error('journal push failed:', err));

    let emailPromise: Promise<unknown> = Promise.resolve();
    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      emailPromise = resend.emails
        .send({
          from: process.env.REMINDER_FROM_EMAIL || 'Win the Day <onboarding@resend.dev>',
          to: coach.email,
          subject: `${client.name} wrote a reflection`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
              <h2 style="color: #1A1714; font-size: 20px; margin-bottom: 8px;">New reflection</h2>
              <p style="color: #5A4F45; font-size: 15px; line-height: 1.6;">
                <strong>${client.name}</strong> wrote a journal entry for ${opts.date}.
              </p>
              <a href="${link}"
                 style="display: inline-block; margin-top: 16px; padding: 12px 24px; background: #B5705A; color: white; text-decoration: none; border-radius: 999px; font-weight: 500; font-size: 14px;">
                Read entry
              </a>
            </div>
          `,
        })
        .catch((err) => console.error('journal email failed:', err));
    }

    await Promise.all([pushPromise, emailPromise]);
  } catch (err) {
    console.error('notifyJournalSubmitted failed:', err);
  }
}

export async function notifyAllCommitmentsDone(opts: {
  clientId: number;
  date: string;
  total: number;
}) {
  try {
    const ctx = await lookupCoachAndClient(opts.clientId);
    if (!ctx) return;
    const { coach, client } = ctx;

    const path = `/dashboard/clients/${opts.clientId}`;
    const link = `${APP_URL}${path}`;
    const itemWord = opts.total === 1 ? 'commitment' : 'commitments';

    const pushPromise = sendPushToUser(coach.id, {
      title: `${client.name} won the day`,
      body: `Completed all ${opts.total} ${itemWord} today.`,
      url: path,
    }).catch((err) => console.error('completion push failed:', err));

    let emailPromise: Promise<unknown> = Promise.resolve();
    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      emailPromise = resend.emails
        .send({
          from: process.env.REMINDER_FROM_EMAIL || 'Win the Day <onboarding@resend.dev>',
          to: coach.email,
          subject: `${client.name} won the day`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
              <h2 style="color: #1A1714; font-size: 20px; margin-bottom: 8px;">All done today</h2>
              <p style="color: #5A4F45; font-size: 15px; line-height: 1.6;">
                <strong>${client.name}</strong> completed all ${opts.total} ${itemWord} for ${opts.date}.
              </p>
              <a href="${link}"
                 style="display: inline-block; margin-top: 16px; padding: 12px 24px; background: #B5705A; color: white; text-decoration: none; border-radius: 999px; font-weight: 500; font-size: 14px;">
                Open client
              </a>
            </div>
          `,
        })
        .catch((err) => console.error('completion email failed:', err));
    }

    await Promise.all([pushPromise, emailPromise]);
  } catch (err) {
    console.error('notifyAllCommitmentsDone failed:', err);
  }
}
