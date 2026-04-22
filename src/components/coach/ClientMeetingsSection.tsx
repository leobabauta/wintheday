'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import MutedMono from '@/components/ui/MutedMono';

type Meeting = {
  id: number;
  starts_at: string;
  reschedule_requested_at: string | null;
  cal_com_reschedule_url: string | null;
};

function formatFull(iso: string) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    time: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
  };
}

export default function ClientMeetingsSection({ clientId }: { clientId: number }) {
  const [meetings, setMeetings] = useState<Meeting[] | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    const res = await fetch(`/api/meetings?client_id=${clientId}&include_completed=1`);
    if (res.ok) setMeetings(await res.json());
    else setMeetings([]);
  };

  useEffect(() => { load(); }, [clientId]);

  const requestReschedule = async (id: number) => {
    setSubmitting(true);
    const res = await fetch(`/api/meetings/${id}/request-reschedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note: note.trim() || undefined }),
    });
    setSubmitting(false);
    if (res.ok) {
      setOpenId(null);
      setNote('');
      await load();
    } else {
      alert('Failed to request reschedule.');
    }
  };

  const now = Date.now();
  const upcoming = (meetings ?? []).filter((m) => new Date(m.starts_at).getTime() >= now);
  const past = (meetings ?? [])
    .filter((m) => new Date(m.starts_at).getTime() < now)
    .reverse(); // API returns ASC; show newest past first.

  return (
    <Card>
      <MutedMono className="block mb-4">Upcoming Sessions</MutedMono>
      {meetings === null ? (
        <p className="text-[13px] text-text-muted">Loading…</p>
      ) : upcoming.length === 0 ? (
        <p className="text-[13px] text-text-muted">No upcoming sessions.</p>
      ) : (
        <div className="space-y-3">
          {upcoming.slice(0, 5).map((m) => {
            const { date, time } = formatFull(m.starts_at);
            const isOpen = openId === m.id;
            return (
              <div key={m.id} className="border-b border-border last:border-0 pb-3 last:pb-0">
                <div className="flex items-baseline justify-between gap-3">
                  <div>
                    <p className="text-[14px] text-text">
                      {date} · {time}
                    </p>
                    {m.reschedule_requested_at && (
                      <MutedMono className="block text-accent mt-0.5">
                        Reschedule requested {new Date(m.reschedule_requested_at).toLocaleDateString()}
                      </MutedMono>
                    )}
                    <Link
                      href={`/dashboard/clients/${clientId}/sessions/${m.id}`}
                      className="font-mono text-[10px] tracking-[0.22em] uppercase text-text-secondary hover:text-text underline underline-offset-[3px] decoration-[0.5px] inline-block mt-1"
                    >
                      Open session →
                    </Link>
                  </div>
                  {!isOpen && (
                    <Button variant="text" size="sm" onClick={() => setOpenId(m.id)}>
                      Request reschedule
                    </Button>
                  )}
                </div>
                {isOpen && (
                  <div className="mt-3 space-y-2">
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Optional note to the client…"
                      rows={3}
                      className="w-full text-[13px] p-2 rounded-[8px] border border-border bg-bg"
                    />
                    <div className="flex gap-2 justify-end">
                      <Button variant="text" size="sm" onClick={() => { setOpenId(null); setNote(''); }}>
                        Cancel
                      </Button>
                      <Button size="sm" onClick={() => requestReschedule(m.id)} disabled={submitting}>
                        {submitting ? 'Sending…' : 'Send request'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {past.length > 0 && (
        <>
          <MutedMono className="block mt-6 mb-3 pt-4 border-t border-border">Past sessions</MutedMono>
          <div className="space-y-2">
            {past.slice(0, 10).map((m) => {
              const { date, time } = formatFull(m.starts_at);
              return (
                <Link
                  key={m.id}
                  href={`/dashboard/clients/${clientId}/sessions/${m.id}`}
                  className="flex items-baseline justify-between gap-3 py-1.5 group"
                >
                  <p className="text-[14px] text-text-secondary group-hover:text-text transition-colors">
                    {date} · {time}
                  </p>
                  <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-text-muted group-hover:text-text transition-colors">
                    Open →
                  </span>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </Card>
  );
}
