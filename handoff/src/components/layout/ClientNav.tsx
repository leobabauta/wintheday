'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { href: '/today',    label: 'Today' },
  { href: '/journal',  label: 'Journal' },
  { href: '/messages', label: 'Messages' },
  { href: '/settings', label: 'Me' },
];

function TabIcon({ href, active }: { href: string; active: boolean }) {
  const stroke = active ? 'var(--color-accent)' : 'var(--color-text-muted)';
  const strokeWidth = 1.4;
  const common = { fill: 'none', stroke, strokeWidth, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (href === '/today') return (
    <svg width="20" height="20" viewBox="0 0 24 24" {...common}>
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
  if (href === '/journal') return (
    <svg width="20" height="20" viewBox="0 0 24 24" {...common}>
      <path d="M5 4h12a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2V4z" />
      <line x1="9" y1="9" x2="15" y2="9" />
      <line x1="9" y1="13" x2="13" y2="13" />
    </svg>
  );
  if (href === '/messages') return (
    <svg width="20" height="20" viewBox="0 0 24 24" {...common}>
      <path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-4 4z" />
    </svg>
  );
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" {...common}>
      <circle cx="12" cy="9" r="3.5" />
      <path d="M5 20c1-3.5 4-5.5 7-5.5s6 2 7 5.5" />
    </svg>
  );
}

export default function ClientNav({ unreadCount = 0 }: { unreadCount?: number }) {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
      <div className="w-full max-w-[520px] bg-bg/95 backdrop-blur border-t border-border sm:rounded-b-[28px] pointer-events-auto">
        <div className="flex items-stretch justify-around h-16 px-2">
          {tabs.map(tab => {
            const active = pathname.startsWith(tab.href);
            return (
              <Link key={tab.href} href={tab.href}
                className="relative flex flex-col items-center justify-center gap-1 flex-1">
                <TabIcon href={tab.href} active={active} />
                {tab.href === '/messages' && unreadCount > 0 && (
                  <span className="absolute top-2 right-[calc(50%-16px)] w-1.5 h-1.5 rounded-full bg-accent" />
                )}
                <span className={`font-mono text-[9px] tracking-[0.12em] uppercase ${active ? 'text-accent' : 'text-text-muted'}`}>
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
