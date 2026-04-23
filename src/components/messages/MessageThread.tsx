'use client';

import { useState, useRef, useEffect } from 'react';
import MutedMono from '@/components/ui/MutedMono';

interface Message {
  id: string;
  from: 'coach' | 'client';
  text: string;
  date: string; // YYYY-MM-DD
  time: string; // "8:12 AM"
}

interface Props {
  coachName: string;
  coachInitials: string;
  coachAvatarUrl?: string | null;
  messages: Message[];
  onSend: (text: string) => Promise<void>;
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

export default function MessageThread({ coachName, coachInitials, coachAvatarUrl, messages, onSend, today }: Props) {
  const [draft, setDraft] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (endRef.current) endRef.current.scrollTop = endRef.current.scrollHeight;
  }, [messages.length]);

  const send = async () => {
    if (!draft.trim()) return;
    await onSend(draft.trim());
    setDraft('');
  };

  const groups = groupByDate(messages);

  return (
    <div className="flex flex-col h-[calc(100dvh-4.75rem-max(calc(env(safe-area-inset-bottom)-1.25rem),4px))] sm:h-full -mx-6 -mt-[env(safe-area-inset-top)] sm:-my-10">
      <div className="px-6 py-4 border-b border-border flex items-center gap-3">
        {coachAvatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coachAvatarUrl}
            alt=""
            className="w-9 h-9 rounded-full object-cover"
          />
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

      <div ref={endRef} className="flex-1 overflow-y-auto px-6 py-4">
        {groups.map(g => (
          <div key={g.date} className="mb-4">
            <div className="text-center my-3">
              <MutedMono>{dateLabel(g.date, today)}</MutedMono>
            </div>
            {g.items.map(m => <Bubble key={m.id} msg={m} />)}
          </div>
        ))}
      </div>

      <div className="px-4 pt-2 pb-5 border-t border-border flex items-end gap-2">
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder={`Write to ${coachName.split(' ')[0]}…`}
          rows={1}
          className="flex-1 rounded-[20px] py-2.5 px-4 text-[14px] min-h-[40px] max-h-[120px]"
        />
        <button
          onClick={send}
          disabled={!draft.trim()}
          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${draft.trim() ? 'bg-accent text-bg' : 'bg-border text-text-muted'}`}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3 7H11M11 7L7 3M11 7L7 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function Bubble({ msg }: { msg: Message }) {
  const isClient = msg.from === 'client';
  return (
    <div className={`flex ${isClient ? 'justify-end' : 'justify-start'} mb-1.5`}>
      <div className="max-w-[80%]">
        <div
          className={`py-2 px-3.5 text-[14px] leading-[1.5] font-light ${
            isClient
              ? 'bg-accent text-bg rounded-2xl rounded-br-[4px]'
              : 'bg-surface border border-border rounded-2xl rounded-bl-[4px]'
          }`}
        >
          {msg.text}
        </div>
        <div className={`px-1.5 pt-1 ${isClient ? 'text-right' : 'text-left'}`}>
          <MutedMono>{msg.time}</MutedMono>
        </div>
      </div>
    </div>
  );
}
