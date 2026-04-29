'use client';

import { useMemo, useState } from 'react';
import Button from '@/components/ui/Button';
import MutedMono from '@/components/ui/MutedMono';

// Short, varied templates. The coach gets one at random and can shuffle
// or edit before sending — the goal is to break the canned-feeling of
// the previous single hardcoded message without giving up the convenience.
const TEMPLATES = [
  (n: string, d: string) => `Got it, ${n} — thanks. See you ${d}.`,
  (n: string, d: string) => `Thanks for sending this ahead, ${n}. See you ${d}.`,
  (n: string, d: string) => `Read and noted, ${n}. Until ${d}.`,
  (n: string, d: string) => `Thanks for the prep, ${n}. Looking forward to ${d}.`,
  (n: string, d: string) => `Got it. Thanks, ${n} — see you ${d}.`,
  (n: string, d: string) => `Thanks ${n} — appreciate you sharing. See you ${d}.`,
];

function pickIndex(excluding?: number): number {
  if (TEMPLATES.length <= 1) return 0;
  let i = Math.floor(Math.random() * TEMPLATES.length);
  if (excluding !== undefined && i === excluding) {
    i = (i + 1) % TEMPLATES.length;
  }
  return i;
}

export default function AcknowledgeButton({
  logId,
  clientFirstName,
  sessionWeekday,
  initiallyAcknowledged,
  acknowledgedAt,
}: {
  logId: number;
  clientFirstName: string;
  sessionWeekday: string;
  initiallyAcknowledged: boolean;
  acknowledgedAt: string | null;
}) {
  const [acknowledged, setAcknowledged] = useState(initiallyAcknowledged);
  const [ackedAtLocal, setAckedAtLocal] = useState<string | null>(acknowledgedAt);
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState('');
  const [templateIdx, setTemplateIdx] = useState<number | null>(null);
  const [sending, setSending] = useState(false);

  // Stable initial template pick for first open of the composer.
  const initialIdx = useMemo(() => pickIndex(), []);

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

  const startCompose = () => {
    const idx = templateIdx ?? initialIdx;
    setTemplateIdx(idx);
    setDraft(TEMPLATES[idx](clientFirstName, sessionWeekday));
    setComposing(true);
  };

  const shuffle = () => {
    const next = pickIndex(templateIdx ?? undefined);
    setTemplateIdx(next);
    setDraft(TEMPLATES[next](clientFirstName, sessionWeekday));
  };

  const send = async () => {
    const content = draft.trim();
    if (!content) return;
    setSending(true);
    try {
      const res = await fetch(`/api/pre-coaching-logs/${logId}/acknowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
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

  if (!composing) {
    return (
      <div className="flex items-center gap-3 flex-wrap">
        <MutedMono className="text-text-secondary">Not yet thanked</MutedMono>
        <Button size="sm" onClick={startCompose}>Acknowledge & thank</Button>
        <MutedMono>Preview before sending.</MutedMono>
      </div>
    );
  }

  return (
    <div>
      <MutedMono className="block mb-2">Thank-you message · preview</MutedMono>
      <textarea
        value={draft}
        onChange={e => setDraft(e.target.value)}
        rows={3}
        className="w-full text-[14px] leading-[1.5] font-light"
      />
      <div className="flex items-center gap-3 mt-3 flex-wrap">
        <Button size="sm" onClick={send} disabled={sending || !draft.trim()}>
          {sending ? 'Sending…' : 'Send'}
        </Button>
        <button
          type="button"
          onClick={shuffle}
          disabled={sending}
          className="font-mono text-[10px] tracking-[0.22em] uppercase text-text-muted hover:text-text disabled:opacity-50"
        >
          ↻ Shuffle
        </button>
        <button
          type="button"
          onClick={() => setComposing(false)}
          disabled={sending}
          className="font-mono text-[10px] tracking-[0.22em] uppercase text-text-muted hover:text-text disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
