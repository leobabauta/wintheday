'use client';

import { useEffect, useState } from 'react';
import Card from '@/components/ui/Card';
import NudgeSettings, { DEFAULT_NUDGES, NudgeState } from './NudgeSettings';

const STORAGE_KEY = 'wtd_nudges_v1';

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
  return (
    <Card>
      <NudgeSettings nudges={nudges} onChange={update} />
    </Card>
  );
}
