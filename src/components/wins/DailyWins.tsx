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

// Completed commitment rows get a soft accent-light wash that bleeds past the
// container's padding (via negative margin) — it feels like a small contentment,
// not a check-mark announcement.
function WinRow({ c, onToggle }: { c: Commitment; onToggle: (id: string) => void }) {
  return (
    <button
      onClick={() => onToggle(c.id)}
      className={`w-full flex items-center gap-[14px] py-[10px] text-left transition-colors border-t border-border first:border-t-0 ${
        c.completed
          ? 'bg-[var(--color-accent-light)] -mx-[22px] px-[22px] border-t-transparent [&+*]:border-t-transparent'
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
      <span className="font-mono text-[10px] tracking-[0.04em] uppercase text-text-muted">
        {c.type === 'commitment' ? 'Commit' : 'Practice'}
      </span>
    </button>
  );
}

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
        <p className="font-mono text-[11px] font-medium tracking-[0.22em] uppercase text-text-muted mb-2">
          {today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
        <h1 className="text-[26px] font-light tracking-[-0.01em] leading-[1.15]">
          {greeting}{userName ? `, ${userName.split(' ')[0]}` : ''}.
        </h1>
      </div>

      {/* Next session (quiet, only renders when one exists) */}
      <NextSessionCard />

      {/* Progress card */}
      <div className="bg-bg border border-border rounded-[14px] p-[22px] mb-3">
        <div className="flex items-baseline justify-between mb-3">
          <p className="font-mono text-[10px] font-medium tracking-[0.22em] uppercase text-text-muted">Today&apos;s wins</p>
          <span className="font-mono text-[10px] tracking-[0.04em] text-text-muted">{doneCount}/{Math.max(1,total)}</span>
        </div>
        <div className="relative w-full h-[2px] bg-border rounded-[1px] overflow-hidden">
          <div
            className="absolute top-0 left-0 h-full bg-[var(--color-accent)] transition-[width] duration-[480ms]"
            style={{ width: `${(doneCount / Math.max(1, total)) * 100}%` }}
          />
        </div>
        {allDone && (
          <p className="font-display italic text-[15px] text-[var(--color-accent)] mt-3">You won the day.</p>
        )}
      </div>

      {/* Commitments */}
      {commits.length > 0 && (
        <div className="bg-bg border border-border rounded-[14px] p-[22px] mb-3 overflow-hidden">
          <p className="font-mono text-[10px] font-medium tracking-[0.22em] uppercase text-text-muted mb-[10px]">Commitments</p>
          <div>
            {commits.map(c => <WinRow key={c.id} c={c} onToggle={onToggle} />)}

            {adding ? (
              <div className="flex items-center gap-[10px] py-[10px] border-t border-border">
                <input
                  autoFocus
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleAdd();
                    if (e.key === 'Escape') { setDraft(''); setAdding(false); }
                  }}
                  placeholder="e.g., 20 min reading"
                  className="flex-1 text-[15px] bg-transparent outline-none"
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
                className="w-full flex items-center gap-[14px] py-[10px] border-t border-border text-left text-text-muted hover:text-text"
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
        <div className="bg-bg border border-border rounded-[14px] p-[22px] mb-3 overflow-hidden">
          <p className="font-mono text-[10px] font-medium tracking-[0.22em] uppercase text-text-muted mb-[10px]">Practice</p>
          <div>
            {practices.map(c => <WinRow key={c.id} c={c} onToggle={onToggle} />)}
          </div>
        </div>
      )}

      {/* Reflection prompt */}
      <button onClick={onOpenReflection} className="w-full text-left">
        <div className="bg-bg border border-border rounded-[14px] p-[22px] hover:bg-surface-hover transition-colors">
          <p className="font-mono text-[10px] font-medium tracking-[0.22em] uppercase text-text-muted mb-2">
            Tonight&apos;s reflection · {rating.toLowerCase()}
          </p>
          <p className={`font-display italic text-[15px] ${reflection ? 'text-text' : 'text-text-muted'}`}>
            {reflection || 'What would winning the day look like?'}
          </p>
        </div>
      </button>
    </div>
  );
}
