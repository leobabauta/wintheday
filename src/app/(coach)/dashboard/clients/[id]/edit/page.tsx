import { getSession } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import CommitmentEditor from '@/components/wins/CommitmentEditor';

export default async function EditClientCommitmentsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'coach') redirect('/login');

  const { id } = await params;
  const clientId = parseInt(id);

  // Verify coach owns this client
  const clientInfo = await queryOne<{ name: string }>(
    'SELECT ci.*, u.name FROM client_info ci JOIN users u ON u.id = ci.user_id WHERE ci.user_id = $1 AND ci.coach_id = $2',
    [clientId, session.userId]
  );

  if (!clientInfo) notFound();

  const commitments = await query<{
    id: number; title: string; type: string; days_of_week: string; active: number;
  }>(
    'SELECT * FROM commitments WHERE user_id = $1 ORDER BY type, title',
    [clientId]
  );

  return (
    <div>
      <Link href={`/dashboard/clients/${clientId}`} className="text-sm text-text-muted hover:text-text mb-1 block">
        ← Back to {clientInfo.name}
      </Link>
      <h1 className="font-display text-[28px] leading-[1.15] text-text mb-6">
        Edit Wins for {clientInfo.name}
      </h1>
      <div className="max-w-lg">
        <CommitmentEditor initialCommitments={commitments} userId={clientId} />
      </div>
    </div>
  );
}
