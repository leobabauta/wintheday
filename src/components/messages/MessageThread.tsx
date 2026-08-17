'use client';

import { useState, useRef, useEffect } from 'react';
import MutedMono from '@/components/ui/MutedMono';
import Linkify from '@/components/ui/Linkify';
import { ReactionPicker, ReactionChips } from './Reactions';
import type { GroupedReaction } from '@/lib/reactions';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';

function fmtElapsed(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

interface Message {
  id: string;
  from: 'coach' | 'client';
  text: string;
  date: string; // YYYY-MM-DD
  time: string; // "8:12 AM"
  createdAt: string;
  attachmentUrl?: string | null;
  attachmentType?: string | null;
  reactions: GroupedReaction[];
}

interface Props {
  coachName: string;
  coachInitials: string;
  coachAvatarUrl?: string | null;
  messages: Message[];
  onSend: (text: string, attachment?: { url: string; type: string }) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onReact: (id: string, emoji: string) => void;
  today: string;
}

type UploadState =
  | { status: 'idle' }
  | { status: 'uploading'; previewUrl: string }
  | { status: 'ready'; previewUrl: string; url: string; type: string };

function dateLabel(iso: string, today: string) {
  if (iso === today) return 'Today';
  const t = new Date(today + 'T12:00:00');
  const d = new Date(iso + 'T12:00:00');
  const diff = Math.round((t.getTime() - d.getTime()) / 86400000);
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).toUpperCase();
}

function groupByDate(msgs: Message[]) {
  const groups: { date: string; items: Message[] }[] = [];
  let cur: { date: string; items: Message[] } | null = null;
  for (const m of msgs) {
    if (!cur || cur.date !== m.date) { cur = { date: m.date, items: [] }; groups.push(cur); }
    cur.items.push(m);
  }
  return groups;
}

function showTimeFor(items: Message[], i: number): boolean {
  const cur = items[i];
  const next = items[i + 1];
  if (!next) return true;
  if (next.from !== cur.from) return true;
  return new Date(next.createdAt).getTime() - new Date(cur.createdAt).getTime() > 5 * 60 * 1000;
}

