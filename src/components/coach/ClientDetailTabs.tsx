'use client';

import { useState } from 'react';

type Tab = 'main' | 'messages';

const LABELS: Record<Tab, string> = { main: 'Main', messages: 'Messages' };

// The conversation used to sit at the bottom of a long scroll. It's now a tab
// of its own so the coach can jump straight to it — and so the main tab is
// short enough to take in at a glance on a phone.
export default function ClientDetailTabs({
  initialTab,
  main,
  messages,
}: {
  initialTab: Tab;
  main: React.ReactNode;
  messages: React.ReactNode;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);

  const select = (next: Tab) => {
    setTab(next);
    // Keep the URL in step without a server round-trip, so a reload (or a
    // shared link) comes back to the same tab.
    try {
      const url = new URL(window.location.href);
      if (next === 'messages') {
        url.searchParams.set('tab', 'messages');
      } else {
        url.searchParams.delete('tab');
        url.searchParams.delete('message');
      }
      window.history.replaceState(null, '', url);
    } catch {
      // URL bookkeeping only — never worth breaking the tab switch over.
    }
  };

  return (
    <>
      <div className="flex items-center gap-7 border-b border-border mb-6">
        {(['main', 'messages'] as const).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => select(t)}
            className={`relative -mb-px pb-3 font-mono text-[11px] tracking-[0.18em] uppercase transition-colors ${
              tab === t ? 'text-text' : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            {LABELS[t]}
            {tab === t && <span className="absolute bottom-0 left-0 right-0 h-px bg-text" />}
          </button>
        ))}
      </div>
      {tab === 'main' ? main : messages}
    </>
  );
}
