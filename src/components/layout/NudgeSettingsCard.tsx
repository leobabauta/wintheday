'use client';

import { useEffect, useRef, useState } from 'react';
import NudgeSettings, { DEFAULT_NUDGES, NudgeState } from './NudgeSettings';

export default function NudgeSettingsCard() {
  const [nudges, setNudges] = useState<NudgeState | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch('/api/settings', { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        setNudges({
          enabled: data.nudges_enabled !== 0,
          morning: {
            on: data.nudges_morning_on !== 0,
            time: data.nudges_morning_time || '07:00',
            days: Array.isArray(data.nudges_morning_days)
              ? data.nudges_morning_days
              : (data.nudges_morning_days || 'mon,tue,wed,thu,fri').split(','),
          },
          evening: {
            on: data.nudges_evening_on !== 0,
            time: data.nudges_evening_time || '21:00',
            days: Array.isArray(data.nudges_evening_days)
              ? data.nudges_evening_days
              : (data.nudges_evening_days || 'mon,tue,wed,thu,fri,sat,sun').split(','),
          },
          tone: data.nudges_tone === 'plain' ? 'plain' : 'soft',
          quietMode: data.nudges_quiet_mode !== 0,
        });
      })
      .catch(() => setNudges(DEFAULT_NUDGES));
  }, []);

  const update = (n: NudgeState) => {
    setNudges(n);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          nudges_enabled: n.enabled ? 1 : 0,
          nudges_morning_on: n.morning.on ? 1 : 0,
          nudges_morning_time: n.morning.time,
          nudges_morning_days: n.morning.days.join(','),
          nudges_evening_on: n.evening.on ? 1 : 0,
          nudges_evening_time: n.evening.time,
          nudges_evening_days: n.evening.days.join(','),
          nudges_tone: n.tone,
          nudges_quiet_mode: n.quietMode ? 1 : 0,
        }),
      }).catch(() => {});
    }, 600);
  };

  if (!nudges) return null;
  return <NudgeSettings nudges={nudges} onChange={update} />;
}
