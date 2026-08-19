import type { calendar_v3 } from 'googleapis';
import { query, execute } from './db';
import { getCalendarClient } from './google';

type CoachIntegrationRow = {
  user_id: number;
  google_refresh_token: string;
};

type ClientRow = {
  id: number;
  email: string;
};

export type SyncResult = {
  coach_id: number;
  events_scanned: number;
  meetings_upserted: number;
  meetings_cancelled: number;
  meetings_stale_cancelled: number;
  error?: string;
};

export async function syncAllCoachCalendars(): Promise<SyncResult[]> {
  const coaches = await query<CoachIntegrationRow>(
    `SELECT user_id, google_refresh_token FROM coach_integrations WHERE google_refresh_token IS NOT NULL`
  );

  const results: SyncResult[] = [];
  for (const coach of coaches) {
    try {
      const result = await syncCoachCalendar(coach.user_id, coach.google_refresh_token);
      results.push(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`GCal sync failed for coach ${coach.user_id}:`, err);
      results.push({
        coach_id: coach.user_id,
        events_scanned: 0,
        meetings_upserted: 0,
        meetings_cancelled: 0,
        meetings_stale_cancelled: 0,
        error: message,
      });
    }
  }
  return results;
}

async function syncCoachCalendar(coachUserId: number, refreshToken: string): Promise<SyncResult> {
  const clients = await query<ClientRow>(
    `SELECT u.id, LOWER(u.email) AS email
     FROM users u
     JOIN client_info ci ON ci.user_id = u.id
     WHERE ci.coach_id = $1 AND u.role = 'client'`,
    [coachUserId]
  );

  const emailToClientId = new Map<string, number>();
  for (const c of clients) emailToClientId.set(c.email, c.id);

  const calendar = getCalendarClient(refreshToken);
  const now = new Date();
  const sixtyDays = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

  const windowStart = now.toISOString();
  const windowEnd = sixtyDays.toISOString();

  // Paginate to exhaustion. The reconciliation pass below cancels meetings
  // whose event is absent from this list, so a page-truncated list would
  // cancel real, still-scheduled meetings.
  const events: calendar_v3.Schema$Event[] = [];
  let pageToken: string | undefined;
  do {
    const res = await calendar.events.list({
      calendarId: 'primary',
      timeMin: windowStart,
      timeMax: windowEnd,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 250,
      pageToken,
    });
    events.push(...(res.data.items ?? []));
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);

  const seenEventIds = new Set<string>();
  let upserted = 0;
  let cancelled = 0;

  for (const ev of events) {
    if (!ev.id) continue;
    const startIso = ev.start?.dateTime ?? ev.start?.date ?? null;
    const endIso = ev.end?.dateTime ?? ev.end?.date ?? null;
    if (!startIso || !endIso) continue;

    let matchedClientId: number | null = null;
    for (const attendee of ev.attendees ?? []) {
      const email = attendee.email?.toLowerCase();
      if (!email) continue;
      const clientId = emailToClientId.get(email);
      if (clientId) {
        matchedClientId = clientId;
        break;
      }
    }
    if (!matchedClientId) continue;

    const isCancelled = ev.status === 'cancelled';
    const status = isCancelled ? 'cancelled' : 'scheduled';

    await execute(
      `INSERT INTO meetings (coach_id, client_id, starts_at, ends_at, google_event_id, status, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, now())
       ON CONFLICT (google_event_id) DO UPDATE SET
         coach_id = EXCLUDED.coach_id,
         client_id = EXCLUDED.client_id,
         starts_at = EXCLUDED.starts_at,
         ends_at = EXCLUDED.ends_at,
         status = EXCLUDED.status,
         updated_at = now()`,
      [coachUserId, matchedClientId, startIso, endIso, ev.id, status]
    );

    seenEventIds.add(ev.id);
    if (isCancelled) cancelled++;
    else upserted++;
  }

  // Google only returns events that still exist, so anything previously synced
  // into this window that we did not see this run was deleted outright or fell
  // off the end of a shortened recurrence (the usual case: an RRULE rewritten
  // with an earlier UNTIL). Left alone, those rows sit at 'scheduled' forever,
  // showing as upcoming sessions and firing day-before reminders and
  // pre-coaching forms for calls that are not happening. If an event comes
  // back, the upsert above flips it to 'scheduled' again.
  //
  // Skipped when nothing matched a client: an empty set is far more likely a
  // partial API result than a genuinely emptied calendar, and reconciling
  // against it would cancel every upcoming session the coach has.
  let staleCancelled = 0;
  if (seenEventIds.size > 0) {
    const stale = await execute(
      `UPDATE meetings SET status = 'cancelled', updated_at = now()
       WHERE coach_id = $1
         AND status = 'scheduled'
         AND google_event_id IS NOT NULL
         AND starts_at >= $2
         AND starts_at < $3
         AND NOT (google_event_id = ANY($4))`,
      [coachUserId, windowStart, windowEnd, [...seenEventIds]]
    );
    staleCancelled = stale.rowCount;
  }

  await execute(
    `UPDATE coach_integrations SET last_synced_at = now() WHERE user_id = $1`,
    [coachUserId]
  );

  return {
    coach_id: coachUserId,
    events_scanned: events.length,
    meetings_upserted: upserted,
    meetings_cancelled: cancelled,
    meetings_stale_cancelled: staleCancelled,
  };
}
