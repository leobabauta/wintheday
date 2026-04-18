import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import CreateClientForm from '@/components/coach/CreateClientForm';

export default async function NewClientPage() {
  const session = await getSession();
  if (!session || session.role !== 'coach') redirect('/login');

  return (
    <div>
      <Link href="/dashboard" className="text-sm text-text-muted hover:text-text mb-1 block">
        ← Back to Dashboard
      </Link>
      <h1 className="font-display text-[28px] leading-[1.15] text-text mb-6">Add New Client</h1>
      <div className="max-w-lg">
        <CreateClientForm />
      </div>
    </div>
  );
}
