'use client';

import { useEffect, useRef, useState } from 'react';

export default function SessionNotesEditor({
  meetingId,
  initialNotes,
}: {
  meetingId: number;
  initialNotes: string;
}) {
  const [notes, setNotes] = useState(initialNotes);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const savedNotesRef = useRef(initialNotes);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced autosave — writes 800ms after the last keystroke.
  useEffect(() => {
    if (notes === savedNotesRef.current) return;
    setStatus('saving');
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/meetings/${meetingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ coach_notes: notes }),
        });
        if (!res.ok) throw new Error('save failed');
        savedNotesRef.current = notes;
        setStatus('saved');
        setTimeout(() => {
          setStatus((s) => (s === 'saved' ? 'idle' : s));
        }, 1500);
      } catch (err) {
        console.error('Saving session notes failed:', err);
        setStatus('error');
      }
    }, 800);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [notes, meetingId]);

  return (
    <div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={10}
        placeholder="What came up, what you committed to, what to revisit next time…"
        className="w-full text-[14px] leading-[1.55] font-light"
      />
      <div className="flex justify-end mt-1.5 h-[14px]">
        {status === 'saving' && (
          <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-text-muted">
            Saving…
          </span>
        )}
        {status === 'saved' && (
          <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-accent">
            Saved
          </span>
        )}
        {status === 'error' && (
          <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-destructive">
            Save failed — try again
          </span>
        )}
      </div>
    </div>
  );
}
