import { getSession } from '@/lib/auth';
import { queryOne } from '@/lib/db';
import { getUserSettings } from '@/lib/settings';
import { redirect } from 'next/navigation';
import TodayClient from '@/components/wins/TodayClient';
import SplashScreen from '@/components/layout/SplashScreen';

export default async function TodayPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const settings = await getUserSettings(session.userId);

  if (!settings.onboarded) {
    redirect('/welcome');
  }

  const user = await queryOne<{ name: string }>('SELECT name FROM users WHERE id = $1', [session.userId]);

  return (
    <SplashScreen userName={user!.name}>
      <TodayClient
        userName={user!.name}
        ratingLabel={settings.rating_label}
      />
    </SplashScreen>
  );
}
