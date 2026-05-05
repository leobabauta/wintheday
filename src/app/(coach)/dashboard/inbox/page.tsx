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

// Mirrors TodayClient.tsx extractReflectionPreview: new entries are
// {body}, legacy entries are {well, challenge, learn, tomorrow}. Strip
// **Heading:** markers and collapse whitespace for a one-line preview.
function reflectionPreview(content: string): string {
  let raw = '';
  try {
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed === 'object') {
      if (typeof parsed.body === 'string' && parsed.body.trim()) {
        raw = parsed.body;
      } else {
        raw = ['well', 'challenge', 'learn', 'tomorrow']
          .map(k => (typeof parsed[k] === 'string' ? parsed[k] : ''))
          .filter(Boolean)
          .join(' · ');
      }
    }
  } catch {
    raw = content;
  }
  return raw.replace(/\*\*([^*]+)\*\*/g, '').replace(/\s+/g, ' ').trim();
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

  const journals = await query<{
    id: number;
    client_id: number;
    client_name: string;
    client_avatar: string | null;
    date: string;
    content: string;
    updated_at: string;
  }>(
    `SELECT je.id, je.user_id AS client_id, je.date, je.content, je.updated_at,
            u.name AS client_name, u.avatar_url AS client_avatar
     FROM journal_entries je
     JOIN client_info ci ON ci.user_id = je.user_id
     JOIN users u ON u.id = je.user_id
     WHERE ci.coach_id = $1
       AND je.content <> ''
       AND je.coach_opened_at IS NULL
     ORDER BY je.updated_at DESC
     LIMIT 100`,
    [session.userId]
  );

  const completions = await query<{
    user_id: number;
    client_name: string;
    client_avatar: string | null;
    date: string;
    completed_at: string;
  }>(
    `SELECT dc.user_id, dc.date, dc.completed_at,
            u.name AS client_name, u.avatar_url AS client_avatar
     FROM daily_completions dc
     JOIN client_info ci ON ci.user_id = dc.user_id
     JOIN users u ON u.id = dc.user_id
     WHERE ci.coach_id = $1
       AND dc.coach_opened_at IS NULL
     ORDER BY dc.completed_at DESC
     LIMIT 100`,
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

  const journalItems = journals.map(j => {
    const preview = reflectionPreview(j.content);
    return {
      id: `jrn-${j.id}`,
      journalId: j.id,
      clientId: String(j.client_id),
      clientName: j.client_name,
      clientAvatarUrl: j.client_avatar,
      kind: 'reflection' as const,
      at: relativeAt(j.updated_at),
      preview: preview.length > 240 ? preview.slice(0, 240) + '…' : preview,
      meta: `Reflection for ${j.date}`,
      createdAt: j.updated_at,
    };
  });

  const completionItems = completions.map(c => {
    const dateLabel = new Date(c.date + 'T12:00:00').toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric',
    });
    return {
      id: `dc-${c.user_id}-${c.date}`,
      completionUserId: c.user_id,
      completionDate: c.date,
      clientId: String(c.user_id),
      clientName: c.client_name,
      clientAvatarUrl: c.client_avatar,
      kind: 'completion' as const,
      at: relativeAt(c.completed_at),
      preview: `${c.client_name.split(' ')[0]} completed all commitments and practices for ${dateLabel}.`,
      meta: 'Won the day',
      createdAt: c.completed_at,
    };
  });

  // Merge + sort so newest submissions interleave with newest messages.
  // createdAt comes back from pg as a Date — use getTime, not localeCompare.
  const items = [...messageItems, ...preCoachingItems, ...journalItems, ...completionItems]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map(({ createdAt: _createdAt, ...rest }) => rest);

  return <InboxClient items={items} />;
}
