import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';
import { redirect } from 'next/navigation';
import InboxView from '@/components/coach/InboxView';

export default async function InboxPage() {
  const session = await getSession();
  if (!session || session.role !== 'coach') redirect('/login');

  const messages = await query<{
    id: number;
    sender_id: number;
    sender_name: string;
    recipient_id: number;
    type: string;
    content: string;
    parent_id: number | null;
    read: number;
    archived: number;
    created_at: string;
  }>(
    `SELECT m.*, u.name as sender_name
     FROM messages m
     JOIN users u ON u.id = m.sender_id
     WHERE m.recipient_id = $1 AND m.archived = 0
     ORDER BY m.created_at DESC
     LIMIT 100`,
    [session.userId]
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy mb-6">Inbox</h1>
      <InboxView messages={messages} coachId={session.userId} />
    </div>
  );
}
