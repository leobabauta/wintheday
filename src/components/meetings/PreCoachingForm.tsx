'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import MutedMono from '@/components/ui/MutedMono';
import { PRE_COACHING_PROMPTS } from '@/lib/pre-coaching';

type Props = {
  meetingId: number;
  meetingStartsAt: string;
  coachName: string;
};

// ZHD pre-coaching: full-screen, no card wrappers around each prompt.
// Mono-caps prompt label, then a hairline-bordered textarea set in
// Fraunces italic — it should feel like writing in a journal, not a form.

export default function PreCoachingForm({ meetingId, meetingStartsAt, coachName }: Props) {
  const router = useRouter();
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/pre-coaching-logs?meeting_id=${meetingId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.log) {
          setResponses(data.log.responses || {});
          setSubmittedAt(data.log.submitted_at);
        }
      }
      setLoading(false);
    })();
  }, [meetingId]);

  const save = async (submit: boolean) => {
    setSaving(true);
    setStatusMsg('');
    const res = await fetch('/api/pre-coaching-logs', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ meeting_id: meetingId, responses, submit }),
    });
    setSaving(false);
    if (!res.ok) {
      setStatusMsg('Save failed');
      return;
    }
    if (submit) {
      setSubmittedAt(new Date().toISOString());
      setStatusMsg('Sent to your coach');
    } else {
      setStatusMsg('Draft saved');
      setTimeout(() => setStatusMsg(''), 2000);
    }
  };

  const startDate = new Date(meetingStartsAt).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });
  const startTime = new Date(meetingStartsAt).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit',
  });

  if (loading) return <MutedMono>Loading…</MutedMono>;

  return (
    <div>
      <button
        onClick={() => router.back()}
        className="font-mono text-[10px] tracking-[0.22em] uppercase text-text-secondary hover:text-text block mb-4"
      >
        ← Back
      </button>

      <MutedMono className="block mb-2">Pre-coaching log</MutedMono>
      <h1 className="font-display italic text-[28px] leading-[1.15] text-text tracking-[-0.005em]">
        A few notes before we meet.
      </h1>
      <MutedMono className="block mt-[10px] mb-7">
        For {startDate} · {startTime} with {coachName.split(' ')[0]}
      </MutedMono>

      {submittedAt && (
        <div className="mb-6 px-[14px] py-3 bg-[var(--color-accent-light)] border-l-2 border-[var(--color-accent)]">
          <MutedMono className="block text-[var(--color-accent)] mb-1">
            Sent {new Date(submittedAt).toLocaleString('en-US', {
              month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
            })}
          </MutedMono>
          <p className="text-[13px] text-text">
            You can still edit — any changes will be visible to your coach.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-[18px]">
        {PRE_COACHING_PROMPTS.map(p => (
          <div key={p.key}>
            <MutedMono className="block mb-2">{p.label}</MutedMono>
            <textarea
              value={responses[p.key] ?? ''}
              onChange={e => setResponses({ ...responses, [p.key]: e.target.value })}
              rows={3}
              placeholder="…"
              className="w-full px-0 py-[10px] border-0 border-t border-b border-border bg-transparent text-text font-display italic font-light text-[15px] leading-[1.55] resize-y outline-none focus:border-text-secondary"
            />
          </div>
        ))}
      </div>

      <div className="mt-7 flex items-center gap-3 flex-wrap">
        <button
          onClick={() => save(false)}
          disabled={saving}
          className="px-[18px] py-[10px] border border-[var(--color-border-strong)] bg-transparent text-text rounded-full font-mono text-[11px] tracking-[0.14em] uppercase disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save draft'}
        </button>
        <button
          onClick={() => save(true)}
          disabled={saving}
          className="px-[18px] py-[10px] border border-[var(--color-accent)] bg-[var(--color-accent)] text-[#FCFBF9] rounded-full font-mono text-[11px] tracking-[0.14em] uppercase disabled:opacity-60"
        >
          {submittedAt ? 'Update & resend' : 'Send to coach'}
        </button>
        {statusMsg && (
          <MutedMono className="text-text-muted">{statusMsg}</MutedMono>
        )}
      </div>
    </div>
  );
}
