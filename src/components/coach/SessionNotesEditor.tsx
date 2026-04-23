'use client';

import { useEffect, useRef, useState } from 'react';
import Markdown from '@/components/ui/Markdown';
import MutedMono from '@/components/ui/MutedMono';

export default function SessionNotesEditor({
  meetingId,
  initialNotes,
}: {
  meetingId: number;
  initialNotes: string;
}) {
  const [notes, setNotes] = useState(initialNotes);
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const savedNotesRef = useRef(initialNotes);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

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
        setTimeout(() => setStatus((s) => (s === 'saved' ? 'idle' : s)), 1500);
      } catch (err) {
        console.error('Saving session notes failed:', err);
        setStatus('error');
      }
    }, 800);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [notes, meetingId]);

  useEffect(() => {
    if (editing) textareaRef.current?.focus();
  }, [editing]);

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      (e.target as HTMLTextAreaElement).blur();
    }
    if (e.key === 'Escape') {
      (e.target as HTMLTextAreaElement).blur();
    }
  };

  const hasContent = notes.trim().length > 0;

  return (
    <div>
      {editing ? (
        <textarea
          ref={textareaRef}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => setEditing(false)}
          onKeyDown={onKey}
          rows={12}
          placeholder="What came up, what you committed to, what to revisit next time…

Markdown supported: # heading, ## subheading, * bullet, **bold**"
          className="w-full text-[14px] leading-[1.55] font-light font-mono"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="w-full text-left min-h-[180px] rounded-[12px] border border-border bg-transparent p-3.5 cursor-text hover:border-border-strong transition-colors"
        >
          {hasContent ? (
            <Markdown text={notes} />
          ) : (
            <p className="text-[13px] text-text-muted italic">
              Click to add notes. Markdown supported — #, ##, ###, * bullets, **bold**.
            </p>
          )}
        </button>
      )}

      <div className="flex items-center justify-between mt-2 h-[14px]">
        <MutedMono>{editing ? '⌘↵ or Esc when done' : hasContent ? 'Click to edit' : ''}</MutedMono>
        <div>
          {status === 'saving' && (
            <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-text-muted">Saving…</span>
          )}
          {status === 'saved' && (
            <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-accent">Saved</span>
          )}
          {status === 'error' && (
            <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-destructive">
              Save failed — try again
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
