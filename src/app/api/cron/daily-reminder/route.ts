import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { Resend } from 'resend';
import { syncAllCoachCalendars } from '@/lib/gcal-sync';
import { sendMeetingReminders } from '@/lib/meeting-reminders';
import { sendPushToUser } from '@/lib/push';

// At 4 AM UTC, local hours by timezone region:
//   US Pacific  = 21 (9 PM)   → evening slot
//   US Mountain = 22 (10 PM)  → evening slot
//   US Central  = 23 (11 PM)  → evening slot
//   US Eastern  =  0 (midnight) → evening slot (hour 0 treated as late evening)
//   Hawaii      = 18 (6 PM)   → evening slot
//   UK / BST    =  5 (5 AM)   → morning slot
//   Central EU  =  6 (6 AM)   → morning slot
// A single daily cron covers both regions.
function activeSlot(localHour: number): 'morning' | 'evening' | null {
  if (localHour >= 5 && localHour <= 11) return 'morning';
  if (localHour >= 18 || localHour === 0) return 'evening';
  return null;
}

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

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

  const gcalSync = await syncAllCoachCalendars();
  const meetingReminders = await sendMeetingReminders({ dryRun });

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
            COALESCE(us.nudges_quiet_mode, 0) as nudges_quiet_mode
     FROM users u
     JOIN client_info ci ON ci.user_id = u.id
     LEFT JOIN user_settings us ON us.user_id = u.id
     WHERE u.role = 'client'`
  );

  let sent = 0;
  let skipped = 0;

  for (const client of clients) {
    if (!client.nudges_enabled) { skipped++; continue; }

    const tz = client.timezone || 'Pacific/Honolulu';

    let today: string;
    let localHour: number;
    let localDayOfWeek: number;
    try {
      const dateFmt = new Intl.DateTimeFormat('en-CA', { timeZone: tz });
      today = dateFmt.format(nowUtc);
      const hourFmt = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', hour12: false });
      localHour = parseInt(hourFmt.format(nowUtc), 10);
      const dayFmt = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' });
      const dayStr = dayFmt.format(nowUtc).toLowerCase().slice(0, 3); // 'mon', 'tue', etc.
      localDayOfWeek = DAY_KEYS.indexOf(dayStr as typeof DAY_KEYS[number]);
    } catch {
      today = nowUtc.toISOString().split('T')[0];
      localHour = nowUtc.getUTCHours();
      localDayOfWeek = nowUtc.getUTCDay();
    }

    const slot = activeSlot(localHour);
    if (!slot) { skipped++; continue; }

    const slotOn = slot === 'morning' ? client.nudges_morning_on : client.nudges_evening_on;
    if (!slotOn) { skipped++; continue; }

    const slotDays = (slot === 'morning' ? client.nudges_morning_days : client.nudges_evening_days).split(',');
    const todayKey = DAY_KEYS[localDayOfWeek];
    if (todayKey && !slotDays.includes(todayKey)) { skipped++; continue; }

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

    if (dryRun) { sent++; continue; }

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

    sent++;
  }

  return NextResponse.json({ ok: true, sent, skipped, checked: clients.length, gcalSync, meetingReminders, dryRun });
}
