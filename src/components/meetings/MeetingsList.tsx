'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import MutedMono from '@/components/ui/MutedMono';

type Meeting = {
  id: number;
  starts_at: string;
  ends_at: string;
  reschedule_requested_at: string | null;
  coach_name: string;
  cal_com_reschedule_url: string | null;
};

function fmtLong(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}
function daysUntil(iso: string): number {
  const now = new Date();
  const nowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const target = new Date(iso);
  const targetStart = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  return Math.round((targetStart - nowStart) / (1000 * 60 * 60 * 24));
}

// ZHD-styled list: no heavy cards. Each meeting is a hairline-bordered block.
export default function MeetingsList() {
  const [meetings, setMeetings] = useState<Meeting[] | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/meetings');
      if (res.ok) setMeetings(await res.json());
      else setMeetings([]);
    })();
  }, []);

  if (meetings === null) {
    return <MutedMono>Loading…</MutedMono>;
  }

  if (meetings.length === 0) {
    return <MutedMono>No upcoming sessions.</MutedMono>;
  }

  return (
    <div>
      {meetings.map((m, i) => {
        const days = daysUntil(m.starts_at);
        const whenLabel = days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : fmtLong(m.starts_at);
        const rescheduled = !!m.reschedule_requested_at;
        return (
          <div
            key={m.id}
            className={`py-[18px] border-b border-border ${i === 0 ? 'border-t' : ''}`}
          >
            {rescheduled && (
              <MutedMono className="block mb-[6px] text-[var(--color-accent)]">
                Coach requested a reschedule
              </MutedMono>
            )}

            <div className="flex items-baseline justify-between gap-3">
              <div>
                <p className="text-[17px] font-light tracking-[-0.01em] text-text">
                  {whenLabel}
                </p>
                <MutedMono className="block mt-[4px]">
                  {fmtTime(m.starts_at)} · with {m.coach_name.split(' ')[0]}
                </MutedMono>
              </div>
              {m.cal_com_reschedule_url && (
                <a
                  href={m.cal_com_reschedule_url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-[10px] tracking-[0.22em] uppercase text-text-secondary underline underline-offset-[3px] decoration-[0.5px] hover:text-text"
                >
                  Reschedule
                </a>
              )}
            </div>

            <div className="mt-[10px]">
              <Link
                href={`/pre-coaching/${m.id}`}
                className="font-mono text-[10px] tracking-[0.22em] uppercase text-text-secondary underline underline-offset-[3px] decoration-[0.5px] hover:text-text"
              >
                Pre-coaching form →
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}
