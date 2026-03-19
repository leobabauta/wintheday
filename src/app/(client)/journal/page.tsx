import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';
import { getDateString } from '@/lib/wins';
import { getUserSettings } from '@/lib/settings';
import { redirect } from 'next/navigation';
import JournalView from '@/components/journal/JournalView';

export default async function JournalPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const today = getDateString();
  const settings = await getUserSettings(session.userId);

  const allEntries = await query<{ id: number; date: string; content: string; rating: number | null; updated_at: string }>(
    'SELECT * FROM journal_entries WHERE user_id = $1 ORDER BY date DESC LIMIT 30',
    [session.userId]
  );

  // Fetch wins for each entry date
  const entryDates = allEntries.map(e => e.date);
  let winsMap: Record<string, { title: string; type: string; completed: number }[]> = {};

  if (entryDates.length > 0) {
    const placeholders = entryDates.map((_, i) => `$${i + 2}`).join(',');
    const wins = await query<{ date: string; title: string; type: string; completed: number }>(
      `SELECT w.date, c.title, c.type, w.completed
       FROM win_entries w
       JOIN commitments c ON c.id = w.commitment_id
       WHERE w.user_id = $1 AND w.date IN (${placeholders})
       ORDER BY c.type, c.title`,
      [session.userId, ...entryDates]
    );

    for (const w of wins) {
      if (!winsMap[w.date]) winsMap[w.date] = [];
      winsMap[w.date].push({ title: w.title, type: w.type, completed: w.completed });
    }
  }

  return <JournalView entries={allEntries} today={today} winsMap={winsMap} ratingLabel={settings.rating_label} />;
}
