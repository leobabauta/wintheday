import { getSession } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import MutedMono from '@/components/ui/MutedMono';
import StarRating from '@/components/ui/StarRating';

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

// See src/app/(coach)/dashboard/clients/[id]/page.tsx for matching logic —
// same split on `**Heading:**` markers so body entries render with labeled
// sections instead of one big blob.
function displayAnswers(content: string): { label: string | null; text: string }[] {
  const answers = parseContent(content);
  if (typeof answers.body === 'string' && answers.body.trim()) {
    const body = answers.body;
    const sections: { label: string | null; text: string }[] = [];
    const regex = /\*\*(.+?)\*\*/g;
    let lastIndex = 0;
    let currentHeading: string | null = null;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(body)) !== null) {
      const before = body.slice(lastIndex, match.index).trim();
      if (before || currentHeading) {
        sections.push({ label: currentHeading, text: before });
      }
      currentHeading = match[1].replace(/[\s:—-]+$/, '').trim();
      lastIndex = regex.lastIndex;
    }
    const remaining = body.slice(lastIndex).trim();
    if (remaining || currentHeading) {
      sections.push({ label: currentHeading, text: remaining });
    }
    return sections.length > 0 ? sections : [{ label: null, text: body }];
  }
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

  const entries = await query<{ id: number; date: string; content: string; rating: number | null; updated_at: string }>(
    'SELECT * FROM journal_entries WHERE user_id = $1 ORDER BY date DESC LIMIT 30',
    [clientId]
  );

  const ratingLabel = await queryOne<{ rating_label: string }>(
    'SELECT rating_label FROM user_settings WHERE user_id = $1',
    [clientId]
  );

  const visibleEntries = entries.filter(e => e.content.trim());
  const today = new Date().toISOString().split('T')[0];

  return (
    <div>
      <Link href={`/dashboard/clients/${clientId}`} className="text-sm text-text-muted hover:text-text mb-1 block">
        ← Back to {user!.name}
      </Link>
      <h1 className="font-display text-[28px] leading-[1.15] text-text mb-6">Journal — {user!.name}</h1>

      {visibleEntries.length === 0 ? (
        <Card><p className="text-sm text-text-muted">No journal entries yet</p></Card>
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
                    <span className="font-display text-[24px] text-text leading-none">{day}</span>
                    <span className="text-[10px] text-text-muted uppercase ml-1">{month}</span>
                  </div>
                  <span className="text-[10px] text-text/30 uppercase ml-auto">{ago}</span>
                </div>
                <Card>
                  {entry.rating != null && entry.rating > 0 && (
                    <div className="mb-3 pb-3 border-b border-border">
                      <StarRating
                        value={Number(entry.rating)}
                        onChange={() => {}}
                        label={ratingLabel?.rating_label || 'inner peace'}
                        readonly
                        size={20}
                      />
                    </div>
                  )}
                  {items.length === 0 ? (
                    <p className="text-sm text-text-muted italic">Empty entry</p>
                  ) : (
                    <div className="space-y-5">
                      {items.map((item, i) => (
                        <div key={i}>
                          {item.label && <MutedMono className="block">{item.label}</MutedMono>}
                          <p className={`text-[15px] text-text whitespace-pre-wrap leading-[1.55] font-light ${item.label ? 'mt-1' : ''}`}>
                            {item.text}
                          </p>
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
