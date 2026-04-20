'use client';

import { useEffect, useState } from 'react';
import Card from '@/components/ui/Card';
import MutedMono from '@/components/ui/MutedMono';
import { PRE_COACHING_PROMPTS } from '@/lib/pre-coaching';

type Meeting = { id: number; starts_at: string };
type Log = {
  responses: Record<string, string>;
  submitted_at: string | null;
  updated_at: string;
};

export default function PreCoachingLogView({ clientId }: { clientId: number }) {
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [log, setLog] = useState<Log | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const mRes = await fetch(`/api/meetings?client_id=${clientId}`);
      if (!mRes.ok) { setLoaded(true); return; }
      const meetings: Meeting[] = await mRes.json();
      const next = meetings[0] ?? null;
      setMeeting(next);
      if (next) {
        const lRes = await fetch(`/api/pre-coaching-logs?meeting_id=${next.id}`);
        if (lRes.ok) {
          const data = await lRes.json();
          setLog(data.log);
        }
      }
      setLoaded(true);
    })();
  }, [clientId]);

  if (!loaded) return null;
  if (!meeting) return null;

  const date = new Date(meeting.starts_at).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });

  const hasAnyResponse = log && Object.values(log.responses).some(v => v && v.trim().length > 0);

  return (
    <Card>
      <div className="flex items-baseline justify-between mb-4 gap-3">
        <MutedMono>Pre-coaching Log · {date}</MutedMono>
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
        <p className="text-[13px] text-text-muted">Client hasn&apos;t filled out this form yet.</p>
      ) : (
        <div className="space-y-4">
          {PRE_COACHING_PROMPTS.map(p => {
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
      )}
    </Card>
  );
}
