import { query } from './db';

export type InboxKind = 'reflection' | 'message' | 'quiet' | 'pre_coaching' | 'completion';

export interface InboxItem {
  id: string;
  messageId?: number;
  meetingId?: number;
  preCoachingLogId?: number;
  journalId?: number;
  completionUserId?: number;
  completionDate?: string;
  clientId: string;
  clientName: string;
  kind: InboxKind;
  at: string;
  preview: string;
  meta: string;
}

export interface InboxPayload {
  items: InboxItem[];
  /** Client id → avatar data URL. Avatars are 200×200 data URLs of ~10KB;
   *  inlined per row they turned a few hundred archived items into a
   *  multi-megabyte page. Sent once per client instead. */
  avatars: Record<string, string>;
}

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

function clip(s: string): string {
  return s.length > 240 ? s.slice(0, 240) + '…' : s;
}

interface MessageRow {
  id: number; sender_id: number; sender_name: string; sender_avatar: string | null;
  content: string; read: number; created_at: string;
}
interface PreCoachingRow {
  id: number; meeting_id: number; client_id: number; client_name: string;
  client_avatar: string | null; submitted_at: string; starts_at: string; opened_at: string | null;
}
interface JournalRow {
  id: number; client_id: number; client_name: string; client_avatar: string | null;
  date: string; content: string; updated_at: string; coach_opened_at: string | null;
}
interface CompletionRow {
  user_id: number; client_name: string; client_avatar: string | null;
  date: string; completed_at: string; coach_opened_at: string | null;
}

// The four inbox sources share a shape but not a table. `archived` flips each
// query to its complement — the same rows, on the other side of the line the
// coach drew when they attended to something.
async function loadItems(coachId: number, archived: boolean, limit = 100) {
  const [messages, preCoachingLogs, journals, completions] = await Promise.all([
    query<MessageRow>(
      `SELECT m.id, m.sender_id, u.name as sender_name, u.avatar_url as sender_avatar,
              m.content, m.read, m.created_at
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.recipient_id = $1 AND m.archived = ${archived ? 1 : 0}
       ORDER BY m.created_at DESC
       LIMIT ${limit}`,
      [coachId]
    ),
    query<PreCoachingRow>(
      `SELECT pcl.id, pcl.meeting_id, pcl.client_id, pcl.submitted_at, pcl.opened_at,
              u.name AS client_name, u.avatar_url AS client_avatar,
              m.starts_at
       FROM pre_coaching_logs pcl
       JOIN users u ON u.id = pcl.client_id
       JOIN meetings m ON m.id = pcl.meeting_id
       WHERE pcl.coach_id = $1
         AND pcl.submitted_at IS NOT NULL
         AND pcl.opened_at IS ${archived ? 'NOT NULL' : 'NULL'}
       ORDER BY pcl.submitted_at DESC
       LIMIT ${limit}`,
      [coachId]
    ),
    query<JournalRow>(
      `SELECT je.id, je.user_id AS client_id, je.date, je.content, je.updated_at, je.coach_opened_at,
              u.name AS client_name, u.avatar_url AS client_avatar
       FROM journal_entries je
       JOIN client_info ci ON ci.user_id = je.user_id
       JOIN users u ON u.id = je.user_id
       WHERE ci.coach_id = $1
         AND je.content <> ''
         AND je.coach_opened_at IS ${archived ? 'NOT NULL' : 'NULL'}
       ORDER BY je.updated_at DESC
       LIMIT ${limit}`,
      [coachId]
    ),
    query<CompletionRow>(
      `SELECT dc.user_id, dc.date, dc.completed_at, dc.coach_opened_at,
              u.name AS client_name, u.avatar_url AS client_avatar
       FROM daily_completions dc
       JOIN client_info ci ON ci.user_id = dc.user_id
       JOIN users u ON u.id = dc.user_id
       WHERE ci.coach_id = $1
         AND dc.coach_opened_at IS ${archived ? 'NOT NULL' : 'NULL'}
       ORDER BY dc.completed_at DESC
       LIMIT ${limit}`,
      [coachId]
    ),
  ]);

  const messageItems = messages.map(m => ({
    id: `msg-${m.id}`,
    messageId: m.id,
    clientId: String(m.sender_id),
    clientName: m.sender_name,
    kind: 'message' as const,
    at: relativeAt(m.created_at),
    preview: clip(m.content),
    meta: archived ? 'Attended to' : m.read ? 'Seen · needs reply' : 'Unread',
    createdAt: m.created_at,
  }));

  const preCoachingItems = preCoachingLogs.map(l => ({
    id: `pcl-${l.id}`,
    meetingId: l.meeting_id,
    preCoachingLogId: l.id,
    clientId: String(l.client_id),
    clientName: l.client_name,
    kind: 'pre_coaching' as const,
    at: relativeAt(l.submitted_at),
    preview: `Pre-coaching form for your ${new Date(l.starts_at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} session.`,
    meta: archived ? 'Opened' : 'New · not opened',
    createdAt: l.submitted_at,
  }));

  const journalItems = journals.map(j => ({
    id: `jrn-${j.id}`,
    journalId: j.id,
    clientId: String(j.client_id),
    clientName: j.client_name,
    kind: 'reflection' as const,
    at: relativeAt(j.updated_at),
    preview: clip(reflectionPreview(j.content)),
    meta: `Reflection for ${j.date}`,
    createdAt: j.updated_at,
  }));

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
      kind: 'completion' as const,
      at: relativeAt(c.completed_at),
      preview: `${c.client_name.split(' ')[0]} completed all commitments and practices for ${dateLabel}.`,
      meta: 'Won the day',
      createdAt: c.completed_at,
    };
  });

  const avatars: Record<string, string> = {};
  for (const [id, url] of [
    ...messages.map(m => [String(m.sender_id), m.sender_avatar] as const),
    ...preCoachingLogs.map(l => [String(l.client_id), l.client_avatar] as const),
    ...journals.map(j => [String(j.client_id), j.client_avatar] as const),
    ...completions.map(c => [String(c.user_id), c.client_avatar] as const),
  ]) {
    if (url) avatars[id] = url;
  }

  // Merge + sort so newest submissions interleave with newest messages.
  // createdAt comes back from pg as a Date — use getTime, not localeCompare.
  const items = [...messageItems, ...preCoachingItems, ...journalItems, ...completionItems]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .map(({ createdAt, ...rest }) => rest) as InboxItem[];

  return { items, avatars };
}

/** Everything still waiting on the coach. */
export function getInboxItems(coachId: number): Promise<InboxPayload> {
  return loadItems(coachId, false);
}

/** Everything the coach already attended to — the undo surface for a
 *  dismissal that turns out to have been a mistake. Deliberately shallow:
 *  recovering a mis-tap is a days-scale need, and every reflection the coach
 *  has ever read would otherwise pile up here forever. */
export function getArchivedItems(coachId: number): Promise<InboxPayload> {
  return loadItems(coachId, true, 40);
}
