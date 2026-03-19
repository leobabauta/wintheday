import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { Resend } from 'resend';

export async function GET(request: NextRequest) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const today = new Date().toISOString().split('T')[0];

  // Find all clients who haven't checked off any wins or written a journal entry today
  const clients = await query<{
    id: number;
    name: string;
    email: string;
  }>(
    `SELECT u.id, u.name, u.email
     FROM users u
     JOIN client_info ci ON ci.user_id = u.id
     WHERE u.role = 'client'`
  );

  let sent = 0;

  for (const client of clients) {
    // Check if they have any completed wins today
    const wins = await queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM win_entries WHERE user_id = $1 AND date = $2 AND completed = 1',
      [client.id, today]
    );

    // Check if they have a journal entry today
    const journal = await queryOne<{ id: number }>(
      "SELECT id FROM journal_entries WHERE user_id = $1 AND date = $2 AND content != ''",
      [client.id, today]
    );

    const hasWins = parseInt(wins?.count || '0') > 0;
    const hasJournal = !!journal;

    // Skip if they've done both
    if (hasWins && hasJournal) continue;

    // Build a friendly nudge
    let message: string;
    if (!hasWins && !hasJournal) {
      message = "You haven't checked in today yet! Take a moment to check off your wins and reflect on your day.";
    } else if (!hasWins) {
      message = "You've written your reflection — nice! Don't forget to check off your wins for today.";
    } else {
      message = "Great job checking off wins today! Take a moment to do your daily reflection too.";
    }

    try {
      await resend.emails.send({
        from: process.env.REMINDER_FROM_EMAIL || 'Win the Day <noreply@wintheday.work>',
        to: client.email,
        subject: `${client.name.split(' ')[0]}, don't forget to check in today!`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
            <h2 style="color: #1B1F3B; font-size: 20px; margin-bottom: 8px;">Hey ${client.name.split(' ')[0]}! 👋</h2>
            <p style="color: #4A5068; font-size: 15px; line-height: 1.6;">${message}</p>
            <a href="https://www.wintheday.work/today"
               style="display: inline-block; margin-top: 16px; padding: 12px 24px; background: #1B1F3B; color: white; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 14px;">
              Open Win the Day
            </a>
            <p style="color: #9CA3AF; font-size: 12px; margin-top: 24px;">You're getting this because you haven't checked in yet today.</p>
          </div>
        `,
      });
      sent++;
    } catch (err) {
      console.error(`Failed to send reminder to ${client.email}:`, err);
    }
  }

  return NextResponse.json({ ok: true, sent, checked: clients.length });
}
