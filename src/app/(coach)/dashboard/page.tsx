import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { getClientWinHistory } from '@/lib/client-stats';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import ClientTable from '@/components/coach/ClientTable';

export default async function DashboardPage() {
  const session = await getSession();
  if (!session || session.role !== 'coach') redirect('/login');

  const db = getDb();
  const clients = db.prepare(
    `SELECT u.id, u.name, u.email, ci.sign_on_date, ci.closing_date,
            ci.coaching_day, ci.coaching_time, ci.coaching_frequency
     FROM users u
     JOIN client_info ci ON ci.user_id = u.id
     WHERE ci.coach_id = ?
     ORDER BY u.name`
  ).all(session.userId) as Array<{
    id: number; name: string; email: string;
    sign_on_date: string; closing_date: string | null;
    coaching_day: string; coaching_time: string; coaching_frequency: string;
  }>;

  const enriched = clients.map(client => {
    const commitmentCount = (db.prepare(
      'SELECT COUNT(*) as count FROM commitments WHERE user_id = ? AND active = 1'
    ).get(client.id) as { count: number }).count;

    const winHistory = getClientWinHistory(client.id, 14);

    const unreadMessages = (db.prepare(
      'SELECT COUNT(*) as count FROM messages WHERE recipient_id = ? AND sender_id = ? AND read = 0'
    ).get(session.userId, client.id) as { count: number }).count;

    return { ...client, commitmentCount, winHistory, unreadMessages };
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-navy">Clients</h1>
        <Link href="/dashboard/clients/new">
          <Button size="sm">+ Add Client</Button>
        </Link>
      </div>
      <ClientTable clients={enriched} />
    </div>
  );
}
