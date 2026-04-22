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
  const [sending, setSending] = useState(false);

  if (acknowledged) {
    const when = acknowledgedAt ? new Date(acknowledgedAt).toLocaleDateString() : '';
    return (
      <div>
        <MutedMono className="text-accent">Thanked {clientFirstName}{when ? ` · ${when}` : ''}</MutedMono>
      </div>
    );
  }

  const send = async () => {
    setSending(true);
    try {
      const res = await fetch(`/api/pre-coaching-logs/${logId}/acknowledge`, { method: 'POST' });
      if (!res.ok) throw new Error('ack failed');
      setAcknowledged(true);
    } catch (err) {
      console.error('Acknowledge failed:', err);
      alert('Could not send thank-you. Try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <Button size="sm" onClick={send} disabled={sending}>
        {sending ? 'Sending…' : 'Acknowledge & thank'}
      </Button>
      <MutedMono>Sends a thank-you message to {clientFirstName}.</MutedMono>
    </div>
  );
}
