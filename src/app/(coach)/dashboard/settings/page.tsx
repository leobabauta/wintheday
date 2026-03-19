import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import PasswordSetting from '@/components/layout/PasswordSetting';

export default async function CoachSettingsPage() {
  const session = await getSession();
  if (!session || session.role !== 'coach') redirect('/login');

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy mb-6">Settings</h1>
      <div className="max-w-md space-y-4">
        <PasswordSetting />
      </div>
    </div>
  );
}
