'use client';

import { useRouter } from 'next/navigation';
import InboxView from './InboxView';
import type { InboxItem, InboxPayload } from '@/lib/inbox';

export default function InboxClient({ items, avatars }: InboxPayload) {
  const router = useRouter();

  const onMarkAttended = async (item: InboxItem) => {
    if (item.kind === 'message' && item.messageId) {
      await fetch('/api/messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [item.messageId] }),
      });
    } else if (item.kind === 'reflection' && item.journalId) {
      await fetch('/api/journal', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [item.journalId] }),
      });
    } else if (item.kind === 'completion' && item.completionUserId && item.completionDate) {
      await fetch('/api/daily-completions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: [{ userId: item.completionUserId, date: item.completionDate }] }),
      });
    }
    // Pre-coaching items leave the inbox on their own once opened (opened_at
    // is stamped server-side when the coach lands on the session detail).
    router.refresh();
  };

  const onHeart = async (item: InboxItem) => {
    if (item.kind === 'reflection' && item.journalId) {
      await fetch('/api/journal', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [item.journalId], heart: true }),
      });
    } else if (item.kind === 'completion' && item.completionUserId && item.completionDate) {
      await fetch('/api/daily-completions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: [{ userId: item.completionUserId, date: item.completionDate }],
          heart: true,
        }),
      });
    }
    router.refresh();
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
  };

  return <InboxView items={items} avatars={avatars} onMarkAttended={onMarkAttended} onReply={onReply} onHeart={onHeart} />;
}
