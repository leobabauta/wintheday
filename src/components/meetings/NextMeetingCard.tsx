'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Eyebrow from '@/components/ui/Eyebrow';
import MutedMono from '@/components/ui/MutedMono';

type Meeting = {
  id: number;
  starts_at: string;
  ends_at: string;
  reschedule_requested_at: string | null;
  coach_name: string;
  cal_com_reschedule_url: string | null;
};



function formatStart(iso: string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return { date, time };
}

function daysUntil(iso: string): number {
  const now = new Date();
  const target = new Date(iso);
  const diffMs = target.getTime() - now.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export default function NextMeetingCard() {
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

  const { date, time } = formatStart(meeting.starts_at);
  const days = daysUntil(meeting.starts_at);
  const whenLabel = days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : date;
  const rescheduled = !!meeting.reschedule_requested_at;
  const urgent = days <= 1;

  return (
    <div className="mb-6">
      <Eyebrow>Next Session</Eyebrow>
      <Card accent={urgent}>
        {rescheduled && (
          <MutedMono className="block mb-2 text-accent">Coach requested a reschedule</MutedMono>
        )}
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <p className="text-[16px] text-text font-medium">{whenLabel}</p>
            <p className="text-[13px] text-text-muted mt-0.5">{time} with {meeting.coach_name.split(' ')[0]}</p>
          </div>
          {meeting.cal_com_reschedule_url && (
            <a
              href={meeting.cal_com_reschedule_url}
              target="_blank"
              rel="noreferrer"
              className="text-[12px] text-text-secondary hover:text-text underline"
            >
              Reschedule
            </a>
          )}
        </div>
        <div className="mt-3 border-t border-border pt-2 flex items-center justify-between gap-3">
          <Link
            href={`/pre-coaching/${meeting.id}`}
            className="text-[12px] text-text-secondary hover:text-text underline"
          >
            Pre-coaching form →
          </Link>
          {upcomingCount > 1 && (
            <Link href="/meetings" className="text-[11px] text-text-muted hover:text-text">
              All {upcomingCount} upcoming
            </Link>
          )}
        </div>
      </Card>
    </div>
  );
}
