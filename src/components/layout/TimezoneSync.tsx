'use client';

import { useEffect } from 'react';

export default function TimezoneSync({ currentTimezone }: { currentTimezone: string }) {
  useEffect(() => {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (detected && detected !== currentTimezone) {
      fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timezone: detected }),
      });
    }
  }, [currentTimezone]);

  return null;
}
