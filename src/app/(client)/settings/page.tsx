import { getSession } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { getUserSettings } from '@/lib/settings';
import { redirect } from 'next/navigation';
import CommitmentEditor from '@/components/wins/CommitmentEditor';
import ReflectionTimeSetting from '@/components/layout/ReflectionTimeSetting';
import NameSetting from '@/components/layout/NameSetting';
import EmailSetting from '@/components/layout/EmailSetting';
import RatingLabelSetting from '@/components/layout/RatingLabelSetting';
import PasswordSetting from '@/components/layout/PasswordSetting';
import NudgeSettingsCard from '@/components/layout/NudgeSettingsCard';
import LogoutButton from '@/components/layout/LogoutButton';
import MutedMono from '@/components/ui/MutedMono';

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const user = await queryOne<{ name: string; email: string }>(
    'SELECT name, email FROM users WHERE id = $1',
    [session.userId]
  );

  const commitments = await query<{
    id: number; title: string; type: string; days_of_week: string; active: number;
  }>(
    'SELECT * FROM commitments WHERE user_id = $1 ORDER BY type, title',
    [session.userId]
  );

  const settings = await getUserSettings(session.userId);

  return (
    <div>
      {/* Header — ZHD eyebrow + display */}
      <div className="mb-10">
        <MutedMono>Account</MutedMono>
        <h1 className="font-display text-[34px] leading-[1.05] tracking-[-0.01em] mt-2">Me.</h1>
        <p className="reflection-text text-text-secondary text-[15px] mt-2">
          Shape what you&apos;re practicing, and how this shows up for you.
        </p>
      </div>

      {/* You */}
      <section className="mb-10">
        <h2 className="font-mono text-[10px] tracking-[0.22em] uppercase text-text-muted mb-4">You</h2>
        <div>
          <NameSetting initialName={user?.name || ''} />
          <EmailSetting initialEmail={user?.email || ''} />
          <PasswordSetting />
        </div>
      </section>

      {/* Your wins */}
      <section className="mb-10">
        <h2 className="font-mono text-[10px] tracking-[0.22em] uppercase text-text-muted mb-4">Your wins</h2>
        <CommitmentEditor initialCommitments={commitments} />
      </section>

      {/* Reflection */}
      <section className="mb-10">
        <h2 className="font-mono text-[10px] tracking-[0.22em] uppercase text-text-muted mb-4">Reflection</h2>
        <div>
          <RatingLabelSetting initialLabel={settings.rating_label} />
          <ReflectionTimeSetting initialTime={settings.reflection_time} />
        </div>
      </section>

      {/* Nudges */}
      <section className="mb-10">
        <h2 className="font-mono text-[10px] tracking-[0.22em] uppercase text-text-muted mb-4">Nudges</h2>
        <NudgeSettingsCard />
      </section>

      {/* Sign out */}
      <div className="pt-6 border-t border-border">
        <LogoutButton />
      </div>
    </div>
  );
}
