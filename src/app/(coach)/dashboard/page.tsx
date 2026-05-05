import { getSession } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { getClientWinHistory } from '@/lib/client-stats';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import MutedMono from '@/components/ui/MutedMono';
import ClientTable from '@/components/coach/ClientTable';

type ClientStatus = 'on-track' | 'steady' | 'struggling' | 'starting-up';

function statusFor(ratio: number): Exclude<ClientStatus, 'starting-up'> {
  if (ratio >= 0.7) return 'on-track';
  if (ratio >= 0.3) return 'steady';
  return 'struggling';
}

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso.includes('T') ? iso : iso + 'T12:00:00');
  if (isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

function startingUpStatus(args: {
  signOnDate: string | null;
  createdAt: string | null;
  hasSetup: boolean;
  hasCheckIns: boolean;
}): ClientStatus | null {
  // Returns 'starting-up' or 'struggling' for new clients in their first
  // week, or null when they're past the window and the ratio rule applies.
  const age = daysSince(args.signOnDate) ?? daysSince(args.createdAt);
  if (age === null || age >= 7) return null;
  const engaged = args.hasSetup || args.hasCheckIns;
  if (!engaged && age >= 3) return 'struggling';
  return 'starting-up';
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

function lastActiveLabel(iso: string | null): string {
  if (!iso) return '—';
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.round(diffMs / 60000);
  if (min < 2) return 'Just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.round(hr / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function daysUntilClose(closing: string | null): number | null {
  if (!closing) return null;
  const d = new Date(closing + 'T12:00:00');
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

export default async function DashboardPage() {
  const session = await getSession();
  if (!session || session.role !== 'coach') redirect('/login');

  const clients = await query<{
    id: number;
    name: string;
    avatar_url: string | null;
    last_active_at: string | null;
    closing_date: string | null;
    sign_on_date: string | null;
    client_info_created_at: string | null;
    onboarded: number | null;
  }>(
    `SELECT u.id, u.name, u.avatar_url, u.last_active_at,
            ci.closing_date, ci.sign_on_date, ci.created_at AS client_info_created_at,
            us.onboarded
     FROM users u
     JOIN client_info ci ON ci.user_id = u.id
     LEFT JOIN user_settings us ON us.user_id = u.id
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
      'SELECT COUNT(*) as count FROM messages WHERE recipient_id = $1 AND sender_id = $2 AND archived = 0 AND read = 0',
      [session.userId, client.id]
    );
    const unreadMessages = parseInt(unread?.count || '0');

    const unopenedForm = await queryOne<{ count: string }>(
      `SELECT COUNT(*) AS count FROM pre_coaching_logs
       WHERE coach_id = $1 AND client_id = $2
         AND submitted_at IS NOT NULL AND opened_at IS NULL`,
      [session.userId, client.id]
    );
    const hasUnopenedForm = parseInt(unopenedForm?.count || '0') > 0;

    const ratio = total7 > 0 ? done7 / total7 : 0;

    const hasCommitment = await queryOne<{ count: string }>(
      'SELECT COUNT(*) AS count FROM commitments WHERE user_id = $1 LIMIT 1',
      [client.id]
    );
    const hasSetup =
      client.onboarded === 1 || parseInt(hasCommitment?.count || '0') > 0;
    const hasCheckIns = !!lastEntry || total7 > 0 || done7 > 0;

    const startingStatus = startingUpStatus({
      signOnDate: client.sign_on_date,
      createdAt: client.client_info_created_at,
      hasSetup,
      hasCheckIns,
    });
    const status: ClientStatus = startingStatus ?? statusFor(ratio);

    const daysLeft = daysUntilClose(client.closing_date);
    return {
      id: String(client.id),
      name: client.name,
      avatarUrl: client.avatar_url,
      status,
      streak,
      commitmentsDone7: done7,
      commitmentsTotal7: Math.max(total7, 1),
      lastEntry: lastEntryLabel(lastEntry?.date || null, today),
      lastActive: lastActiveLabel(client.last_active_at),
      rating14,
      unreadMessages,
      hasUnopenedForm,
      endingSoon: daysLeft !== null && daysLeft >= 0 && daysLeft <= 30,
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
