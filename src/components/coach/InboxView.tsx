'use client';

import Link from 'next/link';
import { useState } from 'react';
import Button from '@/components/ui/Button';
import MutedMono from '@/components/ui/MutedMono';
import Avatar from '@/components/ui/Avatar';

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

interface Props {
  items: InboxItem[];
  onMarkAttended: (id: string) => Promise<void>;
  onReply: (item: InboxItem, content: string) => Promise<void>;
}

export default function InboxView({ items, onMarkAttended, onReply }: Props) {
  const [locallyDone, setLocallyDone] = useState<Set<string>>(new Set());
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const visible = items.filter(i => !locallyDone.has(i.id));

  const mark = async (id: string) => {
    setLocallyDone(prev => new Set([...prev, id]));
    await onMarkAttended(id);
  };

  const send = async (item: InboxItem) => {
    const text = draft.trim();
    if (!text) return;
    setSending(true);
    try {
      await onReply(item, text);
      setLocallyDone(prev => new Set([...prev, item.id]));
      setReplyingTo(null);
      setDraft('');
    } finally {
      setSending(false);
    }
  };

  const toggleReply = (id: string) => {
    if (replyingTo === id) {
      setReplyingTo(null);
      setDraft('');
    } else {
      setReplyingTo(id);
      setDraft('');
    }
  };

  return (
    <div className="max-w-[860px] mx-auto px-12 py-10 pb-20">
      <div className="mb-7">
        <MutedMono>Inbox</MutedMono>
        <h1 className="font-display text-[32px] mt-1 leading-[1.15]">
          {visible.length} {visible.length === 1 ? 'thing' : 'things'} to attend to
        </h1>
      </div>

      {visible.length === 0 ? (
        <div className="py-12 px-6 text-center border border-border rounded-[14px] bg-surface">
          <p className="reflection-text text-[20px] text-accent mb-1.5">All clear.</p>
          <MutedMono>You&apos;ve seen everyone today.</MutedMono>
        </div>
      ) : visible.map(it => {
        const isReplying = replyingTo === it.id;
        const canReply = it.kind === 'message';
        return (
          <div key={it.id} className="grid grid-cols-[44px_1fr_auto] gap-4 py-6 border-b border-border items-start">
            <Avatar name={it.clientName} avatarUrl={it.clientAvatarUrl} size={44} textSize={12} />
            <div>
              <div className="flex items-baseline gap-2.5 mb-1">
                <Link href={`/dashboard/clients/${it.clientId}`} className="text-[15px] text-text">
                  {it.clientName}
                </Link>
                <MutedMono>{it.kind === 'reflection' ? 'Reflection' : it.kind === 'message' ? 'Message' : 'Quiet'}</MutedMono>
                <MutedMono className="ml-auto">{it.at}</MutedMono>
              </div>
              <p className={`text-[15px] leading-[1.55] font-light text-text mb-1.5 text-pretty ${it.kind === 'reflection' ? 'font-display italic' : ''}`}>
                {it.kind === 'reflection' ? `"${it.preview}"` : it.preview}
              </p>
              <MutedMono>{it.meta}</MutedMono>

              {isReplying && (
                <div className="mt-3">
                  <textarea
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder={`Reply to ${it.clientName.split(' ')[0]}…`}
                    rows={3}
                    className="w-full text-[14px]"
                    onKeyDown={(e) => {
                      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') send(it);
                      if (e.key === 'Escape') toggleReply(it.id);
                    }}
                  />
                  <div className="flex items-center gap-2 mt-2">
                    <Button size="sm" onClick={() => send(it)} disabled={sending || !draft.trim()}>
                      {sending ? 'Sending…' : 'Send reply'}
                    </Button>
                    <button
                      type="button"
                      className="text-[11px] text-text-muted hover:text-text"
                      onClick={() => toggleReply(it.id)}
                    >
                      Cancel
                    </button>
                    <MutedMono className="ml-auto">⌘↵ to send</MutedMono>
                  </div>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-1.5 items-end">
              {canReply && !isReplying && (
                <Button size="sm" onClick={() => toggleReply(it.id)}>Reply</Button>
              )}
              <Link href={`/dashboard/clients/${it.clientId}`}>
                <Button size="sm" variant="outline">Open</Button>
              </Link>
              <button className="text-[11px] text-text-muted hover:text-text" onClick={() => mark(it.id)}>
                Mark attended
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
