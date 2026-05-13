'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function JournalEntryHeart({
  entryId,
  hearted,
}: {
  entryId: number;
  hearted: boolean;
}) {
  const router = useRouter();
  // Optimistic flag so the heart fills instantly. Server-side state is the
  // source of truth on next render — repeated taps are no-ops on the API
  // side (COALESCE preserves the first timestamp) so this is safe.
  const [localHearted, setLocalHearted] = useState(hearted);
  const [busy, setBusy] = useState(false);

  if (localHearted) {
    return (
      <span
        className="inline-flex items-center gap-[6px] text-accent text-[11px] font-mono tracking-[0.22em] uppercase"
        title="You hearted this"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
        Hearted
      </span>
    );
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        setLocalHearted(true);
        try {
          await fetch('/api/journal', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: [entryId], heart: true }),
          });
          router.refresh();
        } finally {
          setBusy(false);
        }
      }}
      className="inline-flex items-center gap-[6px] text-text-muted hover:text-accent transition-colors text-[11px] font-mono tracking-[0.22em] uppercase disabled:opacity-50"
      title="Send a heart to the client"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
      Send heart
    </button>
  );
}
