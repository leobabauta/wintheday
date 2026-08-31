import { getSession } from '@/lib/auth';
import { getArchivedItems } from '@/lib/inbox';
import { redirect } from 'next/navigation';
import ArchiveClient from '@/components/coach/ArchiveClient';

export default async function ArchivePage() {
  const session = await getSession();
  if (!session || session.role !== 'coach') redirect('/login');

  const { items, avatars } = await getArchivedItems(session.userId);
  return <ArchiveClient items={items} avatars={avatars} />;
}
