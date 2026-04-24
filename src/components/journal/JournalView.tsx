'use client';

import { useState, useMemo } from 'react';
import MutedMono from '@/components/ui/MutedMono';
import ReflectionModal from './ReflectionModal';

// Split a new-format body into sections using `**Heading:**` markers.
// Each section becomes a mono-caps label + sans-serif paragraph (the same
// typographic treatment as the pre-coaching form answers). Text before the
// first heading becomes a leading label-less section. Trailing punctuation
// on the heading (`:` or `—`) is stripped so the uppercase label reads
// cleanly.
function parseBodySections(body: string): { heading: string | null; text: string }[] {
  const sections: { heading: string | null; text: string }[] = [];
  const regex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let currentHeading: string | null = null;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(body)) !== null) {
    const before = body.slice(lastIndex, match.index).trim();
    if (before || currentHeading) {
      sections.push({ heading: currentHeading, text: before });
    }
    currentHeading = match[1].replace(/[\s:—-]+$/, '').trim();
    lastIndex = regex.lastIndex;
  }
  const remaining = body.slice(lastIndex).trim();
  if (remaining || currentHeading) {
    sections.push({ heading: currentHeading, text: remaining });
  }
  return sections;
}

export type Responses = {
  // New single-body format written by the redesigned reflection surface.
  body?: string;
  // Legacy 4-field format — kept so old entries still render.
  well?: string;
  challenge?: string;
  learn?: string;
  tomorrow?: string;
};

export interface JournalEntry {
  id: string;
  date: string; // YYYY-MM-DD
  responses: Responses;
  rating?: number;
  commitmentsWon?: number;
  commitmentsTotal?: number;
}

interface Props {
  entries: JournalEntry[];
  today?: string;
  ratingLabel?: string | null;
  onCreate?: (well: string) => Promise<void>;
  onEdited?: () => void;
}

const PROMPTS: Array<{ key: keyof Responses; label: string }> = [
  { key: 'well', label: 'What went well today?' },
  { key: 'challenge', label: 'What was challenging?' },
  { key: 'learn', label: 'What did you learn or notice?' },
  { key: 'tomorrow', label: 'What will you focus on tomorrow?' },
];

function noonDate(iso: string) {
  return new Date(iso + 'T12:00:00');
}

function weekday(iso: string) {
  return noonDate(iso).toLocaleDateString('en-US', { weekday: 'long' });
}
function longDate(iso: string) {
  return noonDate(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}
function monthShort(iso: string) {
  return noonDate(iso).toLocaleDateString('en-US', { month: 'short' });
}
function dayNum(iso: string) {
  return noonDate(iso).getDate().toString();
}

function daysAgoLabel(entryIso: string, todayIso?: string): string {
  if (!todayIso) return '';
  const d1 = noonDate(entryIso).getTime();
  const d2 = noonDate(todayIso).getTime();
  const diffDays = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 0) return 'Upcoming';
  return `${diffDays} days ago`;
}

function RatingBars({ rating }: { rating: number }) {
  const filled = Math.round(rating);
  return (
    <div className="inline-flex items-end gap-[3px]">
      {[1, 2, 3, 4, 5].map(n => (
        <span
          key={n}
          className={`block w-[3px] h-[10px] ${
            n <= filled ? 'bg-[var(--color-accent)]' : 'bg-border'
          }`}
        />
      ))}
    </div>
  );
}

function ComposePanel({
  onCreate,
  onCancel,
}: {
  onCreate: (well: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!draft.trim()) return;
    setSaving(true);
    await onCreate(draft.trim());
    setSaving(false);
  };

  return (
    <article>
      <h2 className="font-display text-[28px] font-light tracking-[-0.01em] leading-[1.1] text-text">
        Today
      </h2>
      <MutedMono className="block mt-2 mb-8">A small mark for today</MutedMono>

      <div className="py-5 border-t border-border">
        <MutedMono className="block mb-3">What went well today?</MutedMono>
        <textarea
          autoFocus
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder="Today I noticed…"
          rows={6}
          className="w-full font-display text-[18px] font-light leading-[1.6] text-text bg-transparent border-0 outline-none resize-y px-0 py-0"
        />
      </div>

      <div className="mt-6 flex items-center gap-3 flex-wrap">
        <button
          onClick={save}
          disabled={!draft.trim() || saving}
          className="px-[18px] py-[10px] border border-[var(--color-accent)] bg-[var(--color-accent)] text-[#FCFBF9] rounded-full font-mono text-[11px] tracking-[0.14em] uppercase disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          onClick={onCancel}
          className="px-[18px] py-[10px] border border-[var(--color-border-strong)] bg-transparent text-text rounded-full font-mono text-[11px] tracking-[0.14em] uppercase"
        >
          Cancel
        </button>
      </div>
    </article>
  );
}

