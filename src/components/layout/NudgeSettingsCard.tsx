'use client';

import { useEffect, useState } from 'react';
import NudgeSettings, { DEFAULT_NUDGES, NudgeState } from './NudgeSettings';

const STORAGE_KEY = 'wtd_nudges_v1';

// ZHD: no card wrapper — NudgeSettings already renders its own hairline
// rows and eyebrow. Just host the state and drop it into the settings
// section flow.
export default function NudgeSettingsCard() {
  const [nudges, setNudges] = useState<NudgeState | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      setNudges(raw ? { ...DEFAULT_NUDGES, ...JSON.parse(raw) } : DEFAULT_NUDGES);
    } catch {
      setNudges(DEFAULT_NUDGES);
    }
  }, []);

  const update = (n: NudgeState) => {
    setNudges(n);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(n)); } catch {}
  };

  if (!nudges) return null;
  return <NudgeSettings nudges={nudges} onChange={update} />;
}
