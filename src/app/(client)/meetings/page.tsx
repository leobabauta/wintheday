import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import MeetingsList from '@/components/meetings/MeetingsList';

export default async function ClientMeetingsPage() {
  const session = await getSession();
  if (!session || session.role !== 'client') redirect('/login');

  return (
    <div>
      <h1 className="font-display text-[28px] leading-[1.15] text-text mb-6">Upcoming Sessions</h1>
      <MeetingsList />
    </div>
  );
}
