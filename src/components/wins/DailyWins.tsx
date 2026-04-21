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
  reflection?: string;
  onToggle: (id: string) => Promise<void>;
  onAddCommitment: (title: string) => Promise<void>;
  onOpenReflection: () => void;
  rating?: string;
}

function Check({ size = 11 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" fill="none">
      <path d="M2 5L4 7L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Warm-variant checkbox row. Completed rows show a 24px filled-clay circle
// with a 4px accent-light halo ring.
function WinRow({ c, onToggle }: { c: Commitment; onToggle: (id: string) => void }) {
  return (
    <button
      onClick={() => onToggle(c.id)}
      className="w-full flex items-center gap-[14px] py-[12px] text-left transition-colors border-t border-border first:border-t-0"
    >
      <span
        className={`inline-flex w-[24px] h-[24px] rounded-full items-center justify-center flex-shrink-0 transition-all ${
          c.completed
            ? 'bg-[var(--color-accent)] border border-[var(--color-accent)] text-[#FCFBF9] ring-4 ring-[var(--color-accent-light)]'
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

const CARD = 'rounded-[14px] border border-border px-[22px] py-[14px] mb-3';
const CARD_BG = 'bg-bg';
const CARD_BG_WIN = 'bg-[var(--color-accent-light)]';

export default function DailyWins({
  userName, commitments, reflection, onToggle, onAddCommitment, onOpenReflection, rating = 'inner peace',
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
        <h1 className="font-display text-[28px] font-light tracking-[-0.01em] leading-[1.15] text-text">
          {greeting}{userName ? `, ${userName.split(' ')[0]}` : ''}.
        </h1>
      </div>

      {/* Next session — quiet, renders only when one exists */}
      <NextSessionCard />

      {/* Progress card */}
      <div className={`${CARD} ${allDone ? CARD_BG_WIN : CARD_BG}`}>
        <div className="flex items-baseline justify-between mb-[10px]">
          <MutedMono>Today&apos;s wins</MutedMono>
          <span className="font-mono text-[10px] tracking-[0.04em] text-text-muted">
            {doneCount}/{Math.max(1, total)}
          </span>
        </div>
        <div className="relative w-full h-[2px] bg-border overflow-hidden rounded-[1px]">
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

      {/* Commitments card */}
      {commits.length > 0 && (
        <div className={`${CARD} ${CARD_BG}`}>
          <MutedMono className="block mb-[6px]">Commitments</MutedMono>
          <div>
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
                <span className="inline-flex w-[24px] h-[24px] rounded-full border border-dashed border-[var(--color-border-strong)] items-center justify-center text-[14px] leading-none">+</span>
                <span className="text-[15px]">Add a commitment</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Practice card */}
      {practices.length > 0 && (
        <div className={`${CARD} ${CARD_BG}`}>
          <MutedMono className="block mb-[6px]">Practice</MutedMono>
          <div>
            {practices.map(c => <WinRow key={c.id} c={c} onToggle={onToggle} />)}
          </div>
        </div>
      )}

      {/* Reflection prompt card */}
      <button
        onClick={onOpenReflection}
        className={`${CARD} ${CARD_BG} w-full text-left block hover:bg-surface/40 transition-colors`}
      >
        <MutedMono className="block mb-[6px]">
          Daily reflection · {rating.toLowerCase()}
        </MutedMono>
        <p className={`font-display italic text-[16px] leading-[1.5] ${reflection ? 'text-text' : 'text-text-muted'}`}>
          {reflection || 'What would winning the day look like?'}
        </p>
      </button>
    </div>
  );
}
