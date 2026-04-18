'use client';

import { useState } from 'react';
import Card from '@/components/ui/Card';

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
    <Card>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Daily Reflection Time</h2>
        <span className={`text-[10px] ${saved ? 'text-success' : 'text-accent'}`}>
          {saved ? 'Saved' : 'Saving...'}
        </span>
      </div>
      <p className="text-xs text-text-muted mb-3">When should the daily reflection prompt appear?</p>
      <div className="flex flex-wrap gap-2">
        {TIMES.map(t => (
          <button
            key={t.value}
            onClick={() => handleChange(t.value)}
            className={`px-3 py-1.5 rounded-[12px] text-xs font-medium transition-colors ${
              time === t.value ? 'bg-text text-white' : 'bg-surface text-text-secondary hover:bg-surface'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
    </Card>
  );
}
