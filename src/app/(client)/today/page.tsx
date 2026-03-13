import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { getTodaysWins, getDateString } from '@/lib/wins';
import { getUserSettings } from '@/lib/settings';
import { redirect } from 'next/navigation';
import DailyWins from '@/components/wins/DailyWins';
import SplashScreen from '@/components/layout/SplashScreen';

export default async function TodayPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const settings = getUserSettings(session.userId);

  if (!settings.onboarded) {
    redirect('/welcome');
  }

  const db = getDb();
  const user = db.prepare('SELECT name FROM users WHERE id = ?').get(session.userId) as { name: string };
  const wins = getTodaysWins(session.userId);
  const today = getDateString();

  const todayEntry = db.prepare(
    'SELECT content FROM journal_entries WHERE user_id = ? AND date = ?'
  ).get(session.userId, today) as { content: string } | undefined;

  return (
    <SplashScreen userName={user.name}>
      <DailyWins
        initialWins={wins}
        userName={user.name}
        reflectionTime={settings.reflection_time}
        existingReflection={todayEntry?.content || ''}
        date={today}
      />
    </SplashScreen>
  );
}
