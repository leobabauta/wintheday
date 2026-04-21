'use client';

import { useEffect, useState } from 'react';

// Custom event emitted by inbox actions (mark attended, archive) so the badge
// can refresh immediately instead of waiting for the next poll tick.
export const INBOX_REFRESH_EVENT = 'wtd-inbox-refresh';

export default function InboxBadge() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchCount = async () => {
      try {
        const res = await fetch('/api/inbox/count', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setCount(data.count ?? 0);
      } catch {
        // swallow — next poll will retry
      }
    };

    fetchCount();

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') fetchCount();
    }, 10000);

    const onVisibility = () => {
      if (document.visibilityState === 'visible') fetchCount();
    };
    const onRefreshEvent = () => fetchCount();

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener(INBOX_REFRESH_EVENT, onRefreshEvent);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener(INBOX_REFRESH_EVENT, onRefreshEvent);
    };
  }, []);

  if (!count || count <= 0) return null;

  return (
    <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-accent text-bg text-[10px] font-medium">
      {count}
    </span>
  );
}
