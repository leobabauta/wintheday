import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';
import { getDateString } from '@/lib/wins';
import { redirect } from 'next/navigation';
import JournalView from '@/components/journal/JournalView';

export default async function JournalPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const today = getDateString();

  const allEntries = await query<{ id: number; date: string; content: string; updated_at: string }>(
    'SELECT * FROM journal_entries WHERE user_id = $1 ORDER BY date DESC LIMIT 30',
    [session.userId]
  );

  return <JournalView entries={allEntries} today={today} />;
}
