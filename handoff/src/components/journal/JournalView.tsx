'use client';

import { useState } from 'react';
import Eyebrow from '@/components/ui/Eyebrow';
import MutedMono from '@/components/ui/MutedMono';
import Card from '@/components/ui/Card';

export interface JournalEntry {
  id: string;
  date: string; // YYYY-MM-DD
  text: string;
  rating?: number;
  commitmentsWon?: number;
  commitmentsTotal?: number;
}

interface Props {
  entries: JournalEntry[];
  onCreate?: (text: string) => Promise<void>;
  today?: string;
}

function weekdayOf(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' });
}
function dateShort(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function JournalView({ entries, onCreate, today }: Props) {
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState('');

  const hasTodayEntry = today && entries.some(e => e.date === today);

  return (
    <div>
      <div className="mb-8">
        <MutedMono>Journal</MutedMono>
        <h1 className="font-display text-[28px] mt-2 leading-[1.1]">Pages.</h1>
        <p className="reflection-text text-text-secondary text-[15px] mt-2">
          Each day, one small mark. No pressure to write much.
        </p>
      </div>

      {/* Compose today */}
      {today && !hasTodayEntry && (
        <Card muted className="mb-8">
          <MutedMono>Today · {dateShort(today)}</MutedMono>
          {composing ? (
            <>
              <textarea
                autoFocus
                value={draft}
                onChange={e => setDraft(e.target.value)}
                className="w-full mt-2 min-h-[100px] bg-transparent border-none resize-none font-display italic text-[15px] leading-[1.55] focus:outline-none"
                placeholder="Today I noticed…"
              />
              <div className="flex gap-2 justify-end mt-2">
                <button
                  className="font-mono text-[10px] tracking-[0.12em] uppercase text-text-muted hover:text-text"
                  onClick={() => { setDraft(''); setComposing(false); }}
                >Cancel</button>
                <button
                  className="font-mono text-[10px] tracking-[0.12em] uppercase text-accent disabled:opacity-40"
                  disabled={!draft.trim()}
                  onClick={async () => {
                    if (onCreate) await onCreate(draft.trim());
                    setDraft(''); setComposing(false);
                  }}
                >Save</button>
              </div>
            </>
          ) : (
            <button
              onClick={() => setComposing(true)}
              className="reflection-text text-text-muted text-left text-[15px] mt-2 w-full"
            >
              What&apos;s alive for you today?
            </button>
          )}
        </Card>
      )}

      {/* Timeline */}
      <Eyebrow>Recent</Eyebrow>
      <div>
        {entries.length === 0 ? (
          <p className="text-text-muted text-[14px]">No entries yet.</p>
        ) : (
          entries.map(e => (
            <article key={e.id} className="py-5 border-t border-border">
              <div className="flex items-baseline gap-3 mb-2">
                <span className="font-display text-[18px]">{weekdayOf(e.date)}</span>
                <MutedMono>{dateShort(e.date)}</MutedMono>
                {typeof e.commitmentsWon === 'number' && typeof e.commitmentsTotal === 'number' && (
                  <MutedMono className="ml-auto">
                    {e.commitmentsWon}/{e.commitmentsTotal} won
                  </MutedMono>
                )}
              </div>
              <p className="reflection-text text-[15px] text-text leading-[1.6] text-pretty">
                {e.text}
              </p>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
