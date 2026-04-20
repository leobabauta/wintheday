'use client';

import { useState, useCallback } from 'react';
import MutedMono from '@/components/ui/MutedMono';
import NextSessionCard from '@/components/meetings/NextSessionCard';

interface Commitment {
  id: string;
  title: string;
  completed: boolean;
  type: 'commitment' | 'practice';
}

interface Props {
  userName: string;
  commitments: Commitment[];
  practice?: string;
  reflection?: string;
  onToggle: (id: string) => Promise<void>;
  onAddCommitment: (title: string) => Promise<void>;
  onOpenReflection: () => void;
  rating?: string;
}

function Check({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" fill="none">
      <path d="M2 5L4 7L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ZHD row — completed rows get a soft accent-light wash that bleeds past the
// container's horizontal padding. Borders on adjacent rows are suppressed so
// the wash reads as one unbroken strip.
function WinRow({ c, onToggle }: { c: Commitment; onToggle: (id: string) => void }) {
  return (
    <button
      onClick={() => onToggle(c.id)}
      className={`w-full flex items-center gap-[14px] py-[12px] text-left transition-colors border-t border-border first:border-t-0 ${
        c.completed
          ? 'bg-[var(--color-accent-light)]/50 -mx-2 px-2 border-t-transparent [&+*]:border-t-transparent'
          : ''
      }`}
    >
      <span
        className={`inline-flex w-[22px] h-[22px] rounded-full items-center justify-center flex-shrink-0 transition-colors ${
          c.completed
            ? 'bg-[var(--color-accent)] border border-[var(--color-accent)] text-white'
            : 'bg-transparent border border-[var(--color-border-strong)] text-transparent'
        }`}
      >
        {c.completed && <Check />}
      </span>
      <span
        className={`flex-1 text-[15px] leading-[1.4] ${
          c.completed
            ? 'text-text-muted line-through decoration-[0.5px] decoration-text-muted'
            : 'text-text'
        }`}
      >
        {c.title}
      </span>
      <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-text-muted">
        {c.type === 'commitment' ? 'Commit' : 'Practice'}
      </span>
    </button>
  );
}

// Flattened Today — no cards. Hairline-separated sections flow as one column.
// Section labels are mono-caps eyebrows; rows are hairline-divided.
// Section spacing carries the hierarchy, not bordered boxes.
export default function DailyWins({
  userName, commitments, practice, reflection, onToggle, onAddCommitment, onOpenReflection, rating = 'inner peace',
}: Props) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const today = new Date();

  const handleAdd = useCallback(async () => {
    if (!draft.trim()) return;
    await onAddCommitment(draft.trim());
    setDraft('');
    setAdding(false);
  }, [draft, onAddCommitment]);

  const doneCount = commitments.filter(c => c.completed).length;
  const total = commitments.length;
  const allDone = total > 0 && doneCount === total;
  const h = today.getHours();
  const greeting = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  const practices = commitments.filter(c => c.type === 'practice');
  const commits = commitments.filter(c => c.type !== 'practice');

  return (
    <div>
      {/* Header */}
      <div className="mb-7 mt-3">
        <MutedMono className="block mb-2">
          {today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </MutedMono>
        <h1 className="text-[28px] font-light tracking-[-0.01em] leading-[1.15] text-text">
          {greeting}{userName ? `, ${userName.split(' ')[0]}` : ''}.
        </h1>
      </div>

      {/* Next session — quiet, renders only when one exists */}
      <NextSessionCard />

      {/* Progress — tiny sliver line, no card */}
      <div className="mb-8">
        <div className="flex items-baseline justify-between mb-[10px]">
          <MutedMono>Today&apos;s wins</MutedMono>
          <span className="font-mono text-[10px] tracking-[0.04em] text-text-muted">
            {doneCount}/{Math.max(1, total)}
          </span>
        </div>
        <div className="relative w-full h-[1px] bg-border overflow-hidden">
          <div
            className="absolute top-0 left-0 h-full bg-[var(--color-accent)] transition-[width] duration-[480ms]"
            style={{ width: `${(doneCount / Math.max(1, total)) * 100}%` }}
          />
        </div>
        {allDone && (
          <p className="font-display italic text-[15px] text-[var(--color-accent)] mt-3">
            You won the day.
          </p>
        )}
      </div>

      {/* Commitments — hairline section, no card wrapper */}
      {commits.length > 0 && (
        <div className="mb-8">
          <MutedMono className="block mb-[10px]">Commitments</MutedMono>
          <div className="border-t border-b border-border">
            {commits.map(c => <WinRow key={c.id} c={c} onToggle={onToggle} />)}

            {adding ? (
              <div className="flex items-center gap-[10px] py-[12px] border-t border-border">
                <input
                  autoFocus
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleAdd();
                    if (e.key === 'Escape') { setDraft(''); setAdding(false); }
                  }}
                  onBlur={() => { if (!draft.trim()) setAdding(false); }}
                  placeholder="e.g., 20 min reading"
                  className="flex-1 text-[15px] bg-transparent border-0 outline-none px-0 py-0"
                />
                <button
                  onClick={handleAdd}
                  disabled={!draft.trim()}
                  className="font-mono text-[10px] tracking-[0.22em] uppercase text-[var(--color-accent)] disabled:text-text-muted"
                >
                  Add
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAdding(true)}
                className="w-full flex items-center gap-[14px] py-[12px] border-t border-border text-left text-text-muted hover:text-text transition-colors"
              >
                <span className="inline-flex w-[22px] h-[22px] rounded-full border border-dashed border-[var(--color-border-strong)] items-center justify-center text-[14px] leading-none">+</span>
                <span className="text-[15px]">Add a commitment</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Practice */}
      {practices.length > 0 && (
        <div className="mb-8">
          <MutedMono className="block mb-[10px]">Practice</MutedMono>
          <div className="border-t border-b border-border">
            {practices.map(c => <WinRow key={c.id} c={c} onToggle={onToggle} />)}
          </div>
        </div>
      )}

      {/* Reflection prompt — hairline block, no card */}
      <button
        onClick={onOpenReflection}
        className="w-full text-left block border-t border-b border-border py-[16px] hover:bg-surface/50 transition-colors"
      >
        <MutedMono className="block mb-[6px]">
          Tonight&apos;s reflection · {rating.toLowerCase()}
        </MutedMono>
        <p className={`font-display italic text-[16px] leading-[1.5] ${reflection ? 'text-text' : 'text-text-muted'}`}>
          {reflection || 'What would winning the day look like?'}
        </p>
      </button>
    </div>
  );
}
