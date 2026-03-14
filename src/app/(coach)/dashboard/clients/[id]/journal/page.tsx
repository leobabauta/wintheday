import { getSession } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import Card from '@/components/ui/Card';

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

export default async function ClientJournalPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'coach') redirect('/login');

  const { id } = await params;
  const clientId = parseInt(id);

  const clientInfo = await queryOne(
    'SELECT id FROM client_info WHERE user_id = $1 AND coach_id = $2',
    [clientId, session.userId]
  );
  if (!clientInfo) notFound();

  const user = await queryOne<{ name: string }>('SELECT name FROM users WHERE id = $1', [clientId]);

  const entries = await query<{ id: number; date: string; content: string; updated_at: string }>(
    'SELECT * FROM journal_entries WHERE user_id = $1 ORDER BY date DESC LIMIT 30',
    [clientId]
  );

  const visibleEntries = entries.filter(e => e.content.trim());
  const today = new Date().toISOString().split('T')[0];

  return (
    <div>
      <Link href={`/dashboard/clients/${clientId}`} className="text-sm text-navy/50 hover:text-navy mb-1 block">
        ← Back to {user!.name}
      </Link>
      <h1 className="text-2xl font-bold text-navy mb-6">Journal — {user!.name}</h1>

      {visibleEntries.length === 0 ? (
        <Card><p className="text-sm text-navy/40">No journal entries yet</p></Card>
      ) : (
        <div className="space-y-5">
          {visibleEntries.map(entry => {
            const d = new Date(entry.date + 'T12:00:00');
            const day = d.getDate();
            const month = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
            const items = displayAnswers(entry.content);

            let ago = '';
            if (entry.date === today) {
              ago = 'TODAY';
            } else {
              const todayDate = new Date(today + 'T12:00:00');
              const diffDays = Math.round((todayDate.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
              if (diffDays === 1) ago = '1 DAY AGO';
              else if (diffDays < 7) ago = `${diffDays} DAYS AGO`;
              else if (diffDays < 14) ago = '1 WEEK AGO';
              else ago = `${Math.floor(diffDays / 7)} WEEKS AGO`;
            }

            return (
              <div key={entry.id}>
                <div className="flex items-end gap-3 mb-2">
                  <div>
                    <span className="text-2xl font-extrabold text-navy leading-none">{day}</span>
                    <span className="text-[10px] text-navy/40 uppercase ml-1">{month}</span>
                  </div>
                  <span className="text-[10px] text-navy/30 uppercase ml-auto">{ago}</span>
                </div>
                <Card>
                  {items.length === 0 ? (
                    <p className="text-sm text-navy/50 italic">Empty entry</p>
                  ) : (
                    <div className="space-y-3">
                      {items.map((item, i) => (
                        <div key={i}>
                          <p className="text-xs font-semibold text-navy/50">{item.label}</p>
                          <p className="text-sm text-navy/80 whitespace-pre-wrap mt-0.5">{item.text}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
