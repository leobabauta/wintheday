'use client';

import { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

interface Message {
  id: number;
  sender_id: number;
  sender_name: string;
  recipient_id: number;
  type: string;
  content: string;
  parent_id: number | null;
  read: number;
  archived: number;
  created_at: string;
}

function TypeBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    question: 'bg-navy/10 text-navy',
    flag: 'bg-warning/10 text-warning',
    celebration: 'bg-warning/10 text-warning',
    reply: 'bg-lavender-dark/30 text-navy/60',
  };
  return (
    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-medium ${styles[type] || styles.reply}`}>
      {type}
    </span>
  );
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function InboxView({ messages: initialMessages, coachId }: { messages: Message[]; coachId: number }) {
  const [messages, setMessages] = useState(initialMessages);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [sending, setSending] = useState(false);

  const selected = messages.find(m => m.id === selectedId) || null;

  const handleSelect = async (msg: Message) => {
    setSelectedId(msg.id);
    setReplyContent('');

    // Mark as read
    if (!msg.read) {
      await fetch('/api/messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [msg.id] }),
      });
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, read: 1 } : m));
    }
  };

  const handleReply = async () => {
    if (!replyContent.trim() || !selected) return;
    setSending(true);

    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientId: selected.sender_id,
          type: 'reply',
          content: replyContent.trim(),
          parentId: selected.id,
        }),
      });
      setReplyContent('');
    } catch {
      // ignore
    } finally {
      setSending(false);
    }
  };

  const handleArchive = async (msgId: number) => {
    await fetch('/api/messages/archive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [msgId] }),
    });
    setMessages(prev => prev.filter(m => m.id !== msgId));
    if (selectedId === msgId) setSelectedId(null);
  };

  return (
    <div className="flex gap-4 min-h-[60vh]">
      {/* Message list — left side */}
      <div className="w-full md:w-2/5 space-y-1 overflow-y-auto max-h-[75vh]">
        {messages.length === 0 ? (
          <Card className="text-center py-8">
            <p className="text-sm text-navy/40">All caught up!</p>
          </Card>
        ) : (
          messages.map(msg => (
            <button
              key={msg.id}
              onClick={() => handleSelect(msg)}
              className={`w-full text-left p-3 rounded-xl transition-colors ${
                selectedId === msg.id
                  ? 'bg-navy/5 ring-1 ring-navy/20'
                  : msg.read ? 'bg-card hover:bg-lavender-light/40' : 'bg-card hover:bg-lavender-light/40 border-l-2 border-navy'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-sm ${msg.read ? 'text-navy/60' : 'font-semibold text-navy'}`}>
                  {msg.sender_name}
                </span>
                <span className="text-[10px] text-navy/40">{formatTime(msg.created_at)}</span>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <TypeBadge type={msg.type} />
              </div>
              <p className="text-xs text-navy/50 line-clamp-2">{msg.content}</p>
            </button>
          ))
        )}
      </div>

      {/* Message detail — right side */}
      <div className="hidden md:block md:w-3/5">
        {selected ? (
          <Card className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-navy">{selected.sender_name}</span>
                  <TypeBadge type={selected.type} />
                </div>
                <span className="text-xs text-navy/40">
                  {new Date(selected.created_at).toLocaleDateString('en-US', {
                    month: 'long', day: 'numeric', year: 'numeric',
                    hour: 'numeric', minute: '2-digit',
                  })}
                </span>
              </div>
              <button
                onClick={() => handleArchive(selected.id)}
                className="text-xs text-navy/40 hover:text-navy transition-colors px-3 py-1.5 rounded-xl hover:bg-lavender-light/40"
              >
                Archive
              </button>
            </div>

            <div className="flex-1 mb-4">
              <p className="text-sm text-navy/80 whitespace-pre-wrap">{selected.content}</p>
            </div>

            <div className="border-t border-lavender-dark/10 pt-4">
              <textarea
                value={replyContent}
                onChange={e => setReplyContent(e.target.value)}
                placeholder="Write your reply..."
                className="w-full h-24 bg-lavender-light/40 rounded-xl p-3 text-sm text-navy outline-none resize-none focus:ring-1 focus:ring-navy/20 mb-3"
              />
              <div className="flex gap-2">
                <Button onClick={handleReply} size="sm" disabled={!replyContent.trim() || sending}>
                  {sending ? 'Sending...' : 'Reply'}
                </Button>
                <button
                  onClick={() => handleArchive(selected.id)}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium text-navy/50 hover:text-navy hover:bg-lavender-light/40 transition-colors"
                >
                  Archive & Next
                </button>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="h-full flex items-center justify-center">
            <p className="text-sm text-navy/40">Select a message to view</p>
          </Card>
        )}
      </div>

      {/* Mobile detail — shown below list when selected */}
      {selected && (
        <div className="fixed inset-0 z-40 bg-white/95 md:hidden p-4 overflow-y-auto">
          <button
            onClick={() => setSelectedId(null)}
            className="text-sm text-navy/50 hover:text-navy mb-4"
          >
            ← Back to inbox
          </button>
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-navy">{selected.sender_name}</span>
                  <TypeBadge type={selected.type} />
                </div>
                <span className="text-xs text-navy/40">
                  {new Date(selected.created_at).toLocaleDateString('en-US', {
                    month: 'long', day: 'numeric',
                    hour: 'numeric', minute: '2-digit',
                  })}
                </span>
              </div>
            </div>

            <p className="text-sm text-navy/80 whitespace-pre-wrap mb-6">{selected.content}</p>

            <div className="border-t border-lavender-dark/10 pt-4">
              <textarea
                value={replyContent}
                onChange={e => setReplyContent(e.target.value)}
                placeholder="Write your reply..."
                className="w-full h-24 bg-lavender-light/40 rounded-xl p-3 text-sm text-navy outline-none resize-none focus:ring-1 focus:ring-navy/20 mb-3"
              />
              <div className="flex gap-2">
                <Button onClick={handleReply} size="sm" disabled={!replyContent.trim() || sending}>
                  {sending ? 'Sending...' : 'Reply'}
                </Button>
                <button
                  onClick={() => handleArchive(selected.id)}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium text-navy/50 hover:text-navy transition-colors"
                >
                  Archive
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
