'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import MutedMono from '@/components/ui/MutedMono';

type Meeting = {
  id: number;
  starts_at: string;
  ends_at: string;
  reschedule_requested_at: string | null;
  coach_name: string;
  cal_com_reschedule_url: string | null;
};

function formatFull(iso: string) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
    time: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
  };
}

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
    return <p className="text-[13px] text-text-muted">Loading…</p>;
  }

  if (meetings.length === 0) {
    return <p className="text-[13px] text-text-muted">No upcoming sessions.</p>;
  }

  return (
    <div className="space-y-3">
      {meetings.map(m => {
        const { date, time } = formatFull(m.starts_at);
        return (
          <Card key={m.id}>
            {m.reschedule_requested_at && (
              <MutedMono className="block mb-2 text-accent">Coach requested a reschedule</MutedMono>
            )}
            <div className="flex items-baseline justify-between gap-3">
              <div>
                <p className="text-[15px] text-text font-medium">{date}</p>
                <p className="text-[13px] text-text-muted mt-0.5">{time} with {m.coach_name.split(' ')[0]}</p>
              </div>
              {m.cal_com_reschedule_url && (
                <a
                  href={m.cal_com_reschedule_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[12px] text-text-secondary hover:text-text underline"
                >
                  Reschedule
                </a>
              )}
            </div>
            <div className="mt-3 border-t border-border pt-2">
              <Link
                href={`/pre-coaching/${m.id}`}
                className="text-[12px] text-text-secondary hover:text-text underline"
              >
                Pre-coaching form →
              </Link>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