export default function JournalView({ entries, today, ratingLabel, onCreate, onEdited }: Props) {
  // Past entries can have a rating number even if the user hasn't picked a
  // current label (e.g., legacy data). Fall back to a neutral word just for
  // display so the "… · X/5" line stays readable.
  const displayLabel = ratingLabel || 'quality';
  const hasTodayEntry = !!today && entries.some(e => e.date === today);
  const canCompose = !!onCreate && !!today && !hasTodayEntry;

  // Open compose by default when no entries exist yet and today is writable.
  const [composing, setComposing] = useState(entries.length === 0 && canCompose);
  const [selectedId, setSelectedId] = useState<string | null>(entries[0]?.id ?? null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const selected = useMemo(
    () => entries.find(e => e.id === selectedId) ?? entries[0] ?? null,
    [entries, selectedId]
  );
  const editing = useMemo(
    () => (editingId ? entries.find(e => e.id === editingId) ?? null : null),
    [entries, editingId]
  );

  const pickEntry = (id: string) => {
    setComposing(false);
    setSelectedId(id);
  };

  return (
    <div>
      {/* Mobile: page eyebrow + h1 (weekday of selected entry) */}
      {selected && !composing && (
        <div className="md:hidden mb-5 flex items-start justify-between gap-4">
          <div>
            <MutedMono>Journal · Timeline</MutedMono>
            <h1 className="font-display text-[30px] mt-2 leading-[1.1] font-light">
              {weekday(selected.date)}
            </h1>
          </div>
          {canCompose && (
            <button
              onClick={() => setComposing(true)}
              aria-label="New entry today"
              className="w-10 h-10 rounded-full bg-[var(--color-accent)] text-[#FCFBF9] flex items-center justify-center hover:bg-[var(--color-accent-dark)] transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
                <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>
      )}

      {entries.length === 0 && !canCompose ? (
        <div className="rounded-[14px] border border-border bg-bg p-[22px]">
          <p className="font-display italic text-[17px] leading-[1.5] text-text-secondary">
            No entries yet.
          </p>
        </div>
      ) : (
        <div className="md:grid md:grid-cols-[180px_1fr] md:gap-10">
          {/* Mobile: horizontal chip rail */}
          <nav className="md:hidden -mx-6 px-6 mb-6 overflow-x-auto">
            <div className="flex gap-1 min-w-max pb-2">
              {entries.map(e => {
                const active = !composing && selected?.id === e.id;
                return (
                  <button
                    key={e.id}
                    onClick={() => pickEntry(e.id)}
                    className={`flex flex-col items-center text-center px-[14px] py-[8px] rounded-[10px] transition-colors ${
                      active
                        ? 'border border-[var(--color-accent)] bg-[var(--color-accent-light)]'
                        : 'border border-transparent'
                    }`}
                  >
                    <span className={`text-[22px] font-light leading-none tracking-[-0.01em] ${active ? 'text-[var(--color-accent)]' : 'text-text-muted'}`}>
                      {dayNum(e.date)}
                    </span>
                    <span className={`font-mono text-[9px] tracking-[0.22em] uppercase mt-[4px] ${active ? 'text-[var(--color-accent)]' : 'text-text-muted'}`}>
                      {monthShort(e.date)}
                    </span>
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Desktop: sticky left rail */}
          <nav className="hidden md:block md:sticky md:top-10 md:self-start md:max-h-[calc(100dvh-80px)] md:overflow-y-auto">
            <MutedMono className="block mb-4">All entries</MutedMono>
            <div className="flex flex-col">
              {entries.map(e => {
                const active = !composing && selected?.id === e.id;
                return (
                  <button
                    key={e.id}
                    onClick={() => pickEntry(e.id)}
                    className="text-left py-3 border-t border-border first:border-t-0"
                  >
                    <div className="flex items-baseline gap-[8px]">
                      <span className={`text-[22px] font-light leading-none tracking-[-0.01em] ${active ? 'text-text' : 'text-text-muted'}`}>
                        {dayNum(e.date)}
                      </span>
                      <span className={`font-mono text-[10px] tracking-[0.22em] uppercase ${active ? 'text-[var(--color-accent)]' : 'text-text-muted'}`}>
                        {monthShort(e.date)}
                      </span>
                    </div>
                    <span className={`font-mono text-[9px] tracking-[0.22em] uppercase mt-[2px] block ${active ? 'text-text-secondary' : 'text-text-muted'}`}>
                      {daysAgoLabel(e.date, today)}
                    </span>
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Right column: compose panel or selected entry */}
          {composing && onCreate ? (
            <ComposePanel onCreate={onCreate} onCancel={() => setComposing(false)} />
          ) : (
            <article>
              {selected && (
                <>
                  <div className="hidden md:flex items-start justify-between gap-4">
                    <div>
                      <h2 className="font-display text-[28px] font-light tracking-[-0.01em] leading-[1.1] text-text">
                        {weekday(selected.date)}
                      </h2>
                      <MutedMono className="block mt-2">
                        {longDate(selected.date)}
                      </MutedMono>
                    </div>
                    {canCompose && (
                      <button
                        onClick={() => setComposing(true)}
                        aria-label="New entry today"
                        className="w-10 h-10 rounded-full bg-[var(--color-accent)] text-[#FCFBF9] flex items-center justify-center text-[22px] leading-none hover:bg-[var(--color-accent-dark)] transition-colors"
                      >
                        +
                      </button>
                    )}
                  </div>

                  {(typeof selected.rating === 'number' ||
                    typeof selected.commitmentsWon === 'number') && (
                    <div className="flex items-center gap-5 mt-4 flex-wrap">
                      {typeof selected.rating === 'number' && (
                        <div className="flex items-center gap-[10px]">
                          <MutedMono>
                            {displayLabel} · {selected.rating}/5
                          </MutedMono>
                          <RatingBars rating={selected.rating} />
                        </div>
                      )}
                      {typeof selected.commitmentsWon === 'number' &&
                        typeof selected.commitmentsTotal === 'number' && (
                          <MutedMono>
                            {selected.commitmentsWon}/{selected.commitmentsTotal} won
                          </MutedMono>
                        )}
                    </div>
                  )}

                  <div className="mt-8">
                    {/* New-format: parse **Heading:** markers into mono-caps
                        labels + sans-serif body, matching the pre-coaching
                        form layout. Text before the first heading renders
                        label-less. */}
                    {selected.responses.body && selected.responses.body.trim() &&
                      parseBodySections(selected.responses.body).map((s, i) => (
                        <div key={`b-${i}`} className="py-5 border-t border-border first:border-t-0">
                          {s.heading && <MutedMono className="block mb-3">{s.heading}</MutedMono>}
                          {s.text && (
                            <p className="text-[15px] text-text whitespace-pre-wrap leading-[1.55] font-light">
                              {s.text}
                            </p>
                          )}
                        </div>
                      ))}

                    {/* Legacy format: four prompts with the same sans-serif
                        body treatment. */}
                    {PROMPTS.map(p => {
                      const answer = selected.responses[p.key];
                      if (!answer || !answer.trim()) return null;
                      return (
                        <div key={p.key} className="py-5 border-t border-border first:border-t-0">
                          <MutedMono className="block mb-3">{p.label}</MutedMono>
                          <p className="text-[15px] text-text whitespace-pre-wrap leading-[1.55] font-light">
                            {answer}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-6 pt-5 border-t border-border">
                    <button
                      onClick={() => setEditingId(selected.id)}
                      className="font-mono text-[10px] tracking-[0.22em] uppercase text-text-muted hover:text-[var(--color-accent)] transition-colors"
                    >
                      Edit entry
                    </button>
                  </div>
                </>
              )}
            </article>
          )}
        </div>
      )}

      {editing && (
        <ReflectionModal
          date={editing.date}
          existingReflection={JSON.stringify(editing.responses)}
          existingRating={editing.rating ?? 0}
          ratingLabel={ratingLabel ?? null}
          onClose={() => setEditingId(null)}
          onSaved={() => {
            if (onEdited) onEdited();
          }}
        />
      )}
    </div>
  );
}
