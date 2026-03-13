import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { redirect } from 'next/navigation';
import MessageThread from '@/components/messages/MessageThread';

export default async function MessagesPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const db = getDb();

  // Get coach ID for this client
  const clientInfo = db.prepare(
    'SELECT coach_id FROM client_info WHERE user_id = ?'
  ).get(session.userId) as { coach_id: number } | undefined;

  if (!clientInfo) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-navy mb-6">Messages</h1>
        <p className="text-navy/50">No coach assigned yet.</p>
      </div>
    );
  }

  const messages = db.prepare(
    `SELECT m.*, u.name as sender_name FROM messages m
     JOIN users u ON u.id = m.sender_id
     WHERE (m.sender_id = ? OR m.recipient_id = ?)
       AND (m.sender_id = ? OR m.recipient_id = ?)
     ORDER BY m.created_at DESC LIMIT 50`
  ).all(session.userId, session.userId, clientInfo.coach_id, clientInfo.coach_id) as Array<{
    id: number; sender_id: number; recipient_id: number; sender_name: string;
    type: string; content: string; parent_id: number | null; read: number; created_at: string;
  }>;

  // Mark unread messages from coach as read
  db.prepare(
    'UPDATE messages SET read = 1 WHERE recipient_id = ? AND sender_id = ? AND read = 0'
  ).run(session.userId, clientInfo.coach_id);

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
