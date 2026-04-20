import { NextRequest, NextResponse } from 'next/server';
import { execute, queryOne } from '@/lib/db';
import { requireAuth, handleAuthError } from '@/lib/api-auth';

type IntegrationRow = {
  google_calendar_email: string | null;
  cal_com_reschedule_url: string | null;
  last_synced_at: string | null;
  has_google: boolean;
};

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request, 'coach');
    const row = await queryOne<IntegrationRow>(
      `SELECT google_calendar_email, cal_com_reschedule_url, last_synced_at,
              (google_refresh_token IS NOT NULL) AS has_google
       FROM coach_integrations WHERE user_id = $1`,
      [auth.userId]
    );
    return NextResponse.json(
      row ?? { google_calendar_email: null, cal_com_reschedule_url: null, last_synced_at: null, has_google: false }
    );
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = requireAuth(request, 'coach');
    const body = await request.json();
    const url = typeof body.cal_com_reschedule_url === 'string' ? body.cal_com_reschedule_url.trim() : null;
    await execute(
      `INSERT INTO coach_integrations (user_id, cal_com_reschedule_url, updated_at)
       VALUES ($1, $2, now())
       ON CONFLICT (user_id) DO UPDATE SET
         cal_com_reschedule_url = EXCLUDED.cal_com_reschedule_url,
         updated_at = now()`,
      [auth.userId, url || null]
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = requireAuth(request, 'coach');
    await execute(
      `UPDATE coach_integrations
       SET google_refresh_token = NULL, google_calendar_email = NULL, updated_at = now()
       WHERE user_id = $1`,
      [auth.userId]
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleAuthError(error);
  }
}
