import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { getClientWinHistory } from '@/lib/client-stats';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import MessageThread from '@/components/messages/MessageThread';

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'coach') redirect('/login');

  const { id } = await params;
  const clientId = parseInt(id);
  const db = getDb();

  // Verify coach owns this client
  const clientInfo = db.prepare(
    'SELECT * FROM client_info WHERE user_id = ? AND coach_id = ?'
  ).get(clientId, session.userId) as {
    sign_on_date: string; closing_date: string | null;
    coaching_day: string; coaching_time: string; coaching_frequency: string;
  } | undefined;

  if (!clientInfo) notFound();

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(clientId) as {
    id: number; name: string; email: string; created_at: string;
  };

  const commitments = db.prepare(
    'SELECT * FROM commitments WHERE user_id = ? AND active = 1 ORDER BY type, title'
  ).all(clientId) as Array<{
    id: number; title: string; type: string; days_of_week: string; active: number;
  }>;

  const winHistory = getClientWinHistory(clientId, 14);

  const journalEntries = db.prepare(
    'SELECT * FROM journal_entries WHERE user_id = ? ORDER BY date DESC LIMIT 14'
  ).all(clientId) as Array<{ id: number; date: string; content: string; updated_at: string }>;

  const messages = db.prepare(
    `SELECT m.*, u.name as sender_name FROM messages m
     JOIN users u ON u.id = m.sender_id
     WHERE (m.sender_id = ? OR m.recipient_id = ?)
       AND (m.sender_id = ? OR m.recipient_id = ?)
     ORDER BY m.created_at DESC LIMIT 20`
  ).all(clientId, clientId, session.userId, session.userId) as Array<{
    id: number; sender_id: number; recipient_id: number; sender_name: string;
    type: string; content: string; parent_id: number | null; read: number; created_at: string;
  }>;

  // Mark messages from this client as read
  db.prepare(
    'UPDATE messages SET read = 1 WHERE recipient_id = ? AND sender_id = ? AND read = 0'
  ).run(session.userId, clientId);

  const DAYS = [
    { key: 'mon', label: 'M' }, { key: 'tue', label: 'T' }, { key: 'wed', label: 'W' },
    { key: 'thu', label: 'T' }, { key: 'fri', label: 'F' }, { key: 'sat', label: 'S' }, { key: 'sun', label: 'S' },
  ];

  const formatDate = (d: string | null) => d ? new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/dashboard" className="text-sm text-navy/50 hover:text-navy mb-1 block">← Back</Link>
          <h1 className="text-2xl font-bold text-navy">{user.name}</h1>
          <p className="text-sm text-navy/50">{user.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Client Info */}
        <Card>
          <h2 className="text-xs font-semibold text-navy/50 uppercase tracking-wider mb-4">Client Info</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-navy/60">Sign-on Date</span>
              <span className="font-medium text-navy">{formatDate(clientInfo.sign_on_date)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-navy/60">Closing Date</span>
              <span className="font-medium text-navy">{formatDate(clientInfo.closing_date)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-navy/60">Coaching Spot</span>
              <span className="font-medium text-navy">
                {clientInfo.coaching_frequency}, {clientInfo.coaching_day} at {clientInfo.coaching_time}
              </span>
            </div>
          </div>
        </Card>

        {/* Win History */}
        <Card>
          <h2 className="text-xs font-semibold text-navy/50 uppercase tracking-wider mb-4">Last 14 Days</h2>
          <div className="grid grid-cols-7 gap-2">
            {winHistory.map((day, i) => {
              const ratio = day.total > 0 ? day.completed / day.total : -1;
              const d = new Date(day.date + 'T12:00:00');
              const dayLabel = d.toLocaleDateString('en-US', { weekday: 'narrow' });
              const dateLabel = d.getDate().toString();
              return (
                <div key={i} className="text-center" title={`${day.completed}/${day.total}`}>
                  <div className="text-[10px] text-navy/40">{dayLabel}</div>
                  <div className={`w-8 h-8 mx-auto rounded-lg flex items-center justify-center text-xs font-medium ${
                    ratio === -1 ? 'bg-lavender-light/50 text-navy/30' :
                    ratio === 1 ? 'bg-success/20 text-success' :
                    ratio >= 0.5 ? 'bg-warning/20 text-warning' :
                    ratio > 0 ? 'bg-orange-100 text-orange-500' :
                    'bg-lavender-light text-navy/30'
                  }`}>
                    {dateLabel}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Commitments */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold text-navy/50 uppercase tracking-wider">Commitments & Practices</h2>
            <Link href={`/dashboard/clients/${clientId}/edit`}>
              <Button variant="ghost" size="sm">Edit</Button>
            </Link>
          </div>
          {commitments.length === 0 ? (
            <p className="text-sm text-navy/40">None set up yet</p>
          ) : (
            <div className="space-y-3">
              {commitments.map(c => {
                const days: string[] = JSON.parse(c.days_of_week);
                return (
                  <div key={c.id}>
                    <div className="flex items-center gap-2">
                      <Badge variant={c.type === 'commitment' ? 'default' : 'success'} className="text-[10px]">
                        {c.type}
                      </Badge>
                      <span className="text-sm font-medium text-navy">{c.title}</span>
                    </div>
                    <div className="flex gap-1 mt-1 ml-14">
                      {DAYS.map(d => (
                        <span
                          key={d.key}
                          className={`w-5 h-5 flex items-center justify-center rounded text-[9px] font-medium ${
                            days.includes(d.key) ? 'bg-navy text-white' : 'bg-lavender-light/50 text-navy/30'
                          }`}
                        >
                          {d.label}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Journal Entries */}
        <Card>
          <h2 className="text-xs font-semibold text-navy/50 uppercase tracking-wider mb-4">Journal Entries</h2>
          {journalEntries.length === 0 ? (
            <p className="text-sm text-navy/40">No entries yet</p>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {journalEntries.map(entry => (
                <div key={entry.id} className="border-b border-lavender-dark/10 pb-2">
                  <div className="text-xs text-navy/50 mb-1">
                    {new Date(entry.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </div>
                  <p className="text-sm text-navy/70 whitespace-pre-wrap line-clamp-3">{entry.content}</p>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Messages - full width */}
        <div className="md:col-span-2">
          <MessageThread
            messages={messages}
            userId={clientId}
            coachId={session.userId}
            isCoach={true}
            clientName={user.name}
          />
        </div>
      </div>
    </div>
  );
}
