'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import MutedMono from '@/components/ui/MutedMono';
import { PRE_COACHING_PROMPTS } from '@/lib/pre-coaching';

type Props = {
  meetingId: number;
  meetingStartsAt: string;
  coachName: string;
};

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

  if (loading) return <p className="text-[13px] text-text-muted">Loading…</p>;

  return (
    <div>
      <button
        onClick={() => router.back()}
        className="text-[13px] text-text-secondary hover:text-text block mb-3.5"
      >
        ← Back
      </button>
      <h1 className="font-display text-[28px] leading-[1.15] text-text">Pre-coaching log</h1>
      <p className="text-[13px] text-text-muted mt-1 mb-6">
        For your session with {coachName.split(' ')[0]} on {startDate} at {startTime}.
      </p>

      {submittedAt && (
        <Card accent className="mb-4">
          <MutedMono className="block">Sent {new Date(submittedAt).toLocaleString()}</MutedMono>
          <p className="text-[13px] text-text mt-1">
            You can still edit — any changes will be visible to your coach.
          </p>
        </Card>
      )}

      <div className="space-y-4">
        {PRE_COACHING_PROMPTS.map(p => (
          <Card key={p.key}>
            <label className="block">
              <MutedMono className="block mb-2">{p.label}</MutedMono>
              <textarea
                value={responses[p.key] ?? ''}
                onChange={e => setResponses({ ...responses, [p.key]: e.target.value })}
                rows={4}
                className="w-full text-[14px] p-2 rounded-[8px] border border-border bg-bg resize-y"
              />
            </label>
          </Card>
        ))}
      </div>

      <div className="flex items-center gap-3 mt-6">
        <Button variant="outline" size="md" onClick={() => save(false)} disabled={saving}>
          {saving ? 'Saving…' : 'Save draft'}
        </Button>
        <Button variant="filled" size="md" onClick={() => save(true)} disabled={saving}>
          {submittedAt ? 'Update & resend' : 'Send to coach'}
        </Button>
        {statusMsg && <span className="text-[12px] text-text-muted">{statusMsg}</span>}
      </div>
    </div>
  );
}
