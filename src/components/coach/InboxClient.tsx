'use client';

import { useRouter } from 'next/navigation';
import InboxView from './InboxView';
import { INBOX_REFRESH_EVENT } from '@/components/layout/InboxBadge';

interface InboxItem {
  id: string;
  clientId: string;
  clientName: string;
  clientAvatarUrl?: string | null;
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
    window.dispatchEvent(new CustomEvent(INBOX_REFRESH_EVENT));
  };

  return <InboxView items={items} onMarkAttended={onMarkAttended} />;
}
