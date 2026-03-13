import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import CommitmentEditor from '@/components/wins/CommitmentEditor';

export default async function EditClientCommitmentsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'coach') redirect('/login');

  const { id } = await params;
  const clientId = parseInt(id);
  const db = getDb();

  // Verify coach owns this client
  const clientInfo = db.prepare(
    'SELECT ci.*, u.name FROM client_info ci JOIN users u ON u.id = ci.user_id WHERE ci.user_id = ? AND ci.coach_id = ?'
  ).get(clientId, session.userId) as { name: string } | undefined;

  if (!clientInfo) notFound();

  const commitments = db.prepare(
    'SELECT * FROM commitments WHERE user_id = ? ORDER BY type, title'
  ).all(clientId) as Array<{
    id: number; title: string; type: string; days_of_week: string; active: number;
  }>;

  return (
    <div>
      <Link href={`/dashboard/clients/${clientId}`} className="text-sm text-navy/50 hover:text-navy mb-1 block">
        ← Back to {clientInfo.name}
      </Link>
      <h1 className="text-2xl font-bold text-navy mb-6">
        Edit Wins for {clientInfo.name}
      </h1>
      <div className="max-w-lg">
        <CommitmentEditor initialCommitments={commitments} userId={clientId} />
      </div>
    </div>
  );
}
