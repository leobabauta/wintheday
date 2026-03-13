import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { getDateString } from '@/lib/wins';
import { redirect } from 'next/navigation';
import JournalView from '@/components/journal/JournalView';

export default async function JournalPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const db = getDb();
  const today = getDateString();

  const allEntries = db.prepare(
    'SELECT * FROM journal_entries WHERE user_id = ? ORDER BY date DESC LIMIT 30'
  ).all(session.userId) as Array<{ id: number; date: string; content: string; updated_at: string }>;

  return <JournalView entries={allEntries} today={today} />;
}
