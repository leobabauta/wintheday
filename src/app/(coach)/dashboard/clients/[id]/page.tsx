import { getSession } from '@/lib/auth';
import { query, queryOne, execute } from '@/lib/db';
import { getClientWinHistory } from '@/lib/client-stats';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import MessageThread from '@/components/messages/MessageThread';
import ClientInfoEditor from '@/components/coach/ClientInfoEditor';

const PROMPTS = [
  { key: 'well', label: 'What went well today?' },
  { key: 'challenge', label: 'What was challenging?' },
  { key: 'learn', label: 'What did you learn or notice?' },
  { key: 'tomorrow', label: 'What will you focus on tomorrow?' },
];

function parseContent(content: string): Record<string, string> {
  try {
    const parsed = JSON.parse(content);
    if (typeof parsed === 'object' && parsed !== null) return parsed;
  } catch {
    if (content.trim()) return { well: content };
  }
  return {};
}

function displayAnswers(content: string): { label: string; text: string }[] {
  const answers = parseContent(content);
  return PROMPTS
    .filter(p => answers[p.key]?.trim())
    .map(p => ({ label: p.label, text: answers[p.key] }));
}

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'coach') redirect('/login');

  const { id } = await params;
  const clientId = parseInt(id);

  // Verify coach owns this client
  const clientInfo = await queryOne<{
    sign_on_date: string; closing_date: string | null;
    coaching_day: string; coaching_time: string; coaching_frequency: string;
    payment_amount: number | null; payment_frequency: string | null; renewal_day: number | null;
  }>(
    'SELECT * FROM client_info WHERE user_id = $1 AND coach_id = $2',
    [clientId, session.userId]
  );

  if (!clientInfo) notFound();

  const clientSettings = await queryOne<{ rating_label: string }>(
    'SELECT rating_label FROM user_settings WHERE user_id = $1',
    [clientId]
  );

  const user = await queryOne<{ id: number; name: string; email: string; created_at: string }>(
    'SELECT * FROM users WHERE id = $1',
    [clientId]
  );

  const commitments = await query<{
    id: number; title: string; type: string; days_of_week: string; active: number;
  }>(
    'SELECT * FROM commitments WHERE user_id = $1 AND active = 1 ORDER BY type, title',
    [clientId]
  );

  const winHistory = await getClientWinHistory(clientId, 14);

  const journalEntries = await query<{ id: number; date: string; content: string; updated_at: string }>(
    'SELECT * FROM journal_entries WHERE user_id = $1 ORDER BY date DESC LIMIT 2',
    [clientId]
  );

  const messages = await query<{
    id: number; sender_id: number; recipient_id: number; sender_name: string;
    type: string; content: string; parent_id: number | null; read: number; created_at: string;
  }>(
    `SELECT m.*, u.name as sender_name FROM messages m
     JOIN users u ON u.id = m.sender_id
     WHERE (m.sender_id = $1 OR m.recipient_id = $1)
       AND (m.sender_id = $2 OR m.recipient_id = $2)
     ORDER BY m.created_at DESC LIMIT 20`,
    [clientId, session.userId]
  );

  // Mark messages from this client as read
  await execute(
    'UPDATE messages SET read = 1 WHERE recipient_id = $1 AND sender_id = $2 AND read = 0',
    [session.userId, clientId]
  );

  const DAYS = [
    { key: 'mon', label: 'M' }, { key: 'tue', label: 'T' }, { key: 'wed', label: 'W' },
    { key: 'thu', label: 'T' }, { key: 'fri', label: 'F' }, { key: 'sat', label: 'S' }, { key: 'sun', label: 'S' },
  ];

  const today = new Date().toISOString().split('T')[0];
  const visibleEntries = journalEntries.filter(e => e.content.trim());

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/dashboard" className="text-sm text-navy/50 hover:text-navy mb-1 block">← Back</Link>
          <h1 className="text-2xl font-bold text-navy">{user!.name}</h1>
          <p className="text-sm text-navy/50">{user!.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Client Info — editable */}
        <ClientInfoEditor
          clientId={clientId}
          data={{
            name: user!.name,
            email: user!.email,
            sign_on_date: clientInfo.sign_on_date,
            closing_date: clientInfo.closing_date,
            coaching_day: clientInfo.coaching_day,
            coaching_time: clientInfo.coaching_time,
            coaching_frequency: clientInfo.coaching_frequency,
            payment_amount: clientInfo.payment_amount,
            payment_frequency: clientInfo.payment_frequency,
            renewal_day: clientInfo.renewal_day,
            rating_label: clientSettings?.rating_label || 'inner peace',
          }}
        />

        {/* Win History — clickable dates */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold text-navy/50 uppercase tracking-wider">Last 14 Days</h2>
            <Link href={`/dashboard/clients/${clientId}/wins`} className="text-xs text-navy/40 hover:text-navy">
              View all
            </Link>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {winHistory.map((day, i) => {
              const ratio = day.total > 0 ? day.completed / day.total : -1;
              const d = new Date(day.date + 'T12:00:00');
              const dayLabel = d.toLocaleDateString('en-US', { weekday: 'narrow' });
              const dateLabel = d.getDate().toString();
              const hasData = day.total > 0;
              return (
                <div key={i} className="text-center">
                  <div className="text-[10px] text-navy/40">{dayLabel}</div>
                  {hasData ? (
                    <Link href={`/dashboard/clients/${clientId}/wins?date=${day.date}`} title={`${day.completed}/${day.total}`}>
                      <div className={`w-8 h-8 mx-auto rounded-lg flex items-center justify-center text-xs font-medium cursor-pointer hover:ring-2 hover:ring-navy/20 transition-all ${
                        ratio === 1 ? 'bg-success/20 text-success' :
                        ratio >= 0.5 ? 'bg-warning/20 text-warning' :
                        ratio > 0 ? 'bg-orange-100 text-orange-500' :
                        'bg-lavender-light text-navy/30'
                      }`}>
                        {dateLabel}
                      </div>
                    </Link>
                  ) : (
                    <div className="w-8 h-8 mx-auto rounded-lg flex items-center justify-center text-xs font-medium bg-lavender-light/50 text-navy/30" title="No data">
                      {dateLabel}
                    </div>
                  )}
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

        {/* Journal Entries — last 2, properly parsed */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold text-navy/50 uppercase tracking-wider">Journal Entries</h2>
            <Link href={`/dashboard/clients/${clientId}/journal`} className="text-xs text-navy/40 hover:text-navy">
              View all
            </Link>
          </div>
          {visibleEntries.length === 0 ? (
            <p className="text-sm text-navy/40">No entries yet</p>
          ) : (
            <div className="space-y-4">
              {visibleEntries.map(entry => {
                const d = new Date(entry.date + 'T12:00:00');
                const dateLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                const items = displayAnswers(entry.content);
                const isToday = entry.date === today;

                return (
                  <div key={entry.id} className="border-b border-lavender-dark/10 pb-3 last:border-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-semibold text-navy/50">{dateLabel}</span>
                      {isToday && <span className="text-[10px] text-success font-medium">TODAY</span>}
                    </div>
                    {items.length === 0 ? (
                      <p className="text-sm text-navy/40 italic">Empty entry</p>
                    ) : (
                      <div className="space-y-2">
                        {items.map((item, i) => (
                          <div key={i}>
                            <p className="text-xs font-semibold text-navy/40">{item.label}</p>
                            <p className="text-sm text-navy/70 whitespace-pre-wrap line-clamp-2">{item.text}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
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
            clientName={user!.name}
          />
        </div>

      </div>
    </div>
  );
}
