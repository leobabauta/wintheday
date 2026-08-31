'use client';

import { useEffect, useRef, useState } from 'react';
import MutedMono from '@/components/ui/MutedMono';
import Avatar from '@/components/ui/Avatar';
import Linkify from '@/components/ui/Linkify';
import MessageComposer from './MessageComposer';
import ImageLightbox from './ImageLightbox';
import { ReactionPicker, ReactionChips } from './Reactions';
import { groupReactions, toggleReaction, type GroupedReaction, type RawReaction } from '@/lib/reactions';

interface DbRow {
  id: number;
  sender_id: number;
  recipient_id: number;
  sender_name: string;
  content: string;
  created_at: string;
  attachment_url?: string | null;
  attachment_type?: string | null;
  reactions?: RawReaction[];
}

interface Props {
  initial: DbRow[];
  coachUserId: number;
  clientUserId: number;
  clientName: string;
  clientAvatarUrl?: string | null;
  /** Message the coach arrived here to read (deep link from the inbox). */
  focusMessageId?: string;
}

interface UiMessage {
  id: string;
  fromCoach: boolean;
  text: string;
  date: string;
  time: string;
  createdAt: string;
  attachmentUrl?: string | null;
  reactions: GroupedReaction[];
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

export default function MessageThreadCoach({ initial, coachUserId, clientUserId, clientName, clientAvatarUrl, focusMessageId }: Props) {
  const [rows, setRows] = useState<DbRow[]>([...initial].reverse());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(focusMessageId ?? null);
  const endRef = useRef<HTMLDivElement>(null);
  const didInit = useRef(false);
  const didFocus = useRef(false);
  const today = todayLocal();

  useEffect(() => {
    setRows([...initial].reverse());
  }, [initial]);

  useEffect(() => {
    let cancelled = false;
    const fetchMessages = async () => {
      try {
        const res = await fetch(`/api/messages?clientId=${clientUserId}`, { cache: 'no-store' });
        if (!res.ok) return;
        const data: DbRow[] = await res.json();
        if (!cancelled) setRows([...data].reverse());
      } catch {
        // swallow — next poll will retry
      }
    };
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') fetchMessages();
    }, 4000);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') fetchMessages();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [clientUserId]);

  // Deep link from the inbox: bring the exact message into view (which also
  // scrolls the page down to the thread) and flash it, once.
  useEffect(() => {
    if (!focusMessageId || didFocus.current) return;
    const el = document.getElementById(`msg-${focusMessageId}`);
    if (!el) return;
    didFocus.current = true;
    el.scrollIntoView({ block: 'center' });
    const t = setTimeout(() => setHighlightId(null), 2400);
    return () => clearTimeout(t);
  }, [focusMessageId, rows.length]);

  // First paint jumps to the newest message unless we're deep-linking to an
  // older one; after that only follow along if already at the bottom.
  useEffect(() => {
    const el = endRef.current;
    if (!el) return;
    if (!didInit.current) {
      didInit.current = true;
      if (focusMessageId) return;
      el.scrollTop = el.scrollHeight;
      return;
    }
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 150) {
      el.scrollTop = el.scrollHeight;
    }
  }, [rows.length, focusMessageId]);

  const messages: UiMessage[] = rows.map(r => {
    const { date, time } = toParts(r.created_at);
    return {
      id: String(r.id),
      fromCoach: r.sender_id === coachUserId,
      text: r.content,
      date,
      time,
      createdAt: r.created_at,
      attachmentUrl: r.attachment_url,
      reactions: groupReactions(r.reactions, coachUserId),
    };
  });

