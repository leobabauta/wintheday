import { getSession } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { queryOne } from '@/lib/db';
import PreCoachingForm from '@/components/meetings/PreCoachingForm';

export default async function PreCoachingPage({
  params,
}: {
  params: Promise<{ meetingId: string }>;
}) {
  const session = await getSession();
  if (!session || session.role !== 'client') redirect('/login');

  const { meetingId } = await params;
  const id = parseInt(meetingId);

  const meeting = await queryOne<{
    id: number;
    starts_at: string;
    coach_name: string;
  }>(
    `SELECT m.id, m.starts_at, u.name AS coach_name
     FROM meetings m
     JOIN users u ON u.id = m.coach_id
     WHERE m.id = $1 AND m.client_id = $2`,
    [id, session.userId]
  );

  if (!meeting) notFound();

  return (
    <PreCoachingForm
      meetingId={meeting.id}
      meetingStartsAt={meeting.starts_at}
      coachName={meeting.coach_name}
    />
  );
}
