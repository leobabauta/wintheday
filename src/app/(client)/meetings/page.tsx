import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import MeetingsList from '@/components/meetings/MeetingsList';

// ZHD page wrapper: mono-caps eyebrow + Jost title, matching Today/Journal.
// The "Sessions." title ends in a period — that's the house voice.

export default async function ClientMeetingsPage() {
  const session = await getSession();
  if (!session || session.role !== 'client') redirect('/login');

  return (
    <div>
      <div className="mb-7 mt-3">
        <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-text-muted mb-2">
          Coaching
        </p>
        <h1 className="text-[28px] font-light tracking-[-0.01em] leading-[1.15] text-text">
          Sessions.
        </h1>
      </div>
      <MeetingsList />
    </div>
  );
}
