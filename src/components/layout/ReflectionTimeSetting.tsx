'use client';

import { useState } from 'react';
import SettingRow from './SettingRow';

const TIMES = [15, 16, 17, 18, 19, 20, 21];

function label(hour: number) {
  const h12 = ((hour + 11) % 12) + 1;
  return `${h12}:00 ${hour >= 12 ? 'PM' : 'AM'}`;
}

export default function ReflectionTimeSetting({ initialTime }: { initialTime: number }) {
  const [time, setTime] = useState(initialTime);
  const [saved, setSaved] = useState(true);

  // This picker and the Nudges card edit the same underlying evening time.
  // `nudges_evening_time` is what the cron reads; `reflection_time` is kept in
  // step so the two controls never disagree on load.
  const handleChange = async (newTime: number) => {
    setTime(newTime);
    setSaved(false);
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reflection_time: newTime,
          nudges_evening_time: `${String(newTime).padStart(2, '0')}:00`,
        }),
      });
      setSaved(true);
    } catch { /* ignore */ }
  };

  // A time set from the Nudges card can fall outside this row's presets
  // (it allows any minute). Surface it rather than showing nothing selected.
  const options = TIMES.includes(time) ? TIMES : [...TIMES, time].sort((a, b) => a - b);

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
        When should the evening prompt appear? This is also when your evening
        nudge arrives.
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map(t => {
          const active = time === t;
          return (
            <button
              key={t}
              onClick={() => handleChange(t)}
              className={`px-3 py-1.5 rounded-full text-[12px] font-mono tabular-nums transition-colors border ${
                active
                  ? 'border-[var(--color-accent)] text-[var(--color-accent)] bg-[var(--color-accent-light)]'
                  : 'border-border text-text-muted hover:text-text hover:border-text-muted'
              }`}
            >
              {label(t)}
            </button>
          );
        })}
      </div>
    </SettingRow>
  );
}
