import { getSession } from '@/lib/auth';
import { execute, queryOne } from '@/lib/db';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import MutedMono from '@/components/ui/MutedMono';
import { PRE_COACHING_PROMPTS } from '@/lib/pre-coaching';
import SessionNotesEditor from '@/components/coach/SessionNotesEditor';
import AcknowledgeButton from '@/components/coach/AcknowledgeButton';

type MeetingRow = {
  id: number;
  starts_at: string;
  ends_at: string;
  coach_notes: string | null;
  client_id: number;
  client_name: string;
};

type LogRow = {
  id: number;
  responses: Record<string, string>;
  submitted_at: string | null;
  opened_at: string | null;
  acknowledged_at: string | null;
};

export default async function CoachSessionDetailPage({
  params,
}: {
  params: Promise<{ id: string; meetingId: string }>;
}) {
  const session = await getSession();
  if (!session || session.role !== 'coach') redirect('/login');

  const { id, meetingId } = await params;
  const clientId = parseInt(id);
  const mId = parseInt(meetingId);

  const meeting = await queryOne<MeetingRow>(
    `SELECT m.id, m.starts_at, m.ends_at, m.coach_notes, m.client_id,
            u.name AS client_name
     FROM meetings m
     JOIN users u ON u.id = m.client_id
     WHERE m.id = $1 AND m.coach_id = $2 AND m.client_id = $3`,
    [mId, session.userId, clientId]
  );
  if (!meeting) notFound();

  const log = await queryOne<LogRow>(
    `SELECT id, responses, submitted_at, opened_at, acknowledged_at
     FROM pre_coaching_logs
     WHERE meeting_id = $1`,
    [mId]
  );

  // Stamp opened_at the first time the coach lands here — drives the
  // "unopened form" alert dot + inbox inclusion.
  if (log?.submitted_at && !log.opened_at) {
    await execute('UPDATE pre_coaching_logs SET opened_at = NOW() WHERE id = $1', [log.id]);
  }

  const dateStr = new Date(meeting.starts_at).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
  const timeStr = new Date(meeting.starts_at).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit',
  });

  const firstName = meeting.client_name.split(' ')[0];
  const hasAnyResponse = log && Object.values(log.responses).some((v) => v && v.trim().length > 0);

  return (
    <div>
      <Link
        href={`/dashboard/clients/${clientId}`}
        className="font-mono text-[10px] tracking-[0.22em] uppercase text-text-muted hover:text-text"
      >
        ← Back to {firstName}
      </Link>
      <div className="mt-3 mb-8">
        <MutedMono>Session</MutedMono>
        <h1 className="font-display text-[30px] mt-1 leading-[1.1]">{dateStr}</h1>
        <p className="text-[13px] text-text-muted mt-1">{timeStr} · with {meeting.client_name}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <div className="flex items-baseline justify-between mb-4 gap-3">
            <MutedMono>Pre-coaching form</MutedMono>
            {log?.submitted_at ? (
              <MutedMono className="text-accent">
                Submitted {new Date(log.submitted_at).toLocaleDateString()}
              </MutedMono>
            ) : hasAnyResponse ? (
              <MutedMono>Draft only</MutedMono>
            ) : (
              <MutedMono>Not yet filled</MutedMono>
            )}
          </div>

          {!hasAnyResponse ? (
            <p className="text-[13px] text-text-muted">
              {firstName} hasn&apos;t filled out this form yet.
            </p>
          ) : (
            <>
              <div className="space-y-5">
                {PRE_COACHING_PROMPTS.map((p) => {
                  const answer = log?.responses[p.key];
                  if (!answer || !answer.trim()) return null;
                  return (
                    <div key={p.key}>
                      <MutedMono className="block">{p.label}</MutedMono>
                      <p className="text-[14px] text-text-secondary whitespace-pre-wrap mt-1 reflection-text">
                        {answer}
                      </p>
                    </div>
                  );
                })}
              </div>

              {log?.submitted_at && (
                <div className="mt-6 pt-5 border-t border-border">
                  <AcknowledgeButton
                    logId={log.id}
                    clientFirstName={firstName}
                    initiallyAcknowledged={!!log.acknowledged_at}
                    acknowledgedAt={log.acknowledged_at}
                  />
                </div>
              )}
            </>
          )}
        </Card>

        <Card>
          <MutedMono className="block mb-4">My notes</MutedMono>
          <SessionNotesEditor meetingId={mId} initialNotes={meeting.coach_notes || ''} />
          <p className="text-[11px] text-text-muted mt-3">
            Visible to {firstName} too — they&apos;ll see these on their session page.
          </p>
        </Card>
      </div>
    </div>
  );
}
