'use client';

/**
 * Daily Reflection — full-screen "paper journal" writing surface.
 *
 * Replaces the previous centered modal with a full-screen page that matches
 * the ZHD visual language used across the rest of the app: one rotating
 * Fraunces italic prompt, unframed textarea on warm paper, optional nudge
 * chips that insert soft headings into the flow, and a quiet 5-dot
 * inner-peace rating. Autosaves to /api/journal.
 *
 * Props and onSaved contract are unchanged from the previous modal so this
 * is a drop-in replacement for both call sites:
 *   - src/components/journal/JournalView.tsx (edit existing entry)
 *   - src/components/wins/DailyWins.tsx     (write today's reflection)
 *
 * Backward-compat: parses the legacy JSON payload
 *   { well, challenge, learn, tomorrow }
 * into a single `body` field. New entries are saved as
 *   { body: "…" }
 * JournalView.tsx's PROMPTS-based renderer still shows legacy entries
 * correctly; new entries will appear as a single "body" block. If you want
 * JournalView to render the new `body` too, add a short adapter (see
 * HANDOFF.md step 2).
 */

import { useState, useRef, useCallback, useEffect, useMemo, type ReactNode } from 'react';

const PROMPTS = [
  "What's alive in you tonight?",
  'How did today land?',
  'What moved through you today?',
  'What are you carrying into tomorrow?',
];

// Buttons keep their short casual labels; when clicked we insert the fuller,
// colon-terminated prompt wrapped in `**` so it renders bold both while
// editing (via the mirror overlay) and in the read-only journal view.
const NUDGES = [
  { key: 'well',     label: 'what went well',     heading: 'What went well:' },
  { key: 'hard',     label: 'what was hard',      heading: 'What was challenging:' },
  { key: 'noticed',  label: 'what you noticed',   heading: 'What you learned or noticed:' },
  { key: 'tomorrow', label: 'tomorrow',           heading: 'Tomorrow I will:' },
];

// Split a plain-text body into React nodes, rendering `**…**` spans in bold.
// Used by the mirror overlay so the inserted prompts look bold while the
// textarea (transparent text, visible caret) sits on top.
function highlightBold(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const regex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let idx = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    parts.push(
      <strong key={`b-${idx++}`} className="font-semibold text-text">
        {match[1]}
      </strong>,
    );
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

interface Props {
  date: string;                // YYYY-MM-DD
  existingReflection: string;  // JSON string; legacy or { body }
  existingRating: number;
  // null when the user hasn't picked a daily quality yet. Modal hides the
  // rating section entirely in that case — they can still journal.
  ratingLabel: string | null;
  onClose: () => void;
  onSaved: (content: string, rating: number) => void;
}

function parseContent(content: string): { body: string } {
  if (!content) return { body: '' };
  try {
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed === 'object') {
      // New shape
      if (typeof parsed.body === 'string') return { body: parsed.body };
      // Legacy { well, challenge, learn, tomorrow } — concat into body.
      const parts: string[] = [];
      if (parsed.well)      parts.push(parsed.well);
      if (parsed.challenge) parts.push((parts.length ? '\n\n' : '') + parsed.challenge);
      if (parsed.learn)     parts.push((parts.length ? '\n\n' : '') + parsed.learn);
      if (parsed.tomorrow)  parts.push((parts.length ? '\n\n' : '') + parsed.tomorrow);
      return { body: parts.join('').trim() };
    }
  } catch {
    // Non-JSON legacy — treat as plain body.
  }
  return { body: content };
}

function todayReadable(dateIso: string) {
  const d = new Date(dateIso + 'T12:00:00');
  const weekday = d.toLocaleDateString('en-US', { weekday: 'long' });
  const month = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  return `${weekday} · ${month}`;
}

