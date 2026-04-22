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

  const preCoachingLogs = await query<{
    id: number;
    meeting_id: number;
    client_id: number;
    client_name: string;
    client_avatar: string | null;
    submitted_at: string;
    starts_at: string;
  }>(
    `SELECT pcl.id, pcl.meeting_id, pcl.client_id, pcl.submitted_at,
            u.name AS client_name, u.avatar_url AS client_avatar,
            m.starts_at
     FROM pre_coaching_logs pcl
     JOIN users u ON u.id = pcl.client_id
     JOIN meetings m ON m.id = pcl.meeting_id
     WHERE pcl.coach_id = $1
       AND pcl.submitted_at IS NOT NULL
       AND pcl.opened_at IS NULL
     ORDER BY pcl.submitted_at DESC`,
    [session.userId]
  );

  const messageItems = messages.map(m => ({
    id: `msg-${m.id}`,
    messageId: m.id,
    clientId: String(m.sender_id),
    clientName: m.sender_name,
    clientAvatarUrl: m.sender_avatar,
    kind: 'message' as const,
    at: relativeAt(m.created_at),
    preview: m.content.length > 240 ? m.content.slice(0, 240) + '…' : m.content,
    meta: m.read ? 'Seen · needs reply' : 'Unread',
    createdAt: m.created_at,
  }));

  const preCoachingItems = preCoachingLogs.map(l => ({
    id: `pcl-${l.id}`,
    meetingId: l.meeting_id,
    clientId: String(l.client_id),
    clientName: l.client_name,
    clientAvatarUrl: l.client_avatar,
    kind: 'pre_coaching' as const,
    at: relativeAt(l.submitted_at),
    preview: `Pre-coaching form for your ${new Date(l.starts_at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} session.`,
    meta: 'New · not opened',
    createdAt: l.submitted_at,
  }));

  // Merge + sort so newest submissions interleave with newest messages.
  // createdAt comes back from pg as a Date — use getTime, not localeCompare.
  const items = [...messageItems, ...preCoachingItems]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map(({ createdAt: _createdAt, ...rest }) => rest);

  return <InboxClient items={items} />;
}
