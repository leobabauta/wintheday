'use client';

import { useEffect, useRef, useState } from 'react';
import MutedMono from '@/components/ui/MutedMono';
import Avatar from '@/components/ui/Avatar';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';

function fmtElapsed(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

interface DbRow {
  id: number;
  sender_id: number;
  recipient_id: number;
  sender_name: string;
  content: string;
  created_at: string;
  attachment_url?: string | null;
  attachment_type?: string | null;
}

interface Props {
  initial: DbRow[];
  coachUserId: number;
  clientUserId: number;
  clientName: string;
  clientAvatarUrl?: string | null;
}

interface UiMessage {
  id: string;
  fromCoach: boolean;
  text: string;
  date: string;
  time: string;
  createdAt: string;
  attachmentUrl?: string | null;
}

type UploadState =
  | { status: 'idle' }
  | { status: 'uploading'; previewUrl: string }
  | { status: 'ready'; previewUrl: string; url: string; type: string };

function toParts(iso: string) {
  const d = new Date(iso);
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return { date, time };
}

function todayLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dateLabel(iso: string, today: string) {
  if (iso === today) return 'Today';
  const t = new Date(today + 'T12:00:00');
  const d = new Date(iso + 'T12:00:00');
  const diff = Math.round((t.getTime() - d.getTime()) / 86400000);
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).toUpperCase();
}

