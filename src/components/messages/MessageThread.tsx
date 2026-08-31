'use client';

import { useState, useRef, useEffect } from 'react';
import MutedMono from '@/components/ui/MutedMono';
import Linkify from '@/components/ui/Linkify';
import MessageComposer from './MessageComposer';
import ImageLightbox from './ImageLightbox';
import { ReactionPicker, ReactionChips } from './Reactions';
import type { GroupedReaction } from '@/lib/reactions';

interface Message {
  id: string;
  from: 'coach' | 'client';
  text: string;
  date: string; // YYYY-MM-DD
  time: string; // "8:12 AM"
  createdAt: string;
  attachmentUrl?: string | null;
  attachmentType?: string | null;
  reactions: GroupedReaction[];
}

interface Props {
  coachName: string;
  coachInitials: string;
  coachAvatarUrl?: string | null;
  messages: Message[];
  onSend: (text: string, attachment?: { url: string; type: string }) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onReact: (id: string, emoji: string) => void;
  today: string;
}

function dateLabel(iso: string, today: string) {
  if (iso === today) return 'Today';
  const t = new Date(today + 'T12:00:00');
  const d = new Date(iso + 'T12:00:00');
  const diff = Math.round((t.getTime() - d.getTime()) / 86400000);
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).toUpperCase();
}

function groupByDate(msgs: Message[]) {
  const groups: { date: string; items: Message[] }[] = [];
  let cur: { date: string; items: Message[] } | null = null;
  for (const m of msgs) {
    if (!cur || cur.date !== m.date) { cur = { date: m.date, items: [] }; groups.push(cur); }
    cur.items.push(m);
  }
  return groups;
}

function showTimeFor(items: Message[], i: number): boolean {
  const cur = items[i];
  const next = items[i + 1];
  if (!next) return true;
  if (next.from !== cur.from) return true;
  return new Date(next.createdAt).getTime() - new Date(cur.createdAt).getTime() > 5 * 60 * 1000;
}

export default function MessageThread({ coachName, coachInitials, coachAvatarUrl, messages, onSend, onDelete, onReact, today }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const didInit = useRef(false);

  // First paint jumps to the newest message; after that only follow along if
  // the reader is already at the bottom, so a poll can't yank them out of
  // history they're scrolled back into.
  useEffect(() => {
    const el = endRef.current;
    if (!el) return;
    if (!didInit.current) {
      didInit.current = true;
      el.scrollTop = el.scrollHeight;
      return;
    }
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 150) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages.length]);

  const groups = groupByDate(messages);

  return (
    <div className="flex flex-col h-[calc(100dvh-4.75rem-max(calc(env(safe-area-inset-bottom)-1.25rem),4px))] sm:h-full -mx-6 -mt-[env(safe-area-inset-top)] sm:-my-10">
      <div className="px-6 py-4 border-b border-border flex items-center gap-3">
        {coachAvatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coachAvatarUrl} alt="" className="w-9 h-9 rounded-full object-cover" />
        ) : (
          <div className="w-9 h-9 rounded-full bg-accent-light text-accent flex items-center justify-center text-[13px]">
            {coachInitials}
          </div>
        )}
        <div>
          <MutedMono>Your coach</MutedMono>
          <div className="text-[15px]">{coachName}</div>
        </div>
      </div>

      <div ref={endRef} className="flex-1 overflow-y-auto px-6 py-4" onClick={() => setSelectedId(null)}>
        {groups.map(g => (
          <div key={g.date} className="mb-4">
            <div className="text-center my-3">
              <MutedMono>{dateLabel(g.date, today)}</MutedMono>
            </div>
            {g.items.map((m, i) => (
              <Bubble
                key={m.id}
                msg={m}
                showTime={showTimeFor(g.items, i)}
                isSelected={selectedId === m.id}
                onSelect={id => setSelectedId(prev => prev === id ? null : id)}
                onDelete={onDelete && m.from === 'client' ? onDelete : undefined}
                onReact={(id, emoji) => { setSelectedId(null); onReact(id, emoji); }}
                onOpenImage={setLightboxSrc}
              />
            ))}
          </div>
        ))}
      </div>

      <MessageComposer
        placeholder={`Write to ${coachName.split(' ')[0]}…`}
        onSend={onSend}
        paddingBottom="pb-5"
      />

      {lightboxSrc && <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
    </div>
  );
}

function Bubble({ msg, showTime, isSelected, onSelect, onDelete, onReact, onOpenImage }: {
  msg: Message;
  showTime: boolean;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDelete?: (id: string) => Promise<void>;
  onReact: (id: string, emoji: string) => void;
  onOpenImage: (src: string) => void;
}) {
  const isClient = msg.from === 'client';
  const align = isClient ? 'right' : 'left';
  const roundedClass = isClient ? 'rounded-2xl rounded-br-[4px]' : 'rounded-2xl rounded-bl-[4px]';
  const colorClass = isClient ? 'bg-accent text-bg' : 'bg-surface border border-border';

  return (
    <div
      className={`flex ${isClient ? 'justify-end' : 'justify-start'} ${showTime ? 'mb-3' : 'mb-1.5'}`}
      onClick={e => { e.stopPropagation(); onSelect(msg.id); }}
    >
      <div className="max-w-[80%]">
        {isSelected && (
          <div className="pb-1">
            <ReactionPicker align={align} onPick={emoji => onReact(msg.id, emoji)} />
          </div>
        )}
        <div className={`overflow-hidden text-[14px] leading-[1.5] font-light ${colorClass} ${roundedClass}`}>
          {msg.attachmentUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={msg.attachmentUrl}
              alt=""
              onClick={e => { e.stopPropagation(); onOpenImage(msg.attachmentUrl!); }}
              className="block w-full max-w-[280px] object-cover cursor-zoom-in"
            />
          )}
          {msg.text && (
            <div className={`py-2 px-3.5 whitespace-pre-wrap ${msg.attachmentUrl ? 'border-t border-black/10' : ''}`}>
              <Linkify text={msg.text} />
            </div>
          )}
          {!msg.attachmentUrl && !msg.text && (
            <div className="py-2 px-3.5">&nbsp;</div>
          )}
        </div>
        <ReactionChips
          reactions={msg.reactions}
          align={align}
          onToggle={emoji => onReact(msg.id, emoji)}
        />
        {showTime && (
          <div className={`px-1.5 pt-1 ${isClient ? 'text-right' : 'text-left'}`}>
            <MutedMono>{msg.time}</MutedMono>
          </div>
        )}
        {isSelected && onDelete && (
          <div className={`pt-1 ${isClient ? 'text-right' : 'text-left'}`}>
            <button
              onClick={e => { e.stopPropagation(); onDelete(msg.id); }}
              className="text-[12px] text-red-500 px-1.5 hover:opacity-70 transition-opacity"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
