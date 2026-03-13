import { getSession } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { getClientWinHistory } from '@/lib/client-stats';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import ClientTable from '@/components/coach/ClientTable';

export default async function DashboardPage() {
  const session = await getSession();
  if (!session || session.role !== 'coach') redirect('/login');

  const clients = await query<{
    id: number; name: string; email: string;
    sign_on_date: string; closing_date: string | null;
    coaching_day: string; coaching_time: string; coaching_frequency: string;
  }>(
    `SELECT u.id, u.name, u.email, ci.sign_on_date, ci.closing_date,
            ci.coaching_day, ci.coaching_time, ci.coaching_frequency
     FROM users u
     JOIN client_info ci ON ci.user_id = u.id
     WHERE ci.coach_id = $1
     ORDER BY u.name`,
    [session.userId]
  );

  const enriched = await Promise.all(clients.map(async client => {
    const commitmentCount = await queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM commitments WHERE user_id = $1 AND active = 1',
      [client.id]
    );

    const winHistory = await getClientWinHistory(client.id, 14);

    const unreadMessages = await queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM messages WHERE recipient_id = $1 AND sender_id = $2 AND read = 0',
      [session.userId, client.id]
    );

    return {
      ...client,
      commitmentCount: parseInt(commitmentCount?.count || '0'),
      winHistory,
      unreadMessages: parseInt(unreadMessages?.count || '0'),
    };
  }));

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
