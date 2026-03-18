import { getSession } from '@/lib/auth';
import { queryOne } from '@/lib/db';
import { getTodaysWins, getDateString } from '@/lib/wins';
import { getUserSettings } from '@/lib/settings';
import { redirect } from 'next/navigation';
import DailyWins from '@/components/wins/DailyWins';
import SplashScreen from '@/components/layout/SplashScreen';

export default async function TodayPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const settings = await getUserSettings(session.userId);

  if (!settings.onboarded) {
    redirect('/welcome');
  }

  const user = await queryOne<{ name: string }>('SELECT name FROM users WHERE id = $1', [session.userId]);
  const wins = await getTodaysWins(session.userId);
  const today = getDateString();

  const todayEntry = await queryOne<{ content: string }>(
    'SELECT content FROM journal_entries WHERE user_id = $1 AND date = $2',
    [session.userId, today]
  );

  return (
    <SplashScreen userName={user!.name}>
      <DailyWins
        initialWins={wins}
        userName={user!.name}
        reflectionTime={settings.reflection_time}
        existingReflection={todayEntry?.content || ''}
        date={today}
        reflectionSnoozedUntil={settings.reflection_snoozed_until}
        reflectionSkippedDate={settings.reflection_skipped_date}
      />
    </SplashScreen>
  );
}
