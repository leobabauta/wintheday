'use client';

import { useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';

export type RecordStatus = 'idle' | 'recording' | 'transcribing';

function openNativeSettings() {
  const platform = Capacitor.getPlatform();
  if (platform === 'ios') {
    window.open('app-settings:', '_system');
  } else if (platform === 'android') {
    (window as unknown as { AndroidNative?: { openSettings(): void } })
      .AndroidNative?.openSettings();
  }
}

export function useVoiceRecorder(onTranscribed: (text: string) => void) {
  const [status, setStatus] = useState<RecordStatus>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [canOpenSettings, setCanOpenSettings] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showError = (msg: string, withSettings = false) => {
    setError(msg);
    setCanOpenSettings(withSettings && Capacitor.isNativePlatform());
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    errorTimerRef.current = setTimeout(() => { setError(null); setCanOpenSettings(false); }, 6000);
  };

  const start = async () => {
    if (typeof window === 'undefined') return;

    if (!navigator.mediaDevices?.getUserMedia) {
      showError('Microphone not supported on this browser.');
      return;
    }
    if (typeof MediaRecorder === 'undefined') {
      showError('Voice recording not supported. Try Safari 17.4+ on iOS.');
      return;
    }

    // Phase 1: acquire audio stream.
    // Try with processing disabled first (avoids NotReadableError on Android WebView),
    // then fall back to plain { audio: true } if that also fails.
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
    } catch (e1) {
      const n1 = (e1 as Error)?.name;
      if (n1 === 'NotReadableError') {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (e2) {
          const n2 = (e2 as Error)?.name;
          showError(`Microphone unavailable (${n2 || 'NotReadableError'}) — is another app using it?`);
          return;
        }
      } else if (n1 === 'NotAllowedError' || n1 === 'PermissionDeniedError') {
        showError('Microphone access denied. Enable it in your settings.', true);
        return;
      } else if (n1 === 'NotFoundError') {
        showError('No microphone found.');
        return;
      } else {
        showError(`Could not access microphone (${n1 || 'unknown'}).`);
        return;
      }
    }

    // Phase 2: create MediaRecorder, with mimeType fallback.
    let recorder: MediaRecorder;
    let actualMime: string;
    try {
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '';
      try {
        recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      } catch {
        recorder = new MediaRecorder(stream);
      }
      actualMime = recorder.mimeType || 'audio/webm';
    } catch (recErr) {
      stream.getTracks().forEach(t => t.stop());
      showError(`Recording format not supported (${(recErr as Error)?.name || 'unknown'}).`);
      return;
    }

    // Phase 3: wire up and start.
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

  return { status, elapsed, error, canOpenSettings, openSettings: openNativeSettings, toggle };
}
