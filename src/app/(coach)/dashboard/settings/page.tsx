import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import PasswordSetting from '@/components/layout/PasswordSetting';
import IntegrationSettings from '@/components/coach/IntegrationSettings';

export default async function CoachSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ gcal?: string }>;
}) {
  const session = await getSession();
  if (!session || session.role !== 'coach') redirect('/login');

  const { gcal } = await searchParams;

  return (
    <div>
      <h1 className="font-display text-[28px] leading-[1.15] text-text mb-6">Settings</h1>
      <div className="max-w-md space-y-4">
        <PasswordSetting />
        <IntegrationSettings flash={gcal ?? null} />
      </div>
    </div>
  );
}
