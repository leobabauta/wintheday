'use client';

import { useState, useCallback } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Eyebrow from '@/components/ui/Eyebrow';
import MutedMono from '@/components/ui/MutedMono';

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

export default function DailyWins({
  userName, commitments, practice, reflection, onToggle, onAddCommitment, onOpenReflection, rating = 'Inner peace',
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
  const greeting = today.getHours() < 12 ? 'Morning' : today.getHours() < 18 ? 'Afternoon' : 'Evening';

  return (
    <div>
      <div className="mb-8">
        <MutedMono>
          {today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </MutedMono>
        <h1 className="font-display text-[28px] mt-2 leading-[1.1]">
          {greeting}, {userName.split(' ')[0]}.
        </h1>
        <p className="reflection-text text-[15px] text-text-secondary mt-2">
          A small enough day to win — {doneCount} of {commitments.length} so far.
        </p>
      </div>

      {/* Commitments */}
      <Eyebrow>Commitments</Eyebrow>
      <div className="border-t border-border mb-6">
        {commitments.map(c => (
          <button
            key={c.id}
            onClick={() => onToggle(c.id)}
            className={`w-full flex items-center gap-3 py-3.5 border-b border-border text-left transition-colors ${c.completed ? 'bg-accent-light/40 -mx-2 px-2' : ''}`}
          >
            <span
              className={`inline-block w-4 h-4 rounded-[3px] border flex-shrink-0 flex items-center justify-center ${
                c.completed ? 'bg-accent border-accent' : 'bg-transparent border-border-strong'
              }`}
            >
              {c.completed && (
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                  <path d="M1 4L3 6L7 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-bg" />
                </svg>
              )}
            </span>
            <span className={`text-[14px] ${c.completed ? 'text-text-secondary' : 'text-text'}`}>
              {c.title}
            </span>
          </button>
        ))}

        {adding ? (
          <div className="py-3.5 border-b border-border flex gap-2">
            <input
              autoFocus
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleAdd();
                if (e.key === 'Escape') { setDraft(''); setAdding(false); }
              }}
              placeholder="e.g., 20 min reading"
              className="flex-1 text-[14px]"
            />
            <Button variant="filled" size="sm" onClick={handleAdd} disabled={!draft.trim()}>Add</Button>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="w-full flex items-center gap-3 py-3.5 text-text-muted hover:text-text text-left"
          >
            <span className="inline-block w-4 h-4 rounded-[3px] border border-dashed border-border-strong flex items-center justify-center text-[12px] leading-none">+</span>
            <span className="text-[14px]">Add a commitment</span>
          </button>
        )}
      </div>

      {/* Practice */}
      {practice && (
        <>
          <Eyebrow>Practice</Eyebrow>
          <p className="reflection-text text-[18px] text-text mb-8">
            {practice}
          </p>
        </>
      )}

      {/* Reflection prompt */}
      <button onClick={onOpenReflection} className="w-full text-left">
        <Card muted className="hover:bg-surface-hover transition-colors">
          <MutedMono>Tonight&apos;s reflection · {rating.toLowerCase()}</MutedMono>
          <p className={`reflection-text text-[15px] mt-2 ${reflection ? 'text-text' : 'text-text-muted'}`}>
            {reflection || `What would winning the day look like?`}
          </p>
        </Card>
      </button>
    </div>
  );
}
