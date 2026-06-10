'use client';

import { useRef, useState } from 'react';

export type RecordStatus = 'idle' | 'recording' | 'transcribing';

export function useVoiceRecorder(onTranscribed: (text: string) => void) {
  const [status, setStatus] = useState<RecordStatus>('idle');
  const [elapsed, setElapsed] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/mp4';
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      recorder.ondataavailable = e => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        if (chunksRef.current.length === 0) { setStatus('idle'); return; }
        setStatus('transcribing');
        try {
          const blob = new Blob(chunksRef.current, { type: mimeType });
          const form = new FormData();
          form.append('file', blob, mimeType.includes('webm') ? 'audio.webm' : 'audio.mp4');
          const res = await fetch('/api/messages/transcribe', {
            method: 'POST',
            credentials: 'include',
            body: form,
          });
          if (res.ok) {
            const { text } = await res.json();
            if (text?.trim()) onTranscribed(text.trim());
          }
        } finally {
          setStatus('idle');
          setElapsed(0);
        }
      };

      recorderRef.current = recorder;
      recorder.start();
      setElapsed(0);
      setStatus('recording');
      timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
    } catch {
      setStatus('idle');
    }
  };

  const stop = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    recorderRef.current?.stop();
    recorderRef.current = null;
  };

  const toggle = () => {
    if (status === 'recording') stop();
    else if (status === 'idle') start();
  };

  return { status, elapsed, toggle };
}
