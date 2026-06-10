'use client';

import { useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';

export type RecordStatus = 'idle' | 'recording' | 'transcribing';

function openNativeSettings() {
  const platform = Capacitor.getPlatform();
  if (platform === 'ios') {
    window.open('app-settings:', '_system');
  } else if (platform === 'android') {
    // AndroidNative is a JavascriptInterface registered in MainActivity.java
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
        showError('Microphone access denied. Enable it in your settings.', true);
      } else if (name === 'NotFoundError') {
        showError('No microphone found.');
      } else {
        showError(`Could not start recording (${name || (err as Error)?.message || 'unknown'}).`);
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

  return { status, elapsed, error, canOpenSettings, openSettings: openNativeSettings, toggle };
}
