'use client';

import { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

interface Message {
  id: number;
  sender_id: number;
  recipient_id: number;
  sender_name: string;
  type: string;
  content: string;
  parent_id: number | null;
  read: number;
  created_at: string;
}

interface Props {
  messages: Message[];
  userId: number;
  coachId: number;
  isCoach?: boolean;
  clientName?: string;
}

function QuestionIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function FlagIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  );
}

function ReplyIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function CelebrationIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function SendIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function TypeIcon({ type }: { type: string }) {
  switch (type) {
    case 'question': return <span className="text-muted"><QuestionIcon /></span>;
    case 'flag': return <span className="text-warning"><FlagIcon /></span>;
    case 'reply': return <span className="text-muted"><ReplyIcon /></span>;
    case 'celebration': return <span className="text-warning"><CelebrationIcon /></span>;
    default: return <span className="text-muted"><ReplyIcon /></span>;
  }
}

export default function MessageThread({ messages, userId, coachId, isCoach = false, clientName }: Props) {
  const [msgList, setMsgList] = useState(messages);
  const [content, setContent] = useState('');
  const [msgType, setMsgType] = useState<'question' | 'flag'>('question');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!content.trim()) return;
    setSending(true);

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientId: isCoach ? parseInt(String(userId)) : coachId,
          type: isCoach ? 'reply' : msgType,
          content: content.trim(),
        }),
      });
      const data = await res.json();

      setMsgList(prev => [{
        id: data.id,
        sender_id: isCoach ? coachId : userId,
        recipient_id: isCoach ? userId : coachId,
        sender_name: isCoach ? 'Coach' : 'You',
        type: isCoach ? 'reply' : msgType,
        content: content.trim(),
        parent_id: null,
        read: 0,
        created_at: new Date().toISOString(),
      }, ...prev]);

      setContent('');
    } catch {
      // ignore
    } finally {
      setSending(false);
    }
  };

  const handleCelebration = async () => {
    if (!isCoach) return;
    setSending(true);

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientId: userId,
          type: 'celebration',
          content: 'Great job winning the day!',
        }),
      });
      const data = await res.json();

      setMsgList(prev => [{
        id: data.id,
        sender_id: coachId,
        recipient_id: userId,
        sender_name: 'Coach',
        type: 'celebration',
        content: 'Great job winning the day!',
        parent_id: null,
        read: 0,
        created_at: new Date().toISOString(),
      }, ...prev]);
    } catch {
      // ignore
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' at ' +
      d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  return (
    <div>
      {/* Send form */}
      <Card className="mb-4">
        <h2 className="text-xs font-semibold text-navy/50 uppercase tracking-wider mb-4">
          {isCoach ? `Reply to ${clientName || 'Client'}` : 'Send to Coach'}
        </h2>

        {!isCoach && (
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setMsgType('question')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                msgType === 'question' ? 'bg-muted text-white' : 'bg-lavender-light text-navy/50'
              }`}
            >
              <QuestionIcon size={14} />
              Question
            </button>
            <button
              onClick={() => setMsgType('flag')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                msgType === 'flag' ? 'bg-muted text-white' : 'bg-lavender-light text-navy/50'
              }`}
            >
              <FlagIcon size={14} />
              Flag a Struggle
            </button>
          </div>
        )}

        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder={isCoach ? 'Write your reply...' : msgType === 'question' ? 'Ask your coach a question...' : 'Describe what you\'re struggling with...'}
          className="w-full h-24 bg-lavender-light/40 rounded-xl p-3 text-sm text-navy outline-none resize-none focus:ring-1 focus:ring-navy/20 mb-3"
        />

        <div className="flex gap-2">
          <Button onClick={handleSend} size="sm" disabled={!content.trim() || sending}>
            <span className="flex items-center gap-1.5">
              <SendIcon size={14} />
              {sending ? 'Sending...' : 'Send'}
            </span>
          </Button>
          {isCoach && (
            <button
              onClick={handleCelebration}
              disabled={sending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-warning/10 text-warning hover:bg-warning/20 transition-colors disabled:opacity-50"
            >
              <CelebrationIcon size={14} />
              Celebrate
            </button>
          )}
        </div>
      </Card>

      {/* Message list */}
      <Card>
        <h2 className="text-xs font-semibold text-navy/50 uppercase tracking-wider mb-4">Messages</h2>
        {msgList.length === 0 ? (
          <p className="text-sm text-navy/40 text-center py-4">No messages yet</p>
        ) : (
          <div className="space-y-3">
            {msgList.map(msg => {
              const isOwn = msg.sender_id === (isCoach ? coachId : userId);
              return (
                <div
                  key={msg.id}
                  className={`p-3 rounded-xl ${
                    msg.type === 'celebration'
                      ? 'bg-warning/5 border border-warning/20'
                      : isOwn
                      ? 'bg-lavender-light/40'
                      : 'bg-white border border-lavender-dark/20'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <TypeIcon type={msg.type} />
                    <span className="text-xs font-medium text-navy">{msg.sender_name}</span>
                    <span className="text-xs text-navy/40">{formatTime(msg.created_at)}</span>
                  </div>
                  <p className="text-sm text-navy/80 whitespace-pre-wrap">{msg.content}</p>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
