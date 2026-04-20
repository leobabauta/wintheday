'use client';

import { useEffect, useRef, useState } from 'react';
import MutedMono from '@/components/ui/MutedMono';

interface DbRow {
  id: number;
  sender_id: number;
  recipient_id: number;
  sender_name: string;
  content: string;
  created_at: string;
}

interface Props {
  initial: DbRow[];
  coachUserId: number;
  clientUserId: number;
  clientName: string;
}

interface UiMessage {
  id: string;
  fromCoach: boolean;
  text: string;
  date: string;
  time: string;
}

function initialsOf(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('');
}

function toParts(iso: string) {
  const d = new Date(iso);
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return { date, time };
}

function todayLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dateLabel(iso: string, today: string) {
  if (iso === today) return 'Today';
  const t = new Date(today + 'T12:00:00');
  const d = new Date(iso + 'T12:00:00');
  const diff = Math.round((t.getTime() - d.getTime()) / 86400000);
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).toUpperCase();
}

export default function MessageThreadCoach({ initial, coachUserId, clientUserId, clientName }: Props) {
  const [rows, setRows] = useState<DbRow[]>([...initial].reverse());
  const [draft, setDraft] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const today = todayLocal();

  useEffect(() => {
    setRows([...initial].reverse());
  }, [initial]);

  useEffect(() => {
    if (endRef.current) endRef.current.scrollTop = endRef.current.scrollHeight;
  }, [rows.length]);

  const messages: UiMessage[] = rows.map(r => {
    const { date, time } = toParts(r.created_at);
    return {
      id: String(r.id),
      fromCoach: r.sender_id === coachUserId,
      text: r.content,
      date,
      time,
    };
  });

  const send = async () => {
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipientId: clientUserId, type: 'reply', content: text }),
    });
    if (res.ok) {
      const saved = await res.json();
      setRows(prev => [...prev, {
        id: saved.id,
        sender_id: coachUserId,
        recipient_id: clientUserId,
        sender_name: '',
        content: text,
        created_at: saved.created_at || new Date().toISOString(),
      }]);
    }
  };

  const groups: { date: string; items: UiMessage[] }[] = [];
  for (const m of messages) {
    const last = groups[groups.length - 1];
    if (!last || last.date !== m.date) groups.push({ date: m.date, items: [m] });
    else last.items.push(m);
  }

  return (
    <div className="border border-border rounded-[14px] overflow-hidden flex flex-col max-h-[600px]">
      <div className="px-5 py-3 border-b border-border flex items-center gap-3 bg-surface">
        <div className="w-9 h-9 rounded-full bg-accent-light text-accent flex items-center justify-center text-[13px]">
          {initialsOf(clientName)}
        </div>
        <div>
          <MutedMono>Conversation</MutedMono>
          <div className="text-[14px]">{clientName}</div>
        </div>
      </div>

      <div ref={endRef} className="flex-1 overflow-y-auto px-5 py-4">
        {messages.length === 0 ? (
          <p className="text-[13px] text-text-muted text-center py-6">No messages yet.</p>
        ) : groups.map(g => (
          <div key={g.date} className="mb-4">
            <div className="text-center my-3">
              <MutedMono>{dateLabel(g.date, today)}</MutedMono>
            </div>
            {g.items.map(m => (
              <div key={m.id} className={`flex ${m.fromCoach ? 'justify-end' : 'justify-start'} mb-1.5`}>
                <div className="max-w-[80%]">
                  <div
                    className={`py-2 px-3.5 text-[14px] leading-[1.5] font-light ${
                      m.fromCoach
                        ? 'bg-accent text-bg rounded-2xl rounded-br-[4px]'
                        : 'bg-surface border border-border rounded-2xl rounded-bl-[4px]'
                    }`}
                  >
                    {m.text}
                  </div>
                  <div className={`px-1.5 pt-1 ${m.fromCoach ? 'text-right' : 'text-left'}`}>
                    <MutedMono>{m.time}</MutedMono>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="px-4 pt-2 pb-4 border-t border-border flex items-end gap-2">
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder={`Write to ${clientName.split(' ')[0]}…`}
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