export default function ReflectionModal({
  date,
  existingReflection,
  existingRating,
  ratingLabel,
  onClose,
  onSaved,
}: Props) {
  const [body, setBody] = useState(() => parseContent(existingReflection).body);
  const [rating, setRating] = useState(existingRating);
  const [saved, setSaved] = useState(true);

  // Pick a prompt once per mount so the question doesn't shuffle as they type.
  const promptIdx = useMemo(() => Math.floor(Math.random() * PROMPTS.length), []);
  const textRef = useRef<HTMLTextAreaElement | null>(null);
  const mirrorRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = useCallback(
    async (nextBody: string, nextRating: number) => {
      try {
        const content = JSON.stringify({ body: nextBody });
        await fetch('/api/journal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date, content, rating: nextRating }),
        });
        setSaved(true);
        onSaved(content, nextRating);
      } catch {
        /* retry on next change */
      }
    },
    [date, onSaved],
  );

  // Autosave 1.4s after last keystroke.
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!body && !rating) return;
    setSaved(false);
    timerRef.current = setTimeout(() => save(body, rating), 1400);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [body, rating]);

  // Flush on unmount if there's a pending save.
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        void save(body, rating);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDone = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      void save(body, rating);
    }
    onClose();
  };

  const insertNudge = (heading: string) => {
    // Wrap the heading in `**…**` so the mirror overlay + read views can bold
    // just the prompt, not the text typed after the colon.
    const wrapped = `**${heading}**`;
    const next = (body.trimEnd() + '\n\n' + wrapped + '\n').replace(/^\n+/, '');
    setBody(next);
    requestAnimationFrame(() => {
      const ta = textRef.current;
      if (ta) {
        ta.focus();
        const pos = next.length;
        ta.setSelectionRange(pos, pos);
        ta.scrollTop = ta.scrollHeight;
        if (mirrorRef.current) mirrorRef.current.scrollTop = ta.scrollTop;
      }
    });
  };

  // Lock body scroll while open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Esc to close.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleDone();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-bg overflow-y-auto animate-reflect-in">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 pt-[18px] pb-1 whitespace-nowrap">
        <button
          onClick={handleDone}
          className="font-sans text-[13px] text-text-muted hover:text-text transition-colors whitespace-nowrap"
        >
          ← Today
        </button>
        <div className="flex items-center gap-[14px]">
          <span
            className={`font-mono text-[10px] tracking-[0.22em] uppercase text-text-muted transition-opacity duration-200 ${
              saved && (body || rating) ? 'opacity-100' : 'opacity-0'
            }`}
          >
            saved
          </span>
          <button
            onClick={handleDone}
            className="font-sans text-[13px] text-[var(--color-accent)] hover:opacity-80 transition-opacity"
          >
            Done
          </button>
        </div>
      </div>

      {/* Paper */}
      <div className="max-w-[620px] w-full mx-auto px-7 pt-9 pb-12 md:px-12 md:pt-14 md:pb-16">
        <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-text-muted mb-[10px]">
          {todayReadable(date)}
        </p>

        <h1 className="font-display italic font-light text-[30px] md:text-[38px] leading-[1.22] tracking-[-0.01em] text-text text-pretty mb-7 md:mb-9">
          {PROMPTS[promptIdx]}
        </h1>

        {/* Mirror overlay: renders the current body with `**…**` spans as bold,
            sitting underneath a transparent-text textarea. The textarea owns
            selection, caret and native keyboard handling; the mirror just
            shows the formatting. Identical font metrics + padding are load-
            bearing — any divergence and wrapping drifts. */}
        <div className="relative min-h-[180px] md:min-h-[240px]">
          <div
            ref={mirrorRef}
            aria-hidden
            className="
              pointer-events-none absolute inset-0
              whitespace-pre-wrap break-words
              font-sans font-light text-[17px] md:text-[18px] leading-[1.75] text-text
              overflow-y-auto max-h-[44vh] md:max-h-[52vh]
              [&::-webkit-scrollbar]:hidden [scrollbar-width:none]
            "
          >
            {highlightBold(body)}
            {' '}
          </div>
          <textarea
            ref={textRef}
            value={body}
            onChange={e => setBody(e.target.value)}
            onScroll={e => {
              if (mirrorRef.current) {
                mirrorRef.current.scrollTop = e.currentTarget.scrollTop;
              }
            }}
            autoFocus
            placeholder="A sentence. A paragraph. A page. Whatever wants to come out."
            className="
              relative w-full bg-transparent border-0 outline-none resize-none p-0
              font-sans font-light text-[17px] md:text-[18px] leading-[1.75]
              text-transparent
              placeholder:italic placeholder:text-text-muted placeholder:opacity-70
              caret-[var(--color-accent)]
              min-h-[180px] md:min-h-[240px] max-h-[44vh] md:max-h-[52vh]
              overflow-y-auto
            "
          />
        </div>

        {/* Nudge chips */}
        <div className="flex flex-wrap items-center gap-2 mt-7 pt-5 border-t border-border">
          <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-text-muted mr-1">
            if stuck —
          </span>
          {NUDGES.map(n => (
            <button
              key={n.key}
              type="button"
              onClick={() => insertNudge(n.heading)}
              className="
                font-sans text-[12px] text-text-muted
                border border-border rounded-full px-3 py-[6px]
                hover:text-text hover:border-text-muted
                transition-colors
              "
            >
              {n.label}
            </button>
          ))}
        </div>

        {/* Daily quality rating — hidden until the user has picked a quality. */}
        {ratingLabel && (
        <div className="mt-9 pt-6 border-t border-border">
          <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-text-muted mb-3">
            {ratingLabel} today
          </p>
          <div className="flex items-center gap-[14px]">
            {[1, 2, 3, 4, 5].map(n => {
              const on = n <= rating;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n === rating ? 0 : n)}
                  aria-label={`${ratingLabel} ${n} of 5`}
                  className={`
                    w-[14px] h-[14px] rounded-full border-[1.25px] p-0 transition-all
                    ${on
                      ? 'bg-[var(--color-accent)] border-[var(--color-accent)]'
                      : 'bg-transparent border-border hover:border-text-muted'
                    }
                  `}
                />
              );
            })}
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
