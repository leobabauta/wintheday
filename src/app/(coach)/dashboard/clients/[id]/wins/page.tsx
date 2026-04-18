import { getSession } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import Card from '@/components/ui/Card';

export default async function ClientWinsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const session = await getSession();
  if (!session || session.role !== 'coach') redirect('/login');

  const { id } = await params;
  const { date } = await searchParams;
  const clientId = parseInt(id);

  // Verify coach owns this client
  const clientInfo = await queryOne(
    'SELECT id FROM client_info WHERE user_id = $1 AND coach_id = $2',
    [clientId, session.userId]
  );
  if (!clientInfo) notFound();

  const user = await queryOne<{ name: string }>('SELECT name FROM users WHERE id = $1', [clientId]);

  if (!date) {
    // Show all days with entries
    const days = await query<{ date: string; total: string; completed: string }>(
      `SELECT date, COUNT(*) as total, SUM(completed) as completed
       FROM win_entries WHERE user_id = $1
       GROUP BY date ORDER BY date DESC LIMIT 30`,
      [clientId]
    );

    return (
      <div>
        <Link href={`/dashboard/clients/${clientId}`} className="text-sm text-text-muted hover:text-text mb-1 block">
          ← Back to {user!.name}
        </Link>
        <h1 className="font-display text-[28px] leading-[1.15] text-text mb-6">Win Log — {user!.name}</h1>

        {days.length === 0 ? (
          <Card><p className="text-sm text-text-muted">No entries yet</p></Card>
        ) : (
          <div className="space-y-2">
            {days.map(day => {
              const total = parseInt(day.total);
              const completed = parseInt(day.completed);
              const ratio = total > 0 ? completed / total : 0;
              const d = new Date(day.date + 'T12:00:00');
              const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
              return (
                <Link key={day.date} href={`/dashboard/clients/${clientId}/wins?date=${day.date}`}>
                  <Card className="">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-text">{label}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold ${ratio === 1 ? 'text-success' : ratio >= 0.5 ? 'text-accent' : 'text-text-muted'}`}>
                          {completed}/{total}
                        </span>
                        {ratio === 1 && <span className="text-xs text-success font-medium">Won!</span>}
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Show wins for a specific date
  const wins = await query<{ title: string; type: string; completed: number }>(
    `SELECT c.title, c.type, w.completed
     FROM win_entries w
     JOIN commitments c ON c.id = w.commitment_id
     WHERE w.user_id = $1 AND w.date = $2
     ORDER BY c.type, c.title`,
    [clientId, date]
  );

  const d = new Date(date + 'T12:00:00');
  const dateLabel = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const completed = wins.filter(w => w.completed === 1).length;
  const total = wins.length;

  return (
    <div>
      <Link href={`/dashboard/clients/${clientId}`} className="text-sm text-text-muted hover:text-text mb-1 block">
        ← Back to {user!.name}
      </Link>
      <h1 className="font-display text-[28px] leading-[1.15] text-text mb-1">{dateLabel}</h1>
      <p className="text-sm text-text-muted mb-6">{user!.name} — {completed}/{total} completed</p>

      {wins.length === 0 ? (
        <Card><p className="text-sm text-text-muted">No wins tracked this day</p></Card>
      ) : (
        <div className="space-y-3">
          {['commitment', 'practice'].map(type => {
            const items = wins.filter(w => w.type === type);
            if (items.length === 0) return null;
            return (
              <Card key={type}>
                <h2 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">
                  {type === 'commitment' ? (items.length === 1 ? 'Commitment' : 'Commitments') : (items.length === 1 ? 'Practice' : 'Practices')}
                </h2>
                <div className="space-y-2">
                  {items.map((w, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                        w.completed === 1
                          ? 'bg-accent'
                          : 'border-[1.5px] border-border'
                      }`}>
                        {w.completed === 1 && (
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="white" stroke="none">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                          </svg>
                        )}
                      </div>
                      <span className={`text-sm ${w.completed === 1 ? 'text-text-muted line-through' : 'text-text font-semibold'}`}>
                        {w.title}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
