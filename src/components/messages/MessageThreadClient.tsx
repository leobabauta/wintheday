'use client';

import { useEffect, useState } from 'react';
import MessageThread from './MessageThread';
import { groupReactions, toggleReaction, type RawReaction } from '@/lib/reactions';

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
  clientUserId: number;
  coachUserId: number;
  coachName: string;
  coachAvatarUrl?: string | null;
}

function initialOf(name: string) {
  const first = name.trim().split(/\s+/)[0] || '';
  return first[0]?.toUpperCase() || '';
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

export default function MessageThreadClient({ initial, clientUserId, coachUserId, coachName, coachAvatarUrl }: Props) {
  const [rows, setRows] = useState<DbRow[]>([...initial].reverse());

  useEffect(() => {
    setRows([...initial].reverse());
  }, [initial]);

  useEffect(() => {
    let cancelled = false;
    const fetchMessages = async () => {
      try {
        const res = await fetch('/api/messages', { cache: 'no-store' });
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
  }, []);

  const messages = rows.map(r => {
    const { date, time } = toParts(r.created_at);
    return {
      id: String(r.id),
      from: (r.sender_id === coachUserId ? 'coach' : 'client') as 'coach' | 'client',
      text: r.content,
      date,
      time,
      createdAt: r.created_at,
      attachmentUrl: r.attachment_url,
      attachmentType: r.attachment_type,
      reactions: groupReactions(r.reactions, clientUserId),
    };
  });

  // Optimistic: flip the chip now, POST behind it. A failed toggle is undone
  // here, and the 4s poll is the backstop either way.
  const onReact = (id: string, emoji: string) => {
    const apply = (prev: DbRow[]) => prev.map(r =>
      String(r.id) === id ? { ...r, reactions: toggleReaction(r.reactions, clientUserId, emoji) } : r
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

  const onDelete = async (id: string) => {
    const res = await fetch(`/api/messages/${id}`, { method: 'DELETE', credentials: 'include' });
    if (res.ok) setRows(prev => prev.filter(r => String(r.id) !== id));
  };

  const onSend = async (text: string, attachment?: { url: string; type: string }) => {
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        recipientId: coachUserId,
        type: 'question',
        content: text,
        attachmentUrl: attachment?.url,
        attachmentType: attachment?.type,
      }),
    });
    if (res.ok) {
      const saved = await res.json();
      setRows(prev => [...prev, {
        id: saved.id,
        sender_id: clientUserId,
        recipient_id: coachUserId,
        sender_name: '',
        content: text,
        created_at: saved.created_at || new Date().toISOString(),
        attachment_url: attachment?.url || null,
        attachment_type: attachment?.type || null,
        reactions: [],
      }]);
    }
  };

  return (
    <MessageThread
      coachName={coachName}
      coachInitials={initialOf(coachName)}
      coachAvatarUrl={coachAvatarUrl || null}
      messages={messages}
      onSend={onSend}
      onDelete={onDelete}
      onReact={onReact}
      today={todayLocal()}
    />
  );
}
