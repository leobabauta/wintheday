'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import MutedMono from '@/components/ui/MutedMono';

export default function AcknowledgeButton({
  logId,
  clientFirstName,
  initiallyAcknowledged,
  acknowledgedAt,
}: {
  logId: number;
  clientFirstName: string;
  initiallyAcknowledged: boolean;
  acknowledgedAt: string | null;
}) {
  const [acknowledged, setAcknowledged] = useState(initiallyAcknowledged);
  const [ackedAtLocal, setAckedAtLocal] = useState<string | null>(acknowledgedAt);
  const [sending, setSending] = useState(false);

  if (acknowledged) {
    const when = ackedAtLocal
      ? new Date(ackedAtLocal).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : 'just now';
    return (
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.22em] uppercase text-accent">
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
            <path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Thanked {clientFirstName} · {when}
        </span>
      </div>
    );
  }

  const send = async () => {
    setSending(true);
    try {
      const res = await fetch(`/api/pre-coaching-logs/${logId}/acknowledge`, { method: 'POST' });
      if (!res.ok) throw new Error('ack failed');
      setAcknowledged(true);
      setAckedAtLocal(new Date().toISOString());
    } catch (err) {
      console.error('Acknowledge failed:', err);
      alert('Could not send thank-you. Try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <MutedMono className="text-text-secondary">Not yet thanked</MutedMono>
      <Button size="sm" onClick={send} disabled={sending}>
        {sending ? 'Sending…' : 'Acknowledge & thank'}
      </Button>
      <MutedMono>Sends a thank-you message to {clientFirstName}.</MutedMono>
    </div>
  );
}
