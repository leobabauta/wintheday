'use client';

import { useEffect, useRef, useState } from 'react';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';

function fmtElapsed(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

type UploadState =
  | { status: 'idle' }
  | { status: 'uploading'; previewUrl: string }
  | { status: 'ready'; previewUrl: string; url: string; type: string };

const MAX_HEIGHT = 132; // ~5 lines before the textarea starts scrolling

interface Props {
  placeholder: string;
  onSend: (text: string, attachment?: { url: string; type: string }) => Promise<void>;
  /** Bottom padding of the composer well — the client thread sits on the
   * device edge and needs more room than the coach's bordered card. */
  paddingBottom?: string;
}

// The attach/mic/send controls sit on their own row *under* a full-width
// textarea rather than beside it. Three 40px buttons inline stole ~150px
// from the typing area, which on a phone left a slot barely wider than a
// search box.
export default function MessageComposer({ placeholder, onSend, paddingBottom = 'pb-4' }: Props) {
  const [draft, setDraft] = useState('');
  const [upload, setUpload] = useState<UploadState>({ status: 'idle' });
  const fileRef = useRef<HTMLInputElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const voice = useVoiceRecorder(text => setDraft(prev => (prev ? prev + ' ' + text : text)));

  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`;
  }, [draft]);

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

  const canSend = Boolean(draft.trim() || upload.status === 'ready') && upload.status !== 'uploading';

  return (
    <div className={`px-4 pt-2 ${paddingBottom} border-t border-border`}>
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
                aria-label="Remove attachment"
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

      <div className="rounded-[20px] border border-border bg-surface px-1.5 pt-1 pb-1.5 focus-within:border-accent transition-colors">
        <textarea
          ref={taRef}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder={placeholder}
          rows={1}
          // 16px keeps iOS from auto-zooming the webview on focus.
          className="block w-full bg-transparent border-0 rounded-none resize-none overflow-y-auto px-2.5 pt-2 pb-1 text-[16px] leading-[1.45] min-h-[34px]"
          style={{ maxHeight: MAX_HEIGHT }}
        />

        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={upload.status !== 'idle'}
            aria-label="Attach a photo"
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-text-muted hover:text-text transition-colors disabled:opacity-40"
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
            className="h-9 min-w-9 px-1 rounded-full flex items-center justify-center flex-shrink-0 transition-colors disabled:opacity-40"
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

          <div className="flex-1" />

          <button
            onClick={send}
            disabled={!canSend}
            aria-label="Send"
            className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${canSend ? 'bg-accent text-bg' : 'bg-border text-text-muted'}`}
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
