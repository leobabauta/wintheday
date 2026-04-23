import { getSession } from '@/lib/auth';
import { queryOne } from '@/lib/db';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import MutedMono from '@/components/ui/MutedMono';
import Markdown from '@/components/ui/Markdown';
import { PRE_COACHING_PROMPTS } from '@/lib/pre-coaching';

type MeetingRow = {
  id: number;
  starts_at: string;
  coach_notes: string | null;
  coach_name: string;
};

type LogRow = {
  responses: Record<string, string>;
  submitted_at: string | null;
};

export default async function ClientSessionDetailPage({
  params,
}: {
  params: Promise<{ meetingId: string }>;
}) {
  const session = await getSession();
  if (!session || session.role !== 'client') redirect('/login');

  const { meetingId } = await params;
  const mId = parseInt(meetingId);

  const meeting = await queryOne<MeetingRow>(
    `SELECT m.id, m.starts_at, m.coach_notes,
            coach.name AS coach_name
     FROM meetings m
     JOIN users coach ON coach.id = m.coach_id
     WHERE m.id = $1 AND m.client_id = $2`,
    [mId, session.userId]
  );
  if (!meeting) notFound();

  const log = await queryOne<LogRow>(
    `SELECT responses, submitted_at FROM pre_coaching_logs WHERE meeting_id = $1`,
    [mId]
  );

  const isPast = new Date(meeting.starts_at).getTime() < Date.now();
  const dateStr = new Date(meeting.starts_at).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
  const timeStr = new Date(meeting.starts_at).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit',
  });

  const hasAnyResponse = log && Object.values(log.responses || {}).some((v) => v && v.trim().length > 0);
  const coachFirstName = meeting.coach_name.split(' ')[0];

  return (
    <div>
      <Link
        href="/meetings"
        className="font-mono text-[10px] tracking-[0.22em] uppercase text-text-muted hover:text-text"
      >
        ← All sessions
      </Link>
      <div className="mt-3 mb-8">
        <MutedMono>{isPast ? 'Past session' : 'Upcoming session'}</MutedMono>
        <h1 className="font-display text-[30px] mt-1 leading-[1.1]">{dateStr}</h1>
        <p className="text-[13px] text-text-muted mt-1">
          {timeStr} · with {coachFirstName}
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <div className="flex items-baseline justify-between mb-4 gap-3">
            <MutedMono>My pre-coaching form</MutedMono>
            {log?.submitted_at ? (
              <MutedMono className="text-accent">
                Submitted {new Date(log.submitted_at).toLocaleDateString()}
              </MutedMono>
            ) : (
              <Link
                href={`/pre-coaching/${mId}`}
                className="font-mono text-[10px] tracking-[0.22em] uppercase text-accent underline underline-offset-[3px]"
              >
                Fill out →
              </Link>
            )}
          </div>
          {!hasAnyResponse ? (
            <p className="text-[13px] text-text-muted">
              You haven&apos;t filled out the pre-coaching form for this session.
            </p>
          ) : (
            <div className="space-y-5">
              {PRE_COACHING_PROMPTS.map((p) => {
                const answer = log?.responses?.[p.key];
                if (!answer || !answer.trim()) return null;
                return (
                  <div key={p.key}>
                    <MutedMono className="block">{p.label}</MutedMono>
                    <p className="text-[15px] text-text whitespace-pre-wrap mt-1 leading-[1.55] font-light">
                      {answer}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card>
          <MutedMono className="block mb-4">Notes from {coachFirstName}</MutedMono>
          {meeting.coach_notes && meeting.coach_notes.trim() ? (
            <Markdown text={meeting.coach_notes} />
          ) : (
            <p className="text-[13px] text-text-muted">
              {isPast
                ? `${coachFirstName} hasn't added notes for this session yet.`
                : `${coachFirstName} will add notes after your session.`}
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
