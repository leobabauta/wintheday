'use client';

import Link from 'next/link';
import { useState } from 'react';
import Button from '@/components/ui/Button';
import MutedMono from '@/components/ui/MutedMono';
import Avatar from '@/components/ui/Avatar';
import type { InboxItem, InboxPayload } from '@/lib/inbox';

interface Props {
  items: InboxItem[];
  avatars: InboxPayload['avatars'];
  /** 'archive' swaps the per-row actions for a single "Return to inbox". */
  mode?: 'inbox' | 'archive';
  onMarkAttended?: (item: InboxItem) => Promise<void>;
  onReply?: (item: InboxItem, content: string) => Promise<void>;
  onHeart?: (item: InboxItem) => Promise<void>;
  onRestore?: (item: InboxItem) => Promise<void>;
}

function HeartIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function kindLabel(kind: InboxItem['kind']) {
  if (kind === 'reflection') return 'Reflection';
  if (kind === 'message') return 'Message';
  if (kind === 'pre_coaching') return 'Pre-coaching';
  if (kind === 'completion') return 'All done';
  return 'Quiet';
}

export function hrefFor(it: InboxItem) {
  if (it.kind === 'pre_coaching' && it.meetingId) {
    return `/dashboard/clients/${it.clientId}/sessions/${it.meetingId}`;
  }
  if (it.kind === 'reflection') return `/dashboard/clients/${it.clientId}/journal`;
  // Land on the message itself rather than the top of a long client page
  // the coach then has to scroll through.
  if (it.kind === 'message' && it.messageId) {
    return `/dashboard/clients/${it.clientId}?tab=messages&message=${it.messageId}`;
  }
  return `/dashboard/clients/${it.clientId}`;
}

export default function InboxView({ items, avatars, mode = 'inbox', onMarkAttended, onReply, onHeart, onRestore }: Props) {
  const [locallyDone, setLocallyDone] = useState<Set<string>>(new Set());
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const visible = items.filter(i => !locallyDone.has(i.id));
  const isArchive = mode === 'archive';

  const mark = async (it: InboxItem) => {
    setLocallyDone(prev => new Set([...prev, it.id]));
    await onMarkAttended?.(it);
  };

  const heart = async (it: InboxItem) => {
    setLocallyDone(prev => new Set([...prev, it.id]));
    await onHeart?.(it);
  };

  const restore = async (it: InboxItem) => {
    setLocallyDone(prev => new Set([...prev, it.id]));
    await onRestore?.(it);
  };

  const send = async (item: InboxItem) => {
    const text = draft.trim();
    if (!text) return;
    setSending(true);
    try {
      await onReply?.(item, text);
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
    <section>
      <div className="flex items-baseline justify-between gap-4 mb-4">
        <div className="min-w-0">
          <MutedMono>{isArchive ? 'Archive' : 'Inbox'}</MutedMono>
          <h2 className="font-display text-[26px] md:text-[30px] mt-1 leading-[1.15]">
            {isArchive
              ? `${visible.length} attended to`
              : `${visible.length} ${visible.length === 1 ? 'thing' : 'things'} to attend to`}
          </h2>
        </div>
        {isArchive ? (
          <Link href="/dashboard" className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-muted hover:text-text whitespace-nowrap">
            ← Inbox
          </Link>
        ) : visible.length > 0 && (
          <Link href="/dashboard/archive" className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-muted hover:text-text whitespace-nowrap">
            Archive →
          </Link>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="py-10 px-6 text-center border border-border rounded-[14px] bg-surface">
          {isArchive ? (
            <>
              <p className="reflection-text text-[20px] text-accent mb-1.5">Nothing archived yet.</p>
              <MutedMono>Items you attend to land here.</MutedMono>
            </>
          ) : (
            <>
              <p className="reflection-text text-[20px] text-accent mb-1.5">All clear.</p>
              <MutedMono>You&apos;ve seen everyone today.</MutedMono>
              <div className="mt-4">
                <Link href="/dashboard/archive">
                  <Button size="sm" variant="outline">Open archive</Button>
                </Link>
              </div>
            </>
          )}
        </div>
      ) : visible.map(it => {
        const isReplying = replyingTo === it.id;
        const canReply = !isArchive && it.kind === 'message';
        return (
          <div key={it.id} className="grid grid-cols-[40px_1fr] md:grid-cols-[44px_1fr_auto] gap-3 md:gap-4 py-5 md:py-6 border-b border-border items-start">
            <Avatar name={it.clientName} avatarUrl={avatars[it.clientId]} size={40} textSize={12} />
            <div className="min-w-0">
              <div className="flex items-baseline gap-2.5 mb-1 flex-wrap">
                <Link href={`/dashboard/clients/${it.clientId}`} className="text-[15px] text-text">
                  {it.clientName}
                </Link>
                <MutedMono>{kindLabel(it.kind)}</MutedMono>
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
                    className="w-full text-[16px]"
                    onKeyDown={(e) => {
                      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') send(it);
                      if (e.key === 'Escape') toggleReply(it.id);
                    }}
                  />
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
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
                    <MutedMono className="ml-auto hidden md:block">⌘↵ to send</MutedMono>
                  </div>
                </div>
              )}
            </div>

            {/* On a phone the actions sit under the text, in the content
                column; on a wide screen they get their own right-hand rail. */}
            <div className="col-start-2 md:col-start-3 flex flex-row md:flex-col flex-wrap items-center md:items-end gap-2 md:gap-1.5 mt-3 md:mt-0">
              {canReply && !isReplying && (
                <Button size="sm" onClick={() => toggleReply(it.id)}>Reply</Button>
              )}
              <Link href={hrefFor(it)}>
                <Button size="sm" variant={!isArchive && it.kind === 'pre_coaching' ? 'filled' : 'outline'}>
                  {it.kind === 'pre_coaching'
                    ? 'Read form'
                    : it.kind === 'reflection'
                      ? 'Read entry'
                      : 'Open'}
                </Button>
              </Link>
              {isArchive ? (
                <button
                  className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-muted hover:text-text"
                  onClick={() => restore(it)}
                >
                  Return to inbox
                </button>
              ) : (
                <>
                  {(it.kind === 'reflection' || it.kind === 'completion') && (
                    <button
                      type="button"
                      onClick={() => heart(it)}
                      title={it.kind === 'reflection' ? 'Heart this reflection' : 'Congratulate on winning the day'}
                      className="text-accent hover:text-accent-dark transition-colors p-1 md:-mr-1"
                    >
                      <HeartIcon />
                    </button>
                  )}
                  {(it.kind === 'message' || it.kind === 'reflection' || it.kind === 'completion') && (
                    <button className="text-[11px] text-text-muted hover:text-text" onClick={() => mark(it)}>
                      Mark attended
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })}
    </section>
  );
}
