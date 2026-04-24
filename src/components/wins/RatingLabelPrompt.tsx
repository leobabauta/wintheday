'use client';

import { useState } from 'react';
import MutedMono from '@/components/ui/MutedMono';

interface Props {
  onSet: (label: string) => void;
}

export default function RatingLabelPrompt({ onSet }: Props) {
  const [label, setLabel] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const trimmed = label.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating_label: trimmed }),
      });
      if (res.ok) onSet(trimmed);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-[14px] border border-[var(--color-accent)] bg-[var(--color-accent-light)] p-5 mb-6">
      <MutedMono className="text-[var(--color-accent-dark)]">One last thing</MutedMono>
      <p className="font-display text-[22px] font-light leading-[1.25] text-text mt-2">
        What do you want to measure each day?
      </p>
      <p className="text-[13px] text-text-secondary mt-2 reflection-text">
        One word or short phrase. You&apos;ll rate it nightly. &ldquo;Inner peace.&rdquo; &ldquo;Confidence.&rdquo; &ldquo;Joy.&rdquo; &ldquo;Presence.&rdquo;
      </p>
      <div className="flex gap-2 mt-4 flex-wrap">
        <input
          autoFocus
          value={label}
          onChange={e => setLabel(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') save(); }}
          placeholder="inner peace"
          className="flex-1 min-w-[180px] bg-transparent border-0 border-b border-[var(--color-border-strong)] focus:border-[var(--color-accent)] py-1 text-[16px] text-text outline-none transition-colors"
        />
        <button
          onClick={save}
          disabled={saving || !label.trim()}
          className="px-[18px] py-[8px] border border-[var(--color-accent)] bg-[var(--color-accent)] text-[#FCFBF9] rounded-full font-mono text-[11px] tracking-[0.14em] uppercase disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
      {label.trim() && (
        <p className="text-[12px] text-text-muted mt-3 italic reflection-text">
          Preview: &ldquo;How much did you experience{' '}
          <strong className="font-display not-italic">{label.trim()}</strong> today?&rdquo;
        </p>
      )}
    </div>
  );
}
