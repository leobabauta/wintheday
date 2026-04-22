'use client';

import { useRouter } from 'next/navigation';
import InboxView from './InboxView';
import { INBOX_REFRESH_EVENT } from '@/components/layout/InboxBadge';

interface InboxItem {
  id: string;
  messageId?: number;
  meetingId?: number;
  clientId: string;
  clientName: string;
  clientAvatarUrl?: string | null;
  kind: 'reflection' | 'message' | 'quiet' | 'pre_coaching';
  at: string;
  preview: string;
  meta: string;
}

export default function InboxClient({ items }: { items: InboxItem[] }) {
  const router = useRouter();

  const onMarkAttended = async (item: InboxItem) => {
    if (item.kind === 'message' && item.messageId) {
      await fetch('/api/messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [item.messageId] }),
      });
    }
    // Pre-coaching items leave the inbox on their own once opened (opened_at
    // is stamped server-side when the coach lands on the session detail).
    router.refresh();
    window.dispatchEvent(new CustomEvent(INBOX_REFRESH_EVENT));
  };

  const onReply = async (item: InboxItem, content: string) => {
    if (!item.messageId) return;
    await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipientId: Number(item.clientId),
        type: 'reply',
        content,
        parentId: item.messageId,
      }),
    });
    await fetch('/api/messages', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [item.messageId] }),
    });
    router.refresh();
    window.dispatchEvent(new CustomEvent(INBOX_REFRESH_EVENT));
  };

  return <InboxView items={items} onMarkAttended={onMarkAttended} onReply={onReply} />;
}
