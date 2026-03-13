import { getSession } from '@/lib/auth';
import { query, queryOne, execute } from '@/lib/db';
import { redirect } from 'next/navigation';
import MessageThread from '@/components/messages/MessageThread';

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
        <h1 className="text-2xl font-bold text-navy mb-6">Messages</h1>
        <p className="text-navy/50">No coach assigned yet.</p>
      </div>
    );
  }

  const messages = await query<{
    id: number; sender_id: number; recipient_id: number; sender_name: string;
    type: string; content: string; parent_id: number | null; read: number; created_at: string;
  }>(
    `SELECT m.*, u.name as sender_name FROM messages m
     JOIN users u ON u.id = m.sender_id
     WHERE (m.sender_id = $1 OR m.recipient_id = $1)
       AND (m.sender_id = $2 OR m.recipient_id = $2)
     ORDER BY m.created_at DESC LIMIT 50`,
    [session.userId, clientInfo.coach_id]
  );

  // Mark unread messages from coach as read
  await execute(
    'UPDATE messages SET read = 1 WHERE recipient_id = $1 AND sender_id = $2 AND read = 0',
    [session.userId, clientInfo.coach_id]
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy mb-6">Messages</h1>
      <MessageThread
        messages={messages}
        userId={session.userId}
        coachId={clientInfo.coach_id}
      />
    </div>
  );
}
