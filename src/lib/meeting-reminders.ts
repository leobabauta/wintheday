import { query, execute } from './db';
import { Resend } from 'resend';

type ReminderRow = {
  id: number;
  starts_at: string;
  client_id: number;
  client_email: string;
  client_name: string;
  coach_name: string;
  timezone: string | null;
  cal_com_reschedule_url: string | null;
  day_before_reminder_sent_at: string | null;
};

export type ReminderResult = {
  meeting_id: number;
  kind: 'day_before';
  client_email: string;
  sent: boolean;
  skipped_reason?: string;
};

const APP_URL = process.env.APP_URL || 'https://www.wintheday.work';

function formatDate(iso: string, tz: string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date(iso));
}

function formatTime(iso: string, tz: string) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  }).format(new Date(iso));
}

export async function sendMeetingReminders(opts: { dryRun?: boolean } = {}): Promise<ReminderResult[]> {
  const dryRun = !!opts.dryRun;

  const meetings = await query<ReminderRow>(
    `SELECT m.id, m.starts_at, m.client_id,
            client.email AS client_email, client.name AS client_name,
            coach.name AS coach_name,
            COALESCE(us.timezone, 'Pacific/Honolulu') AS timezone,
            ci.cal_com_reschedule_url,
            m.day_before_reminder_sent_at
     FROM meetings m
     JOIN users client ON client.id = m.client_id
     JOIN users coach ON coach.id = m.coach_id
     LEFT JOIN user_settings us ON us.user_id = m.client_id
     LEFT JOIN coach_integrations ci ON ci.user_id = m.coach_id
     WHERE m.status = 'scheduled'
       AND m.starts_at > now()
       AND m.starts_at < now() + interval '2 days'
       AND m.day_before_reminder_sent_at IS NULL`
  );

  const now = new Date();
  const tomorrowMs = now.getTime() + 24 * 60 * 60 * 1000;
  const results: ReminderResult[] = [];

  const resendKey = process.env.RESEND_API_KEY;
  const resend = resendKey ? new Resend(resendKey) : null;

  for (const m of meetings) {
    const tz = m.timezone || 'Pacific/Honolulu';
    let meetingDate: string;
    let tomorrowStr: string;
    try {
      meetingDate = formatDate(m.starts_at, tz);
      tomorrowStr = formatDate(new Date(tomorrowMs).toISOString(), tz);
    } catch {
      continue;
    }

    if (meetingDate !== tomorrowStr) continue;

    if (dryRun) {
      results.push({ meeting_id: m.id, kind: 'day_before', client_email: m.client_email, sent: false, skipped_reason: 'dryRun' });
      continue;
    }

    if (!resend) {
      results.push({ meeting_id: m.id, kind: 'day_before', client_email: m.client_email, sent: false, skipped_reason: 'no_resend_key' });
      continue;
    }

    const time = formatTime(m.starts_at, tz);
    const firstName = m.client_name.split(' ')[0];
    const coachFirst = m.coach_name.split(' ')[0];
    const preCoachingLink = `${APP_URL}/pre-coaching/${m.id}`;
    const rescheduleBlock = m.cal_com_reschedule_url
      ? `<p style="color: #6B7280; font-size: 13px; margin-top: 20px;">Need to reschedule? <a href="${m.cal_com_reschedule_url}" style="color: #1B1F3B;">Pick a new time</a>.</p>`
      : '';

    try {
      await resend.emails.send({
        from: process.env.REMINDER_FROM_EMAIL || 'Win the Day <onboarding@resend.dev>',
        to: m.client_email,
        subject: `Coaching tomorrow at ${time} — fill out your pre-coaching form`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
            <h2 style="color: #1B1F3B; font-size: 20px; margin-bottom: 8px;">Session tomorrow</h2>
            <p style="color: #4A5068; font-size: 15px; line-height: 1.6;">
              Hey ${firstName} — your session with ${coachFirst} is <strong>tomorrow at ${time}</strong>.
            </p>
            <p style="color: #4A5068; font-size: 15px; line-height: 1.6;">
              Prepare by filling out and sending your pre-coaching form:
            </p>
            <a href="${preCoachingLink}"
               style="display: inline-block; margin-top: 8px; padding: 12px 24px; background: #1B1F3B; color: white; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 14px;">
              Open pre-coaching form
            </a>
            ${rescheduleBlock}
          </div>
        `,
      });

      await execute(
        `UPDATE meetings SET day_before_reminder_sent_at = now(), updated_at = now() WHERE id = $1`,
        [m.id]
      );

      results.push({ meeting_id: m.id, kind: 'day_before', client_email: m.client_email, sent: true });
    } catch (err) {
      console.error(`Failed to send day_before reminder for meeting ${m.id}:`, err);
      results.push({ meeting_id: m.id, kind: 'day_before', client_email: m.client_email, sent: false, skipped_reason: 'send_failed' });
    }
  }

  return results;
}
