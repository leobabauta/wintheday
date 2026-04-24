import { getSession } from '@/lib/auth';
import { query, queryOne, execute } from '@/lib/db';
import { getClientWinHistory } from '@/lib/client-stats';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import MutedMono from '@/components/ui/MutedMono';
import MessageThreadCoach from '@/components/messages/MessageThreadCoach';
import ClientInfoEditor from '@/components/coach/ClientInfoEditor';
import ClientMeetingsSection from '@/components/coach/ClientMeetingsSection';
import PreCoachingLogView from '@/components/coach/PreCoachingLogView';

import type { ReactNode } from 'react';

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

// New-format body entries return one unlabeled item; legacy entries still
// return up to four labeled items.
function displayAnswers(content: string): { label: string | null; text: string }[] {
  const answers = parseContent(content);
  if (typeof answers.body === 'string' && answers.body.trim()) {
    return [{ label: null, text: answers.body }];
  }
  return PROMPTS
    .filter(p => answers[p.key]?.trim())
    .map(p => ({ label: p.label, text: answers[p.key] }));
}

function highlightBold(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const regex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let idx = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    parts.push(
      <strong key={`b-${idx++}`} className="font-semibold text-text">
        {match[1]}
      </strong>,
    );
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'coach') redirect('/login');

  const { id } = await params;
  const clientId = parseInt(id);

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

  const user = await queryOne<{ id: number; name: string; email: string; avatar_url: string | null; created_at: string }>(
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
      <div className="mb-6">
        <Link href="/dashboard" className="text-[13px] text-text-secondary hover:text-text block mb-3.5">← Clients</Link>
        <h1 className="font-display text-[30px]">{user!.name}</h1>
        <p className="text-[13px] text-text-muted mt-1">{user!.email}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ClientInfoEditor
          clientId={clientId}
          data={{
            name: user!.name,
            email: user!.email,
            avatar_url: user!.avatar_url,
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

        <Card>
          <div className="flex items-center justify-between mb-4">
            <MutedMono>Last 14 Days</MutedMono>
            <Link href={`/dashboard/clients/${clientId}/wins`} className="text-[11px] text-text-muted hover:text-text">
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
                  <div className="text-[10px] text-text-muted mb-1">{dayLabel}</div>
                  {hasData ? (
                    <Link href={`/dashboard/clients/${clientId}/wins?date=${day.date}`} title={`${day.completed}/${day.total}`}>
                      <div className={`w-8 h-8 mx-auto rounded-[10px] flex items-center justify-center text-xs font-medium cursor-pointer hover:ring-2 hover:ring-accent/30 transition-all ${
                        ratio === 1 ? 'bg-accent text-bg' :
                        ratio >= 0.5 ? 'bg-accent-light text-accent' :
                        ratio > 0 ? 'bg-surface text-text-secondary' :
                        'bg-surface text-text-muted'
                      }`}>
                        {dateLabel}
                      </div>
                    </Link>
                  ) : (
                    <div className="w-8 h-8 mx-auto rounded-[10px] flex items-center justify-center text-xs font-medium bg-surface/60 text-text-muted" title="No data">
                      {dateLabel}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <MutedMono>Commitments & Practices</MutedMono>
            <Link href={`/dashboard/clients/${clientId}/edit`}>
              <Button variant="text" size="sm">Edit</Button>
            </Link>
          </div>
          {commitments.length === 0 ? (
            <p className="text-[13px] text-text-muted">None set up yet</p>
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
                      <span className="text-[14px] text-text">{c.title}</span>
                    </div>
                    <div className="flex gap-1 mt-1 ml-14">
                      {DAYS.map(d => (
                        <span
                          key={d.key}
                          className={`w-5 h-5 flex items-center justify-center rounded text-[9px] font-medium ${
                            days.includes(d.key) ? 'bg-accent text-bg' : 'bg-surface text-text-muted'
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
          <div className="border-t border-border mt-4 pt-3">
            <div className="flex justify-between text-[13px]">
              <span className="text-text-secondary">Daily Quality</span>
              <span className={clientSettings?.rating_label ? 'text-text' : 'text-text-muted italic'}>
                {clientSettings?.rating_label || 'not set yet'}
              </span>
            </div>
          </div>
        </Card>

        <ClientMeetingsSection clientId={clientId} />

        <PreCoachingLogView clientId={clientId} />

        <Card>
          <div className="flex items-center justify-between mb-4">
            <MutedMono>Journal Entries</MutedMono>
            <Link href={`/dashboard/clients/${clientId}/journal`} className="text-[11px] text-text-muted hover:text-text">
              View all
            </Link>
          </div>
          {visibleEntries.length === 0 ? (
            <p className="text-[13px] text-text-muted">No entries yet</p>
          ) : (
            <div className="space-y-4">
              {visibleEntries.map(entry => {
                const d = new Date(entry.date + 'T12:00:00');
                const dateLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                const items = displayAnswers(entry.content);
                const isToday = entry.date === today;

                return (
                  <div key={entry.id} className="border-b border-border pb-3 last:border-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider">{dateLabel}</span>
                      {isToday && <span className="text-[10px] text-accent font-medium">TODAY</span>}
                    </div>
                    {items.length === 0 ? (
                      <p className="text-[13px] text-text-muted italic">Empty entry</p>
                    ) : (
                      <div className="space-y-2">
                        {items.map((item, i) => (
                          <div key={i}>
                            {item.label && <MutedMono className="block">{item.label}</MutedMono>}
                            <p className={`text-[15px] text-text whitespace-pre-wrap line-clamp-2 leading-[1.55] font-light ${item.label ? 'mt-1' : ''}`}>
                              {highlightBold(item.text)}
                            </p>
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

        <div className="md:col-span-2">
          <MessageThreadCoach
            initial={messages}
            coachUserId={session.userId}
            clientUserId={clientId}
            clientName={user!.name}
            clientAvatarUrl={user!.avatar_url}
          />
        </div>

      </div>
    </div>
  );
}
