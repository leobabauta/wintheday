'use client';

import { useState } from 'react';
import SettingRow from './SettingRow';

const TIMES = [
  { value: 15, label: '3:00 PM' },
  { value: 16, label: '4:00 PM' },
  { value: 17, label: '5:00 PM' },
  { value: 18, label: '6:00 PM' },
  { value: 19, label: '7:00 PM' },
  { value: 20, label: '8:00 PM' },
  { value: 21, label: '9:00 PM' },
];

export default function ReflectionTimeSetting({ initialTime }: { initialTime: number }) {
  const [time, setTime] = useState(initialTime);
  const [saved, setSaved] = useState(true);

  const handleChange = async (newTime: number) => {
    setTime(newTime);
    setSaved(false);
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reflection_time: newTime }),
      });
      setSaved(true);
    } catch { /* ignore */ }
  };

  return (
    <SettingRow
      eyebrow="Reflection time"
      right={
        <span className={`font-mono text-[10px] uppercase tracking-[0.18em] ${saved ? 'text-text-muted' : 'text-[var(--color-accent)]'}`}>
          {saved ? 'Saved' : 'Saving…'}
        </span>
      }
    >
      <p className="text-[13px] text-text-muted mb-3 reflection-text">
        When should the evening prompt appear?
      </p>
      <div className="flex flex-wrap gap-2">
        {TIMES.map(t => {
          const active = time === t.value;
          return (
            <button
              key={t.value}
              onClick={() => handleChange(t.value)}
              className={`px-3 py-1.5 rounded-full text-[12px] font-mono tabular-nums transition-colors border ${
                active
                  ? 'border-[var(--color-accent)] text-[var(--color-accent)] bg-[var(--color-accent-light)]'
                  : 'border-border text-text-muted hover:text-text hover:border-text-muted'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>
    </SettingRow>
  );
}
