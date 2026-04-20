'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import MutedMono from '@/components/ui/MutedMono';

// ZHD-styled: no heavy card. Thin top/bottom hairlines, mono-caps eyebrow,
// Jost primary for the "Today/Tomorrow/<date>" label, mono-caps meta beneath.
// Quiet Reschedule + Pre-coaching form links. "All N upcoming" reveals only
// when there's more than one session scheduled.

type Meeting = {
  id: number;
  starts_at: string;
  ends_at: string;
  reschedule_requested_at: string | null;
  coach_name: string;
  cal_com_reschedule_url: string | null;
};

function fmtShort(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
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

export default function NextSessionCard() {
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [upcomingCount, setUpcomingCount] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/meetings');
      if (res.ok) {
        const rows: Meeting[] = await res.json();
        setMeeting(rows[0] ?? null);
        setUpcomingCount(rows.length);
      }
      setLoaded(true);
    })();
  }, []);

  if (!loaded || !meeting) return null;

  const days = daysUntil(meeting.starts_at);
  const whenLabel = days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : fmtShort(meeting.starts_at);
  const rescheduled = !!meeting.reschedule_requested_at;

  return (
    <div className="rounded-[14px] border border-border bg-bg p-[22px] mb-3">
      <MutedMono className="block mb-[10px]">Next Session</MutedMono>
      {rescheduled && (
        <MutedMono className="block mb-[6px] text-[var(--color-accent)]">
          Coach requested a reschedule
        </MutedMono>
      )}
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="text-[22px] font-light tracking-[-0.01em] text-text">
            {whenLabel}
          </p>
          <MutedMono className="block mt-[4px]">
            {fmtTime(meeting.starts_at)} · with {meeting.coach_name.split(' ')[0]}
          </MutedMono>
        </div>
        {meeting.cal_com_reschedule_url && (
          <a
            href={meeting.cal_com_reschedule_url}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-[10px] tracking-[0.22em] uppercase text-text-secondary underline underline-offset-[3px] decoration-[0.5px] hover:text-text"
          >
            Reschedule
          </a>
        )}
      </div>

      <div className="mt-[14px] pt-[12px] border-t border-border flex items-center justify-between gap-3">
        <Link
          href={`/pre-coaching/${meeting.id}`}
          className="font-mono text-[10px] tracking-[0.22em] uppercase text-text-secondary underline underline-offset-[3px] decoration-[0.5px] hover:text-text"
        >
          Pre-coaching form →
        </Link>
        {upcomingCount > 1 && (
          <Link
            href="/meetings"
            className="font-mono text-[10px] tracking-[0.22em] uppercase text-text-muted hover:text-text"
          >
            All {upcomingCount} upcoming
          </Link>
        )}
      </div>
    </div>
  );
}
