import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { getUserSettings } from '@/lib/settings';
import { redirect } from 'next/navigation';
import WelcomeFlow from '@/components/wins/WelcomeFlow';

export default async function WelcomePage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const settings = getUserSettings(session.userId);
  if (settings.onboarded) redirect('/today');

  const db = getDb();
  const user = db.prepare('SELECT name FROM users WHERE id = ?').get(session.userId) as { name: string };

  return <WelcomeFlow userName={user.name} />;
}
