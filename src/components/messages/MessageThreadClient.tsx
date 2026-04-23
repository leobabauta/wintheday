'use client';

import { useEffect, useState } from 'react';
import MessageThread from './MessageThread';

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
  clientUserId: number;
  coachUserId: number;
  coachName: string;
  coachAvatarUrl?: string | null;
}

// Initial from the first word only — avoids turning "Leo (Coach)" into "L(".
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
    };
  });

  const onSend = async (text: string) => {
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipientId: coachUserId, type: 'question', content: text }),
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
      today={todayLocal()}
    />
  );
}
