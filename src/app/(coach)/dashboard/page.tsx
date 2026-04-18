import { getSession } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { getClientWinHistory } from '@/lib/client-stats';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import MutedMono from '@/components/ui/MutedMono';
import ClientTable from '@/components/coach/ClientTable';

function initialsOf(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('');
}

function statusFor(ratio: number): 'on-track' | 'steady' | 'struggling' {
  if (ratio >= 0.8) return 'on-track';
  if (ratio >= 0.5) return 'steady';
  return 'struggling';
}

function lastEntryLabel(dateStr: string | null, today: string): string {
  if (!dateStr) return '—';
  const t = new Date(today + 'T12:00:00');
  const d = new Date(dateStr + 'T12:00:00');
  const days = Math.round((t.getTime() - d.getTime()) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default async function DashboardPage() {
  const session = await getSession();
  if (!session || session.role !== 'coach') redirect('/login');

  const clients = await query<{ id: number; name: string }>(
    `SELECT u.id, u.name
     FROM users u
     JOIN client_info ci ON ci.user_id = u.id
     WHERE ci.coach_id = $1
     ORDER BY u.name`,
    [session.userId]
  );

  const today = new Date().toISOString().split('T')[0];

  const enriched = await Promise.all(clients.map(async client => {
    const winHistory = await getClientWinHistory(client.id, 14);
    const last7 = winHistory.slice(-7);
    const done7 = last7.reduce((s, d) => s + d.completed, 0);
    const total7 = last7.reduce((s, d) => s + d.total, 0);

    // Streak: consecutive days (walking back from today) where ratio == 1
    let streak = 0;
    for (let i = winHistory.length - 1; i >= 0; i--) {
      const day = winHistory[i];
      if (day.total > 0 && day.completed === day.total) streak += 1;
      else break;
    }

    const ratings14 = await query<{ date: string; rating: string | number | null }>(
      `SELECT date, rating FROM journal_entries
       WHERE user_id = $1 AND date >= $2
       ORDER BY date ASC`,
      [client.id, winHistory[0]?.date || today]
    );
    const ratingByDate: Record<string, number> = {};
    for (const r of ratings14) {
      ratingByDate[r.date] = r.rating ? Number(r.rating) : 0;
    }
    const rating14 = winHistory.map(d => ratingByDate[d.date] || 0);

    const lastEntry = await queryOne<{ date: string }>(
      `SELECT date FROM journal_entries WHERE user_id = $1 AND content != '' ORDER BY date DESC LIMIT 1`,
      [client.id]
    );

    const unread = await queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM messages WHERE recipient_id = $1 AND sender_id = $2 AND read = 0',
      [session.userId, client.id]
    );
    const unreadCount = parseInt(unread?.count || '0');

    const ratio = total7 > 0 ? done7 / total7 : 0;

    return {
      id: String(client.id),
      name: client.name,
      initials: initialsOf(client.name),
      status: statusFor(ratio),
      streak,
      commitmentsDone7: done7,
      commitmentsTotal7: Math.max(total7, 1),
      lastEntry: lastEntryLabel(lastEntry?.date || null, today),
      rating14,
      openNeeds: unreadCount > 0 ? 'message' as const : null,
    };
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <MutedMono>Coach</MutedMono>
          <h1 className="font-display text-[30px] mt-1">Clients</h1>
        </div>
        <Link href="/dashboard/clients/new">
          <Button variant="filled" size="sm">+ Add Client</Button>
        </Link>
      </div>
      {enriched.length === 0 ? (
        <p className="text-[13px] text-text-muted">No clients yet.</p>
      ) : (
        <ClientTable clients={enriched} />
      )}
    </div>
  );
}
