'use client';

import { useRouter } from 'next/navigation';
import InboxView from './InboxView';
import type { InboxItem, InboxPayload } from '@/lib/inbox';

export default function ArchiveClient({ items, avatars }: InboxPayload) {
  const router = useRouter();

  const onRestore = async (item: InboxItem) => {
    await fetch('/api/inbox/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: item.kind,
        messageId: item.messageId,
        journalId: item.journalId,
        preCoachingLogId: item.preCoachingLogId,
        completionUserId: item.completionUserId,
        completionDate: item.completionDate,
      }),
    });
    router.refresh();
  };

  return <InboxView items={items} avatars={avatars} mode="archive" onRestore={onRestore} />;
}
