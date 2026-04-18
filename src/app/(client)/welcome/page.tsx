import { getSession } from '@/lib/auth';
import { queryOne } from '@/lib/db';
import { getUserSettings } from '@/lib/settings';
import { redirect } from 'next/navigation';
import WelcomeFlowWrapper from '@/components/wins/WelcomeFlowWrapper';

export default async function WelcomePage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const settings = await getUserSettings(session.userId);
  if (settings.onboarded) redirect('/today');

  const user = await queryOne<{ name: string }>('SELECT name FROM users WHERE id = $1', [session.userId]);

  return <WelcomeFlowWrapper userName={user!.name} />;
}