export default function MessageThreadCoach({ initial, coachUserId, clientUserId, clientName, clientAvatarUrl }: Props) {
  const [rows, setRows] = useState<DbRow[]>([...initial].reverse());
  const [draft, setDraft] = useState('');
  const [upload, setUpload] = useState<UploadState>({ status: 'idle' });
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const today = todayLocal();

  useEffect(() => {
    setRows([...initial].reverse());
  }, [initial]);

  useEffect(() => {
    let cancelled = false;
    const fetchMessages = async () => {
      try {
        const res = await fetch(`/api/messages?clientId=${clientUserId}`, { cache: 'no-store' });
        if (!res.ok) return;
        const data: DbRow[] = await res.json();
        if (!cancelled) setRows([...data].reverse());
      } catch {
        // swallow — next poll will retry
      }
    };
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') fetchMessages();
    }, 4000);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') fetchMessages();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [clientUserId]);

  useEffect(() => {
    if (endRef.current) endRef.current.scrollTop = endRef.current.scrollHeight;
  }, [rows.length]);

  const messages: UiMessage[] = rows.map(r => {
    const { date, time } = toParts(r.created_at);
    return {
      id: String(r.id),
      fromCoach: r.sender_id === coachUserId,
      text: r.content,
      date,
      time,
      createdAt: r.created_at,
      attachmentUrl: r.attachment_url,
    };
  });

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const previewUrl = URL.createObjectURL(file);
    setUpload({ status: 'uploading', previewUrl });

    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/messages/upload', {
        method: 'POST',
        credentials: 'include',
        body: form,
      });
      if (!res.ok) throw new Error('Upload failed');
      const { url } = await res.json();
      setUpload({ status: 'ready', previewUrl, url, type: file.type });
    } catch {
      URL.revokeObjectURL(previewUrl);
      setUpload({ status: 'idle' });
    }
  };

  const clearAttachment = () => {
    if (upload.status !== 'idle') URL.revokeObjectURL(upload.previewUrl);
    setUpload({ status: 'idle' });
  };

  const send = async () => {
    const text = draft.trim();
    const hasAttachment = upload.status === 'ready';
    if (!text && !hasAttachment) return;

    const attachment = hasAttachment ? { url: upload.url, type: upload.type } : undefined;
    setDraft('');
    clearAttachment();

    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        recipientId: clientUserId,
        type: 'reply',
        content: text,
        attachmentUrl: attachment?.url,
        attachmentType: attachment?.type,
      }),
    });
    if (res.ok) {
      const saved = await res.json();
      setRows(prev => [...prev, {
        id: saved.id,
        sender_id: coachUserId,
        recipient_id: clientUserId,
        sender_name: '',
        content: text,
        created_at: saved.created_at || new Date().toISOString(),
        attachment_url: attachment?.url || null,
        attachment_type: attachment?.type || null,
      }]);
    }
  };

  const voice = useVoiceRecorder(text => setDraft(prev => prev ? prev + ' ' + text : text));
  const canSend = (draft.trim() || upload.status === 'ready') && upload.status !== 'uploading';

  const groups: { date: string; items: UiMessage[] }[] = [];
  for (const m of messages) {
    const last = groups[groups.length - 1];
    if (!last || last.date !== m.date) groups.push({ date: m.date, items: [m] });
    else last.items.push(m);
  }

  return (
    <div className="border border-border rounded-[14px] overflow-hidden flex flex-col max-h-[600px]">
      <div className="px-5 py-3 border-b border-border flex items-center gap-3 bg-surface">
        <Avatar name={clientName} avatarUrl={clientAvatarUrl} size={36} textSize={13} />
        <div>
          <MutedMono>Conversation</MutedMono>
          <div className="text-[14px]">{clientName}</div>
        </div>
      </div>

      <div ref={endRef} className="flex-1 overflow-y-auto px-5 py-4">
        {messages.length === 0 ? (
          <p className="text-[13px] text-text-muted text-center py-6">No messages yet.</p>
        ) : groups.map(g => (
          <div key={g.date} className="mb-4">
            <div className="text-center my-3">
              <MutedMono>{dateLabel(g.date, today)}</MutedMono>
            </div>
            {g.items.map((m, i) => {
              const isCoach = m.fromCoach;
              const roundedClass = isCoach ? 'rounded-2xl rounded-br-[4px]' : 'rounded-2xl rounded-bl-[4px]';
              const colorClass = isCoach ? 'bg-accent text-bg' : 'bg-surface border border-border';
              const next = g.items[i + 1];
              const showTime = !next || next.fromCoach !== m.fromCoach ||
                new Date(next.createdAt).getTime() - new Date(m.createdAt).getTime() > 5 * 60 * 1000;
              return (
                <div key={m.id} className={`flex ${isCoach ? 'justify-end' : 'justify-start'} ${showTime ? 'mb-3' : 'mb-1.5'}`}>
                  <div className="max-w-[80%]">
                    <div className={`overflow-hidden text-[14px] leading-[1.5] font-light ${colorClass} ${roundedClass}`}>
                      {m.attachmentUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.attachmentUrl} alt="" className="block w-full max-w-[280px] object-cover" />
                      )}
                      {m.text && (
                        <div className={`py-2 px-3.5 whitespace-pre-wrap ${m.attachmentUrl ? 'border-t border-black/10' : ''}`}>
                          {m.text}
                        </div>
                      )}
                      {!m.attachmentUrl && !m.text && (
                        <div className="py-2 px-3.5">&nbsp;</div>
                      )}
                    </div>
                    {showTime && (
                      <div className={`px-1.5 pt-1 ${isCoach ? 'text-right' : 'text-left'}`}>
                        <MutedMono>{m.time}</MutedMono>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="px-4 pt-2 pb-4 border-t border-border">
        {upload.status !== 'idle' && (
          <div className="mb-2">
            <div className="relative inline-block">
              {upload.status === 'uploading' ? (
                <div className="w-14 h-14 rounded-[8px] bg-surface border border-border flex items-center justify-center">
                  <svg className="animate-spin text-text-muted" width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" strokeDasharray="28" strokeDashoffset="10" />
                  </svg>
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={upload.previewUrl} alt="" className="w-14 h-14 rounded-[8px] object-cover" />
              )}
              {upload.status === 'ready' && (
                <button
                  onClick={clearAttachment}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-text text-bg flex items-center justify-center"
                >
                  <svg width="7" height="7" viewBox="0 0 8 8" fill="none">
                    <path d="M1 1L7 7M7 1L1 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}

        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={upload.status !== 'idle'}
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-text-muted hover:text-text transition-colors disabled:opacity-40"
          >
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none" strokeLinejoin="round">
              <path d="M6.5 3H11.5L13 5H16C16.55 5 17 5.45 17 6V14C17 14.55 16.55 15 16 15H2C1.45 15 1 14.55 1 14V6C1 5.45 1.45 5 2 5H5L6.5 3Z" stroke="currentColor" strokeWidth="1.2"/>
              <circle cx="9" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.2"/>
            </svg>
          </button>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onFileChange}
          />

          <button
            type="button"
            onClick={voice.toggle}
            disabled={upload.status !== 'idle'}
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-colors disabled:opacity-40"
            aria-label={voice.status === 'recording' ? 'Stop recording' : 'Record voice message'}
          >
            {voice.status === 'transcribing' ? (
              <svg className="animate-spin text-text-muted" width="14" height="14" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" strokeDasharray="28" strokeDashoffset="10" />
              </svg>
            ) : voice.status === 'recording' ? (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[11px] font-mono text-red-500 leading-none">{fmtElapsed(voice.elapsed)}</span>
              </span>
            ) : (
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-text-muted hover:text-text transition-colors">
                <rect x="5" y="1" width="6" height="9" rx="3" stroke="currentColor" strokeWidth="1.3"/>
                <path d="M2 8c0 3.314 2.686 5 6 5s6-1.686 6-5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                <line x1="8" y1="13" x2="8" y2="15" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
            )}
          </button>

          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder={`Write to ${clientName.split(' ')[0]}…`}
            rows={1}
            className="flex-1 rounded-[20px] py-2.5 px-4 text-[14px] min-h-[40px] max-h-[120px]"
          />

          <button
            onClick={send}
            disabled={!canSend}
            className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${canSend ? 'bg-accent text-bg' : 'bg-border text-text-muted'}`}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 7H11M11 7L7 3M11 7L7 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