export default function MessageThread({ coachName, coachInitials, coachAvatarUrl, messages, onSend, onDelete, onReact, today }: Props) {
  const [draft, setDraft] = useState('');
  const [upload, setUpload] = useState<UploadState>({ status: 'idle' });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const voice = useVoiceRecorder(text => setDraft(prev => prev ? prev + ' ' + text : text));

  useEffect(() => {
    if (endRef.current) endRef.current.scrollTop = endRef.current.scrollHeight;
  }, [messages.length]);

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
    await onSend(text, attachment);
  };

  const canSend = (draft.trim() || upload.status === 'ready') && upload.status !== 'uploading';
  const groups = groupByDate(messages);

  return (
    <div className="flex flex-col h-[calc(100dvh-4.75rem-max(calc(env(safe-area-inset-bottom)-1.25rem),4px))] sm:h-full -mx-6 -mt-[env(safe-area-inset-top)] sm:-my-10">
      <div className="px-6 py-4 border-b border-border flex items-center gap-3">
        {coachAvatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coachAvatarUrl} alt="" className="w-9 h-9 rounded-full object-cover" />
        ) : (
          <div className="w-9 h-9 rounded-full bg-accent-light text-accent flex items-center justify-center text-[13px]">
            {coachInitials}
          </div>
        )}
        <div>
          <MutedMono>Your coach</MutedMono>
          <div className="text-[15px]">{coachName}</div>
        </div>
      </div>

      <div ref={endRef} className="flex-1 overflow-y-auto px-6 py-4" onClick={() => setSelectedId(null)}>
        {groups.map(g => (
          <div key={g.date} className="mb-4">
            <div className="text-center my-3">
              <MutedMono>{dateLabel(g.date, today)}</MutedMono>
            </div>
            {g.items.map((m, i) => (
              <Bubble
                key={m.id}
                msg={m}
                showTime={showTimeFor(g.items, i)}
                isSelected={selectedId === m.id}
                onSelect={id => setSelectedId(prev => prev === id ? null : id)}
                onDelete={onDelete && m.from === 'client' ? onDelete : undefined}
                onReact={(id, emoji) => { setSelectedId(null); onReact(id, emoji); }}
              />
            ))}
          </div>
        ))}
      </div>

      <div className="px-4 pt-2 pb-5 border-t border-border">
        {upload.status !== 'idle' && (
          <div className="mb-2">
            <div className="relative inline-block">
              {upload.status === 'uploading' ? (
                <div className="w-16 h-16 rounded-[10px] bg-surface border border-border flex items-center justify-center">
                  <svg className="animate-spin text-text-muted" width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" strokeDasharray="28" strokeDashoffset="10" />
                  </svg>
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={upload.previewUrl} alt="" className="w-16 h-16 rounded-[10px] object-cover" />
              )}
              {upload.status === 'ready' && (
                <button
                  onClick={clearAttachment}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-text text-bg flex items-center justify-center"
                >
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <path d="M1 1L7 7M7 1L1 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}

        {voice.error && (
          <div className="flex items-center gap-2 mb-2 px-1">
            <p className="text-[12px] text-red-500 flex-1">{voice.error}</p>
            {voice.canOpenSettings && (
              <button onClick={voice.openSettings} className="text-[12px] text-accent underline flex-shrink-0">
                Open Settings
              </button>
            )}
          </div>
        )}
        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={upload.status !== 'idle'}
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-text-muted hover:text-text transition-colors disabled:opacity-40"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" strokeLinejoin="round">
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
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors disabled:opacity-40"
            aria-label={voice.status === 'recording' ? 'Stop recording' : 'Record voice message'}
          >
            {voice.status === 'transcribing' ? (
              <svg className="animate-spin text-text-muted" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" strokeDasharray="28" strokeDashoffset="10" />
              </svg>
            ) : voice.status === 'recording' ? (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[11px] font-mono text-red-500 leading-none">{fmtElapsed(voice.elapsed)}</span>
              </span>
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-text-muted hover:text-text transition-colors">
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
            placeholder={`Write to ${coachName.split(' ')[0]}…`}
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

function Bubble({ msg, showTime, isSelected, onSelect, onDelete, onReact }: {
  msg: Message;
  showTime: boolean;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDelete?: (id: string) => Promise<void>;
  onReact: (id: string, emoji: string) => void;
}) {
  const isClient = msg.from === 'client';
  const align = isClient ? 'right' : 'left';
  const roundedClass = isClient ? 'rounded-2xl rounded-br-[4px]' : 'rounded-2xl rounded-bl-[4px]';
  const colorClass = isClient ? 'bg-accent text-bg' : 'bg-surface border border-border';

  return (
    <div
      className={`flex ${isClient ? 'justify-end' : 'justify-start'} ${showTime ? 'mb-3' : 'mb-1.5'}`}
      onClick={e => { e.stopPropagation(); onSelect(msg.id); }}
    >
      <div className="max-w-[80%]">
        {isSelected && (
          <div className="pb-1">
            <ReactionPicker align={align} onPick={emoji => onReact(msg.id, emoji)} />
          </div>
        )}
        <div className={`overflow-hidden text-[14px] leading-[1.5] font-light ${colorClass} ${roundedClass}`}>
          {msg.attachmentUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={msg.attachmentUrl} alt="" className="block w-full max-w-[280px] object-cover" />
          )}
          {msg.text && (
            <div className={`py-2 px-3.5 whitespace-pre-wrap ${msg.attachmentUrl ? 'border-t border-black/10' : ''}`}>
              <Linkify text={msg.text} />
            </div>
          )}
          {!msg.attachmentUrl && !msg.text && (
            <div className="py-2 px-3.5">&nbsp;</div>
          )}
        </div>
        <ReactionChips
          reactions={msg.reactions}
          align={align}
          onToggle={emoji => onReact(msg.id, emoji)}
        />
        {showTime && (
          <div className={`px-1.5 pt-1 ${isClient ? 'text-right' : 'text-left'}`}>
            <MutedMono>{msg.time}</MutedMono>
          </div>
        )}
        {isSelected && onDelete && (
          <div className={`pt-1 ${isClient ? 'text-right' : 'text-left'}`}>
            <button
              onClick={e => { e.stopPropagation(); onDelete(msg.id); }}
              className="text-[12px] text-red-500 px-1.5 hover:opacity-70 transition-opacity"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
