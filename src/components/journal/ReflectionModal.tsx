'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Button from '@/components/ui/Button';
import StarRating from '@/components/ui/StarRating';

const PROMPTS = [
  { key: 'well', label: 'What went well today?' },
  { key: 'challenge', label: 'What was challenging?' },
  { key: 'learn', label: 'What did you learn or notice?' },
  { key: 'tomorrow', label: 'What will you focus on tomorrow?' },
];

interface Props {
  date: string;
  existingReflection: string;
  existingRating: number;
  ratingLabel: string;
  onClose: () => void;
  onSaved: (content: string, rating: number) => void;
}

function MicIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function parseContent(content: string): Record<string, string> {
  try {
    const parsed = JSON.parse(content);
    if (typeof parsed === 'object' && parsed !== null) return parsed;
  } catch {
    if (content.trim()) return { well: content };
  }
  return {};
}

export default function ReflectionModal({ date, existingReflection, existingRating, ratingLabel, onClose, onSaved }: Props) {
  const [answers, setAnswers] = useState<Record<string, string>>(() => parseContent(existingReflection));
  const [rating, setRating] = useState(existingRating);
  const [saved, setSaved] = useState(true);
  const [recording, setRecording] = useState(false);
  const [recordingFor, setRecordingFor] = useState<string | null>(null);
  const [speechSupported, setSpeechSupported] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    const supported = typeof window !== 'undefined' &&
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
    setSpeechSupported(supported);
  }, []);

  const save = useCallback(async (data: Record<string, string>, ratingVal?: number) => {
    try {
      const content = JSON.stringify(data);
      await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, content, rating: ratingVal ?? rating }),
      });
      setSaved(true);
      onSaved(content, ratingVal ?? rating);
    } catch { /* retry */ }
  }, [date, onSaved, rating]);

  const handleChange = (key: string, value: string) => {
    const updated = { ...answers, [key]: value };
    setAnswers(updated);
    setSaved(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => save(updated), 2000);
  };

  const handleRatingChange = (val: number) => {
    setRating(val);
    setSaved(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => save(answers, val), 2000);
  };

  const handleBlur = () => {
    if (!saved) {
      if (timerRef.current) clearTimeout(timerRef.current);
      save(answers);
    }
  };

  const handleDone = () => {
    if (!saved) {
      if (timerRef.current) clearTimeout(timerRef.current);
      save(answers);
    }
    onClose();
  };

  const startRecording = (promptKey: string) => {
    if (!speechSupported) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    let finalTranscript = answers[promptKey] || '';
    if (finalTranscript) finalTranscript += ' ';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      const combined = finalTranscript + interim;
      setAnswers(prev => ({ ...prev, [promptKey]: combined }));
    };

    recognition.onerror = () => {
      setRecording(false);
      setRecordingFor(null);
    };

    recognition.onend = () => {
      setRecording(false);
      setRecordingFor(null);
      setAnswers(prev => {
        const updated = { ...prev };
        save(updated);
        return updated;
      });
    };

    recognitionRef.current = recognition;
    recognition.start();
    setRecording(true);
    setRecordingFor(promptKey);
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={handleDone}>
      <div
        className="w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto bg-bg rounded-2xl "
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-text">Daily Reflection</h2>
            <div className="flex items-center gap-3">
              <span className={`text-[10px] ${saved ? 'text-success' : 'text-accent'}`}>
                {saved ? (Object.values(answers).some(v => v.trim()) ? 'Saved' : '') : 'Saving...'}
              </span>
              <button onClick={handleDone} className="text-text-muted hover:text-text text-lg">x</button>
            </div>
          </div>

          <div className="mb-5">
            <StarRating
              value={rating}
              onChange={handleRatingChange}
              label={`How much did you experience ${ratingLabel} today?`}
              size={28}
            />
          </div>

          <div className="space-y-4">
            {PROMPTS.map(prompt => (
              <div key={prompt.key}>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-semibold text-text-secondary">{prompt.label}</label>
                  {speechSupported && (
                    <button
                      onClick={() => recording && recordingFor === prompt.key ? stopRecording() : startRecording(prompt.key)}
                      disabled={recording && recordingFor !== prompt.key}
                      className={`p-1.5 rounded-lg transition-colors ${
                        recording && recordingFor === prompt.key
                          ? 'bg-destructive/10 text-destructive animate-pulse'
                          : 'text-text/30 hover:text-text-secondary hover:bg-surface'
                      } disabled:opacity-30`}
                      title={recording && recordingFor === prompt.key ? 'Stop recording' : 'Record audio'}
                    >
                      <MicIcon size={14} />
                    </button>
                  )}
                </div>
                <textarea
                  value={answers[prompt.key] || ''}
                  onChange={e => handleChange(prompt.key, e.target.value)}
                  onBlur={handleBlur}
                  placeholder="Write your thoughts..."
                  className="w-full h-20 bg-surface/30 rounded-[12px] p-3 text-sm text-text outline-none resize-none focus:ring-1 focus:ring-accent/20 transition-colors"
                />
              </div>
            ))}
          </div>

          <div className="mt-5">
            <Button onClick={handleDone} size="sm">Done</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
