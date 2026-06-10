'use client';

import { useRef, useState } from 'react';

export type RecordStatus = 'idle' | 'recording' | 'transcribing';

export function useVoiceRecorder(onTranscribed: (text: string) => void) {
  const [status, setStatus] = useState<RecordStatus>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showError = (msg: string) => {
    setError(msg);
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    errorTimerRef.current = setTimeout(() => setError(null), 4000);
  };

  const start = async () => {
    if (typeof window === 'undefined') return;

    if (!navigator.mediaDevices?.getUserMedia) {
      showError('Microphone not supported on this browser.');
      return;
    }
    if (typeof MediaRecorder === 'undefined') {
      showError('Voice recording not supported on this browser. Try Safari 17.4+ on iOS.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : '';
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      const actualMime = recorder.mimeType || 'audio/webm';
      chunksRef.current = [];

      recorder.ondataavailable = e => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        if (chunksRef.current.length === 0) { setStatus('idle'); return; }
        setStatus('transcribing');
        try {
          const blob = new Blob(chunksRef.current, { type: actualMime });
          const ext = actualMime.includes('mp4') ? 'mp4' : actualMime.includes('ogg') ? 'ogg' : 'webm';
          const form = new FormData();
          form.append('file', blob, `audio.${ext}`);
          const res = await fetch('/api/messages/transcribe', {
            method: 'POST',
            credentials: 'include',
            body: form,
          });
          if (res.ok) {
            const { text } = await res.json();
            if (text?.trim()) onTranscribed(text.trim());
          } else {
            showError('Transcription failed. Please try again.');
          }
        } catch {
          showError('Transcription failed. Please try again.');
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
    } catch (err) {
      setStatus('idle');
      const name = (err as Error)?.name;
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        showError('Microphone access denied. Check your browser or app settings.');
      } else if (name === 'NotFoundError') {
        showError('No microphone found.');
      } else {
        showError('Could not start recording.');
      }
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

  return { status, elapsed, error, toggle };
}
