import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, execute } from '@/lib/db';
import { Resend } from 'resend';
import { syncAllCoachCalendars } from '@/lib/gcal-sync';
import { sendMeetingReminders } from '@/lib/meeting-reminders';
import { sendPushToUser } from '@/lib/push';

// This endpoint is hit twice on different schedules:
//   - Vercel's own cron, once daily at 04:00 UTC → full run (GCal sync +
//     meeting reminders + nudges). Vercel Hobby caps us at one cron/day.
//   - An external scheduler, hourly, with `?nudgesOnly=1` → nudges only.
//     Hobby can't schedule hourly itself, and per-user nudge times are
//     meaningless without an hourly tick.
// Nudges are deduped per user per slot per LOCAL day via
// `user_settings.nudges_{morning,evening}_sent_date`, so the overlap between
// the two schedules at 04:00 UTC never double-sends.

// How late a nudge may still go out after its configured time. Absorbs
// scheduler drift (Vercel Hobby crons routinely fire 30-60 min late) without
// pinging someone at 2am for a 9pm slot they missed.
const CATCHUP_MINUTES = 90;

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
type DayKey = typeof DAY_KEYS[number];

// Everything about "when is it for this user" in one pass, so the date, the
// weekday and the wall-clock minute can never disagree across a midnight or
// DST boundary.
function localNow(nowUtc: Date, tz: string): { date: string; minutes: number; day: DayKey } {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
      weekday: 'short',
    }).formatToParts(nowUtc);
    const get = (t: string) => parts.find(p => p.type === t)?.value ?? '';
    const day = get('weekday').toLowerCase().slice(0, 3) as DayKey;
    return {
      date: `${get('year')}-${get('month')}-${get('day')}`,
      minutes: parseInt(get('hour'), 10) * 60 + parseInt(get('minute'), 10),
      day: DAY_KEYS.includes(day) ? day : DAY_KEYS[nowUtc.getUTCDay()],
    };
  } catch {
    return {
      date: nowUtc.toISOString().split('T')[0],
      minutes: nowUtc.getUTCHours() * 60 + nowUtc.getUTCMinutes(),
      day: DAY_KEYS[nowUtc.getUTCDay()],
    };
  }
}

// 'HH:MM' → minutes past local midnight.
function parseHHMM(t: string, fallbackMinutes: number): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec((t || '').trim());
  if (!m) return fallbackMinutes;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return fallbackMinutes;
  return h * 60 + min;
}