  // Optimistic: flip the chip now, POST behind it. A failed toggle is undone
  // here, and the 4s poll is the backstop either way.
  const onReact = (id: string, emoji: string) => {
    const apply = (prev: DbRow[]) => prev.map(r =>
      String(r.id) === id ? { ...r, reactions: toggleReaction(r.reactions, coachUserId, emoji) } : r
    );
    setRows(apply);
    fetch(`/api/messages/${id}/reactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ emoji }),
    })
      .then(res => { if (!res.ok) setRows(apply); })
      .catch(() => setRows(apply));
  };

  const onSend = async (text: string, attachment?: { url: string; type: string }) => {
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        recipientId: clientUserId,
        type: 'reply',
        content: text,
        attachmentUrl: attachment?.url,
        attachmentType: attachment?.type,
      }),
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
        attachment_url: attachment?.url || null,
        attachment_type: attachment?.type || null,
        reactions: [],
      }]);
    }
  };

  const onDelete = async (id: string) => {
    const res = await fetch(`/api/messages/${id}`, { method: 'DELETE', credentials: 'include' });
    if (res.ok) setRows(prev => prev.filter(r => String(r.id) !== id));
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
        <Avatar name={clientName} avatarUrl={clientAvatarUrl} size={36} textSize={13} />
        <div>
          <MutedMono>Conversation</MutedMono>
          <div className="text-[14px]">{clientName}</div>
        </div>
      </div>

      <div ref={endRef} className="flex-1 overflow-y-auto px-5 py-4" onClick={() => setSelectedId(null)}>
        {messages.length === 0 ? (
          <p className="text-[13px] text-text-muted text-center py-6">No messages yet.</p>
        ) : groups.map(g => (
          <div key={g.date} className="mb-4">
            <div className="text-center my-3">
              <MutedMono>{dateLabel(g.date, today)}</MutedMono>
            </div>
            {g.items.map((m, i) => {
              const isCoach = m.fromCoach;
              const roundedClass = isCoach ? 'rounded-2xl rounded-br-[4px]' : 'rounded-2xl rounded-bl-[4px]';
              const colorClass = isCoach ? 'bg-accent text-bg' : 'bg-surface border border-border';
              const next = g.items[i + 1];
              const showTime = !next || next.fromCoach !== m.fromCoach ||
                new Date(next.createdAt).getTime() - new Date(m.createdAt).getTime() > 5 * 60 * 1000;
              const isSelected = selectedId === m.id;
              return (
                <div
                  key={m.id}
                  id={`msg-${m.id}`}
                  className={`flex ${isCoach ? 'justify-end' : 'justify-start'} ${showTime ? 'mb-3' : 'mb-1.5'} scroll-mt-6`}
                  onClick={e => { e.stopPropagation(); setSelectedId(prev => prev === m.id ? null : m.id); }}
                >
                  <div className="max-w-[80%]">
                    {isSelected && (
                      <div className="pb-1">
                        <ReactionPicker
                          align={isCoach ? 'right' : 'left'}
                          onPick={emoji => { setSelectedId(null); onReact(m.id, emoji); }}
                        />
                      </div>
                    )}
                    <div className={`overflow-hidden text-[14px] leading-[1.5] font-light ${colorClass} ${roundedClass} ${highlightId === m.id ? 'animate-msg-focus' : ''}`}>
                      {m.attachmentUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={m.attachmentUrl}
                          alt=""
                          onClick={e => { e.stopPropagation(); setLightboxSrc(m.attachmentUrl!); }}
                          className="block w-full max-w-[280px] object-cover cursor-zoom-in"
                        />
                      )}
                      {m.text && (
                        <div className={`py-2 px-3.5 whitespace-pre-wrap ${m.attachmentUrl ? 'border-t border-black/10' : ''}`}>
                          <Linkify text={m.text} />
                        </div>
                      )}
                      {!m.attachmentUrl && !m.text && (
                        <div className="py-2 px-3.5">&nbsp;</div>
                      )}
                    </div>
                    <ReactionChips
                      reactions={m.reactions}
                      align={isCoach ? 'right' : 'left'}
                      onToggle={emoji => onReact(m.id, emoji)}
                    />
                    {showTime && (
                      <div className={`px-1.5 pt-1 ${isCoach ? 'text-right' : 'text-left'}`}>
                        <MutedMono>{m.time}</MutedMono>
                      </div>
                    )}
                    {isSelected && isCoach && (
                      <div className="pt-1 text-right">
                        <button
                          onClick={e => { e.stopPropagation(); onDelete(m.id); }}
                          className="text-[12px] text-red-500 px-1.5 hover:opacity-70 transition-opacity"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <MessageComposer
        placeholder={`Write to ${clientName.split(' ')[0]}…`}
        onSend={onSend}
      />

      {lightboxSrc && <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
    </div>
  );
}
