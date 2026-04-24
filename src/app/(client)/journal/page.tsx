import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';
import { getUserSettings } from '@/lib/settings';
import { getDateString } from '@/lib/wins';
import { redirect } from 'next/navigation';
import JournalClient from '@/components/journal/JournalClient';

type Responses = {
  body?: string;
  well?: string;
  challenge?: string;
  learn?: string;
  tomorrow?: string;
};

function parseResponses(content: string): Responses {
  try {
    const parsed = JSON.parse(content);
    if (typeof parsed === 'object' && parsed !== null) {
      const r: Responses = {};
      for (const k of ['body', 'well', 'challenge', 'learn', 'tomorrow'] as const) {
        const v = (parsed as Record<string, string>)[k];
        if (typeof v === 'string' && v.trim()) r[k] = v.trim();
      }
      return r;
    }
  } catch {}
  if (content?.trim()) return { well: content.trim() };
  return {};
}

export default async function JournalPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const today = getDateString();

  const allEntries = await query<{ id: number; date: string; content: string; rating: number | null; updated_at: string }>(
    'SELECT * FROM journal_entries WHERE user_id = $1 ORDER BY date DESC LIMIT 30',
    [session.userId]
  );

  const entryDates = allEntries.map(e => e.date);
  const winsByDate: Record<string, { won: number; total: number }> = {};

  if (entryDates.length > 0) {
    const placeholders = entryDates.map((_, i) => `$${i + 2}`).join(',');
    const wins = await query<{ date: string; completed: number }>(
      `SELECT date, completed FROM win_entries
       WHERE user_id = $1 AND date IN (${placeholders})`,
      [session.userId, ...entryDates]
    );
    for (const w of wins) {
      if (!winsByDate[w.date]) winsByDate[w.date] = { won: 0, total: 0 };
      winsByDate[w.date].total += 1;
      if (w.completed) winsByDate[w.date].won += 1;
    }
  }

  const settings = await getUserSettings(session.userId);

  const mapped = allEntries
    .map(e => ({
      id: String(e.id),
      date: e.date,
      responses: parseResponses(e.content),
      rating: e.rating ? Number(e.rating) : undefined,
      commitmentsWon: winsByDate[e.date]?.won,
      commitmentsTotal: winsByDate[e.date]?.total,
    }))
    .filter(e => Object.values(e.responses).some(v => v && v.trim().length > 0));

  return <JournalClient entries={mapped} today={today} ratingLabel={settings.rating_label} />;
}