function buildMessage(hasWins: boolean, hasJournal: boolean, tone: string, firstName: string): string {
  let core: string;
  if (!hasWins && !hasJournal) {
    core = "You haven't checked in today yet! Take a moment to check off your wins and reflect on your day.";
  } else if (!hasWins) {
    core = "You've written your reflection — nice! Don't forget to check off your wins for today.";
  } else {
    core = "Great job checking off wins today! Take a moment to do your daily reflection too.";
  }
  return tone === 'plain' ? core : `Hey ${firstName}! 👋 ${core}`;
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dryRun = request.nextUrl.searchParams.get('dryRun') === '1';
  // The hourly external tick passes this so we don't hammer the Google
  // Calendar API 24x/day or re-walk the meeting-reminder table every hour.
  const nudgesOnly = request.nextUrl.searchParams.get('nudgesOnly') === '1';

  const gcalSync = nudgesOnly ? null : await syncAllCoachCalendars();
  const meetingReminders = nudgesOnly ? null : await sendMeetingReminders({ dryRun });

  const resend = new Resend(process.env.RESEND_API_KEY);
  const nowUtc = new Date();

  const clients = await query<{
    id: number;
    name: string;
    email: string;
    timezone: string | null;
    nudges_enabled: number;
    nudges_morning_on: number;
    nudges_morning_time: string;
    nudges_morning_days: string;
    nudges_evening_on: number;
    nudges_evening_time: string;
    nudges_evening_days: string;
    nudges_tone: string;
    nudges_quiet_mode: number;
    nudges_morning_sent_date: string | null;
    nudges_evening_sent_date: string | null;
  }>(
    `SELECT u.id, u.name, u.email,
            COALESCE(us.timezone, 'Pacific/Honolulu') as timezone,
            COALESCE(us.nudges_enabled, 1) as nudges_enabled,
            COALESCE(us.nudges_morning_on, 1) as nudges_morning_on,
            COALESCE(us.nudges_morning_time, '07:00') as nudges_morning_time,
            COALESCE(us.nudges_morning_days, 'mon,tue,wed,thu,fri') as nudges_morning_days,
            COALESCE(us.nudges_evening_on, 1) as nudges_evening_on,
            COALESCE(us.nudges_evening_time, '21:00') as nudges_evening_time,
            COALESCE(us.nudges_evening_days, 'mon,tue,wed,thu,fri,sat,sun') as nudges_evening_days,
            COALESCE(us.nudges_tone, 'soft') as nudges_tone,
            COALESCE(us.nudges_quiet_mode, 0) as nudges_quiet_mode,
            us.nudges_morning_sent_date,
            us.nudges_evening_sent_date
     FROM users u
     JOIN client_info ci ON ci.user_id = u.id
     LEFT JOIN user_settings us ON us.user_id = u.id
     WHERE u.role = 'client'`
  );

  let sent = 0;
  let skipped = 0;
  const sentBySlot = { morning: 0, evening: 0 };

  for (const client of clients) {
    if (!client.nudges_enabled) { skipped++; continue; }

    const tz = client.timezone || 'Pacific/Honolulu';
    const local = localNow(nowUtc, tz);
    const today = local.date;

    // At most one nudge per user per run. Morning is checked first so that a
    // long outage can't let a stale evening slot pre-empt today's morning.
    const due = ([
      {
        name: 'morning' as const,
        on: client.nudges_morning_on,
        time: client.nudges_morning_time,
        days: client.nudges_morning_days,
        sentDate: client.nudges_morning_sent_date,
        fallback: 7 * 60,
      },
      {
        name: 'evening' as const,
        on: client.nudges_evening_on,
        time: client.nudges_evening_time,
        days: client.nudges_evening_days,
        sentDate: client.nudges_evening_sent_date,
        fallback: 21 * 60,
      },
    ]).find(s => {
      if (!s.on) return false;
      if (s.sentDate === today) return false;
      if (!s.days.split(',').map(d => d.trim()).includes(local.day)) return false;
      const elapsed = local.minutes - parseHHMM(s.time, s.fallback);
      return elapsed >= 0 && elapsed <= CATCHUP_MINUTES;
    });

    if (!due) { skipped++; continue; }

    const wins = await queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM win_entries WHERE user_id = $1 AND date = $2 AND completed = 1',
      [client.id, today]
    );
    const journal = await queryOne<{ id: number }>(
      "SELECT id FROM journal_entries WHERE user_id = $1 AND date = $2 AND content != ''",
      [client.id, today]
    );

    const hasWins = parseInt(wins?.count || '0') > 0;
    const hasJournal = !!journal;

    // Quiet mode: skip the nudge if they've already done both.
    if (client.nudges_quiet_mode && hasWins && hasJournal) { skipped++; continue; }

    if (dryRun) { sentBySlot[due.name]++; sent++; continue; }

    const firstName = client.name.split(' ')[0];
    const message = buildMessage(hasWins, hasJournal, client.nudges_tone, firstName);

    await Promise.allSettled([
      sendPushToUser(client.id, {
        title: 'Win the Day',
        body: message,
        url: '/today',
      }),
      resend.emails.send({
        from: process.env.REMINDER_FROM_EMAIL || 'Win the Day <onboarding@resend.dev>',
        to: client.email,
        subject: `${firstName}, don't forget to check in today!`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
            <h2 style="color: #1B1F3B; font-size: 20px; margin-bottom: 8px;">Hey ${firstName}! 👋</h2>
            <p style="color: #4A5068; font-size: 15px; line-height: 1.6;">${buildMessage(hasWins, hasJournal, 'soft', firstName).replace(`Hey ${firstName}! 👋 `, '')}</p>
            <a href="https://www.wintheday.work/today"
               style="display: inline-block; margin-top: 16px; padding: 12px 24px; background: #1B1F3B; color: white; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 14px;">
              Open Win the Day
            </a>
            <p style="color: #9CA3AF; font-size: 12px; margin-top: 24px;">You're getting this because you haven't checked in yet today.</p>
          </div>
        `,
      }).catch((err: unknown) => console.error(`Failed to send reminder email to ${client.email}:`, err)),
    ]);

    // Stamp unconditionally after the attempt, not on success. Push and email
    // are fire-and-forget and a persistently failing channel must not turn
    // into an hourly retry loop against the same client.
    await execute(
      due.name === 'morning'
        ? 'UPDATE user_settings SET nudges_morning_sent_date = $1 WHERE user_id = $2'
        : 'UPDATE user_settings SET nudges_evening_sent_date = $1 WHERE user_id = $2',
      [today, client.id]
    );

    sentBySlot[due.name]++;
    sent++;
  }

  return NextResponse.json({
    ok: true, sent, sentBySlot, skipped, checked: clients.length,
    gcalSync, meetingReminders, nudgesOnly, dryRun,
  });
}
