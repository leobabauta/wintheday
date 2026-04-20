import { NextRequest, NextResponse } from 'next/server';
import { execute, queryOne } from '@/lib/db';
import { requireAuth, handleAuthError } from '@/lib/api-auth';
import { Resend } from 'resend';

const APP_URL = process.env.APP_URL || 'https://www.wintheday.work';

type LogRow = {
  id: number;
  meeting_id: number;
  client_id: number;
  coach_id: number;
  responses: Record<string, string>;
  submitted_at: string | null;
  updated_at: string;
};

type MeetingRow = {
  id: number;
  coach_id: number;
  client_id: number;
  starts_at: string;
};

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    const url = new URL(request.url);
    const meetingIdParam = url.searchParams.get('meeting_id');
    if (!meetingIdParam) {
      return NextResponse.json({ error: 'meeting_id required' }, { status: 400 });
    }
    const meetingId = parseInt(meetingIdParam);

    const meeting = await queryOne<MeetingRow>(
      `SELECT id, coach_id, client_id, starts_at FROM meetings WHERE id = $1`,
      [meetingId]
    );
    if (!meeting) return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });

    const isClient = auth.role === 'client' && meeting.client_id === auth.userId;
    const isCoach = auth.role === 'coach' && meeting.coach_id === auth.userId;
    if (!isClient && !isCoach) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const log = await queryOne<LogRow>(
      `SELECT id, meeting_id, client_id, coach_id, responses, submitted_at, updated_at
       FROM pre_coaching_logs WHERE meeting_id = $1`,
      [meetingId]
    );

    return NextResponse.json({
      meeting,
      log: log ?? null,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = requireAuth(request, 'client');
    const body = await request.json();
    const meetingId = typeof body.meeting_id === 'number' ? body.meeting_id : parseInt(body.meeting_id);
    const responses = (body.responses && typeof body.responses === 'object') ? body.responses : {};
    const submit = body.submit === true;

    if (!meetingId || Number.isNaN(meetingId)) {
      return NextResponse.json({ error: 'meeting_id required' }, { status: 400 });
    }

    const meeting = await queryOne<MeetingRow>(
      `SELECT m.id, m.coach_id, m.client_id, m.starts_at
       FROM meetings m
       WHERE m.id = $1 AND m.client_id = $2`,
      [meetingId, auth.userId]
    );
    if (!meeting) return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });

    const submittedFragment = submit ? `, submitted_at = now()` : '';

    await execute(
      `INSERT INTO pre_coaching_logs (meeting_id, client_id, coach_id, responses, submitted_at, updated_at)
       VALUES ($1, $2, $3, $4, ${submit ? 'now()' : 'NULL'}, now())
       ON CONFLICT (meeting_id) DO UPDATE SET
         responses = EXCLUDED.responses,
         updated_at = now()
         ${submittedFragment}`,
      [meetingId, auth.userId, meeting.coach_id, JSON.stringify(responses)]
    );

    if (submit && process.env.RESEND_API_KEY) {
      try {
        const coach = await queryOne<{ email: string; name: string }>(
          `SELECT email, name FROM users WHERE id = $1`,
          [meeting.coach_id]
        );
        const client = await queryOne<{ name: string }>(
          `SELECT name FROM users WHERE id = $1`,
          [auth.userId]
        );
        if (coach && client) {
          const resend = new Resend(process.env.RESEND_API_KEY);
          const sessionDate = new Date(meeting.starts_at).toLocaleDateString('en-US', {
            weekday: 'long', month: 'long', day: 'numeric',
          });
          const clientLink = `${APP_URL}/dashboard/clients/${auth.userId}`;
          await resend.emails.send({
            from: process.env.REMINDER_FROM_EMAIL || 'Win the Day <onboarding@resend.dev>',
            to: coach.email,
            subject: `${client.name} sent their pre-coaching form`,
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
                <h2 style="color: #1B1F3B; font-size: 20px; margin-bottom: 8px;">Pre-coaching form received</h2>
                <p style="color: #4A5068; font-size: 15px; line-height: 1.6;">
                  <strong>${client.name}</strong> submitted their pre-coaching form for the session on ${sessionDate}.
                </p>
                <a href="${clientLink}"
                   style="display: inline-block; margin-top: 16px; padding: 12px 24px; background: #1B1F3B; color: white; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 14px;">
                  View responses
                </a>
              </div>
            `,
          });
        }
      } catch (err) {
        console.error('Failed to email coach on pre-coaching submit:', err);
      }
    }

    return NextResponse.json({ ok: true, submitted: submit });
  } catch (error) {
    return handleAuthError(error);
  }
}
