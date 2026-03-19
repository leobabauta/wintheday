import { getSession } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { getUserSettings } from '@/lib/settings';
import { redirect } from 'next/navigation';
import CommitmentEditor from '@/components/wins/CommitmentEditor';
import ReflectionTimeSetting from '@/components/layout/ReflectionTimeSetting';
import DarkModeSetting from '@/components/layout/DarkModeSetting';
import NameSetting from '@/components/layout/NameSetting';
import RatingLabelSetting from '@/components/layout/RatingLabelSetting';
import LogoutButton from '@/components/layout/LogoutButton';

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const user = await queryOne<{ name: string }>('SELECT name FROM users WHERE id = $1', [session.userId]);

  const commitments = await query<{
    id: number; title: string; type: string; days_of_week: string; active: number;
  }>(
    'SELECT * FROM commitments WHERE user_id = $1 ORDER BY type, title',
    [session.userId]
  );

  const settings = await getUserSettings(session.userId);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold text-navy">Set Up Your Wins</h1>
        <LogoutButton />
      </div>
      <div className="space-y-4 mb-6">
        <NameSetting initialName={user?.name || ''} />
      </div>
      <CommitmentEditor initialCommitments={commitments} />
      <div className="mt-6 space-y-4">
        <RatingLabelSetting initialLabel={settings.rating_label} />
        <ReflectionTimeSetting initialTime={settings.reflection_time} />
        <DarkModeSetting initialDark={settings.dark_mode} />
      </div>
    </div>
  );
}
