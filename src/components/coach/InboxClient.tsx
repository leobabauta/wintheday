'use client';

import { useRouter } from 'next/navigation';
import InboxView from './InboxView';

interface InboxItem {
  id: string;
  clientId: string;
  clientName: string;
  clientInitials: string;
  kind: 'reflection' | 'message' | 'quiet';
  at: string;
  preview: string;
  meta: string;
}

export default function InboxClient({ items }: { items: InboxItem[] }) {
  const router = useRouter();

  const onMarkAttended = async (id: string) => {
    await fetch('/api/messages', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [Number(id)] }),
    });
    router.refresh();
  };

  return <InboxView items={items} onMarkAttended={onMarkAttended} />;
}
