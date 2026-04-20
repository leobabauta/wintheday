import { NextRequest, NextResponse } from 'next/server';
import { execute, queryOne } from '@/lib/db';
import { requireAuth, handleAuthError } from '@/lib/api-auth';
import { Resend } from 'resend';

type MeetingRow = {
  id: number;
  coach_id: number;
  client_id: number;
  starts_at: string;
  client_email: string;
  client_name: string;
  coach_name: string;
  cal_com_reschedule_url: string | null;
};

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = requireAuth(request, 'coach');
    const { id } = await params;
    const meetingId = parseInt(id);
    const body = await request.json().catch(() => ({}));
    const note = typeof body.note === 'string' ? body.note.trim() : '';

    const meeting = await queryOne<MeetingRow>(
      `SELECT m.id, m.coach_id, m.client_id, m.starts_at,
              client.email AS client_email, client.name AS client_name,
              coach.name AS coach_name,
              ci.cal_com_reschedule_url
       FROM meetings m
       JOIN users client ON client.id = m.client_id
       JOIN users coach ON coach.id = m.coach_id
       LEFT JOIN coach_integrations ci ON ci.user_id = m.coach_id
       WHERE m.id = $1 AND m.coach_id = $2`,
      [meetingId, auth.userId]
    );
    if (!meeting) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await execute(
      `UPDATE meetings SET reschedule_requested_at = now(), reschedule_requested_by = $1, updated_at = now() WHERE id = $2`,
      [auth.userId, meetingId]
    );

    const startDate = new Date(meeting.starts_at).toLocaleString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit',
    });
    const linkLine = meeting.cal_com_reschedule_url
      ? `\n\nReschedule link: ${meeting.cal_com_reschedule_url}`
      : '';
    const content = `I need to reschedule our session on ${startDate}.${note ? `\n\n${note}` : ''}${linkLine}`;

    await execute(
      `INSERT INTO messages (sender_id, recipient_id, type, content) VALUES ($1, $2, 'question', $3)`,
      [auth.userId, meeting.client_id, content]
    );

    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      try {
        const resend = new Resend(resendKey);
        const firstName = meeting.client_name.split(' ')[0];
        const link = meeting.cal_com_reschedule_url;
        await resend.emails.send({
          from: process.env.REMINDER_FROM_EMAIL || 'Win the Day <onboarding@resend.dev>',
          to: meeting.client_email,
          subject: `${meeting.coach_name.split(' ')[0]} needs to reschedule your session`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
              <h2 style="color: #1B1F3B; font-size: 20px; margin-bottom: 8px;">Hey ${firstName},</h2>
              <p style="color: #4A5068; font-size: 15px; line-height: 1.6;">
                ${meeting.coach_name} needs to reschedule your session on <strong>${startDate}</strong>.
              </p>
              ${note ? `<p style="color: #4A5068; font-size: 14px; font-style: italic; border-left: 3px solid #ddd; padding-left: 12px;">${note}</p>` : ''}
              ${link ? `<a href="${link}" style="display: inline-block; margin-top: 16px; padding: 12px 24px; background: #1B1F3B; color: white; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 14px;">Pick a new time</a>` : ''}
            </div>
          `,
        });
      } catch (err) {
        console.error('Failed to send reschedule email:', err);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleAuthError(error);
  }
}
