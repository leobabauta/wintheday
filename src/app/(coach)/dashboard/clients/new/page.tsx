import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import CreateClientForm from '@/components/coach/CreateClientForm';

export default async function NewClientPage() {
  const session = await getSession();
  if (!session || session.role !== 'coach') redirect('/login');

  return (
    <div>
      <Link href="/dashboard" className="text-sm text-navy/50 hover:text-navy mb-1 block">
        ← Back to Dashboard
      </Link>
      <h1 className="text-2xl font-bold text-navy mb-6">Add New Client</h1>
      <div className="max-w-lg">
        <CreateClientForm />
      </div>
    </div>
  );
}
