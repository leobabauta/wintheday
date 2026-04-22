import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';
import { redirect } from 'next/navigation';
import InboxClient from '@/components/coach/InboxClient';

function relativeAt(iso: string): string {
  const then = new Date(iso);
  const now = new Date();
  const diff = Math.round((now.getTime() - then.getTime()) / 60000); // minutes
  if (diff < 1) return 'now';
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.round(diff / 60)}h ago`;
  return `${Math.round(diff / 1440)}d ago`;
}

export default async function InboxPage() {
  const session = await getSession();
  if (!session || session.role !== 'coach') redirect('/login');

  const messages = await query<{
    id: number;
    sender_id: number;
    sender_name: string;
    sender_avatar: string | null;
    content: string;
    read: number;
    created_at: string;
  }>(
    `SELECT m.id, m.sender_id, u.name as sender_name, u.avatar_url as sender_avatar, m.content, m.read, m.created_at
     FROM messages m
     JOIN users u ON u.id = m.sender_id
     WHERE m.recipient_id = $1 AND m.archived = 0
     ORDER BY m.created_at DESC
     LIMIT 100`,
    [session.userId]
  );

  const items = messages.map(m => ({
    id: String(m.id),
    clientId: String(m.sender_id),
    clientName: m.sender_name,
    clientAvatarUrl: m.sender_avatar,
    kind: 'message' as const,
    at: relativeAt(m.created_at),
    preview: m.content.length > 240 ? m.content.slice(0, 240) + '…' : m.content,
    meta: m.read ? 'Seen · needs reply' : 'Unread',
  }));

  return <InboxClient items={items} />;
}
