import { getSession } from '@/lib/auth';
import { query, queryOne, execute } from '@/lib/db';
import { redirect } from 'next/navigation';
import MessageThreadClient from '@/components/messages/MessageThreadClient';

export default async function MessagesPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const clientInfo = await queryOne<{ coach_id: number }>(
    'SELECT coach_id FROM client_info WHERE user_id = $1',
    [session.userId]
  );

  if (!clientInfo) {
    return (
      <div>
        <h1 className="font-display text-[28px] mb-4">Messages</h1>
        <p className="text-[13px] text-text-muted">No coach assigned yet.</p>
      </div>
    );
  }

  const coach = await queryOne<{ name: string; avatar_url: string | null }>(
    'SELECT name, avatar_url FROM users WHERE id = $1',
    [clientInfo.coach_id]
  );

  const messages = await query<{
    id: number; sender_id: number; recipient_id: number; sender_name: string;
    content: string; created_at: string;
  }>(
    `SELECT m.id, m.sender_id, m.recipient_id, u.name as sender_name, m.content, m.created_at
     FROM messages m
     JOIN users u ON u.id = m.sender_id
     WHERE (m.sender_id = $1 OR m.recipient_id = $1)
       AND (m.sender_id = $2 OR m.recipient_id = $2)
     ORDER BY m.created_at DESC LIMIT 50`,
    [session.userId, clientInfo.coach_id]
  );

  await execute(
    'UPDATE messages SET read = 1 WHERE recipient_id = $1 AND sender_id = $2 AND read = 0',
    [session.userId, clientInfo.coach_id]
  );

  // Strip "(Coach)" / "(anything)" suffixes from the stored display name —
  // the "YOUR COACH" label already tells clients who this is.
  const rawName = coach?.name || 'Your coach';
  const displayName = rawName.replace(/\s*\(.*?\)\s*$/, '').trim() || rawName;

  return (
    <MessageThreadClient
      initial={messages}
      clientUserId={session.userId}
      coachUserId={clientInfo.coach_id}
      coachName={displayName}
      coachAvatarUrl={coach?.avatar_url || null}
    />
  );
}
