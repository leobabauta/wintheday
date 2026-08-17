'use client';

import { REACTION_EMOJI, type GroupedReaction } from '@/lib/reactions';

// The picker row that appears when a bubble is tapped.
export function ReactionPicker({ align, onPick }: {
  align: 'left' | 'right';
  onPick: (emoji: string) => void;
}) {
  return (
    <div className={`flex ${align === 'right' ? 'justify-end' : 'justify-start'}`}>
      <div className="inline-flex items-center gap-0.5 rounded-full bg-surface border border-border px-1.5 py-1 shadow-sm">
        {REACTION_EMOJI.map(emoji => (
          <button
            key={emoji}
            onClick={e => { e.stopPropagation(); onPick(emoji); }}
            aria-label={`React ${emoji}`}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[18px] leading-none hover:bg-accent-light active:scale-90 transition-transform"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

// The chips shown under a bubble that already has reactions.
export function ReactionChips({ reactions, align, onToggle }: {
  reactions: GroupedReaction[];
  align: 'left' | 'right';
  onToggle: (emoji: string) => void;
}) {
  if (reactions.length === 0) return null;
  return (
    <div className={`flex flex-wrap gap-1 pt-1 ${align === 'right' ? 'justify-end' : 'justify-start'}`}>
      {reactions.map(r => (
        <button
          key={r.emoji}
          onClick={e => { e.stopPropagation(); onToggle(r.emoji); }}
          className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[12px] leading-none transition-colors ${
            r.mine ? 'bg-accent-light border-accent text-text' : 'bg-surface border-border text-text-secondary'
          }`}
        >
          <span className="text-[13px]">{r.emoji}</span>
          {r.count > 1 && <span>{r.count}</span>}
        </button>
      ))}
    </div>
  );
}
