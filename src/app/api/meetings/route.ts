import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth, handleAuthError } from '@/lib/api-auth';

type MeetingRow = {
  id: number;
  starts_at: string;
  ends_at: string;
  status: string;
  reschedule_requested_at: string | null;
  reschedule_requested_by: number | null;
  coach_id: number;
  client_id: number;
  coach_name: string;
  client_name: string;
  client_email: string;
  cal_com_reschedule_url: string | null;
};

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    const url = new URL(request.url);
    const clientIdParam = url.searchParams.get('client_id');
    const includeCompleted = url.searchParams.get('include_completed') === '1';

    const baseSelect = `
      SELECT m.id, m.starts_at, m.ends_at, m.status,
             m.reschedule_requested_at, m.reschedule_requested_by,
             m.coach_id, m.client_id,
             coach.name AS coach_name,
             client.name AS client_name,
             client.email AS client_email,
             ci.cal_com_reschedule_url
      FROM meetings m
      JOIN users coach ON coach.id = m.coach_id
      JOIN users client ON client.id = m.client_id
      LEFT JOIN coach_integrations ci ON ci.user_id = m.coach_id
    `;

    const statusClause = includeCompleted
      ? `m.status != 'cancelled'`
      : `m.status = 'scheduled' AND m.starts_at >= now()`;

    let rows: MeetingRow[];
    if (auth.role === 'coach') {
      const clientFilter = clientIdParam ? ` AND m.client_id = $2` : '';
      const params: unknown[] = [auth.userId];
      if (clientIdParam) params.push(parseInt(clientIdParam));
      rows = await query<MeetingRow>(
        `${baseSelect} WHERE m.coach_id = $1 AND ${statusClause}${clientFilter} ORDER BY m.starts_at ASC`,
        params
      );
    } else {
      rows = await query<MeetingRow>(
        `${baseSelect} WHERE m.client_id = $1 AND ${statusClause} ORDER BY m.starts_at ASC`,
        [auth.userId]
      );
    }

    return NextResponse.json(rows);
  } catch (error) {
    return handleAuthError(error);
  }
}
