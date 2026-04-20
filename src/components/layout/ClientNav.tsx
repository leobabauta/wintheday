'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// 5-tab mobile nav. ZHD-styled: hairline top border, bg with 95% opacity,
// 76px tall, mono-caps labels, active = accent color (no fill).
// Order matches the repo: Today / Sessions / Journal / Messages / Me.

const tabs = [
  { href: '/today',    label: 'Today' },
  { href: '/meetings', label: 'Sessions' },
  { href: '/journal',  label: 'Journal' },
  { href: '/messages', label: 'Messages' },
  { href: '/settings', label: 'Me' },
];

function TabIcon({ href, active }: { href: string; active: boolean }) {
  const stroke = active ? 'var(--color-accent)' : 'var(--color-text-muted)';
  const common = {
    fill: 'none',
    stroke,
    strokeWidth: 1 as const,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  if (href === '/today') return (
    <svg width="22" height="22" viewBox="0 0 22 22" {...common}>
      <circle cx="11" cy="11" r="5" />
      <circle cx="11" cy="11" r="1.2" fill={stroke} stroke="none" />
    </svg>
  );

  if (href === '/meetings') return (
    // Quiet calendar glyph — small sheet with a single date dot
    <svg width="22" height="22" viewBox="0 0 22 22" {...common}>
      <rect x="4" y="5.5" width="14" height="13" rx="1.5" />
      <line x1="4" y1="9.5" x2="18" y2="9.5" />
      <line x1="8" y1="3.5" x2="8" y2="6.5" />
      <line x1="14" y1="3.5" x2="14" y2="6.5" />
      <circle cx="11" cy="13.5" r="1.1" fill={stroke} stroke="none" />
    </svg>
  );

  if (href === '/journal') return (
    <svg width="22" height="22" viewBox="0 0 22 22" {...common}>
      <path d="M5 3.5h11a.5.5 0 0 1 .5.5v14a.5.5 0 0 1-.5.5H5a.5.5 0 0 1-.5-.5V4a.5.5 0 0 1 .5-.5Z" />
      <line x1="8" y1="8" x2="14" y2="8" />
      <line x1="8" y1="11" x2="14" y2="11" />
      <line x1="8" y1="14" x2="12" y2="14" />
    </svg>
  );

  if (href === '/messages') return (
    <svg width="22" height="22" viewBox="0 0 22 22" {...common}>
      <path d="M18 13.5a1.5 1.5 0 0 1-1.5 1.5H7l-3 3V6a1.5 1.5 0 0 1 1.5-1.5H16.5A1.5 1.5 0 0 1 18 6Z" />
    </svg>
  );

  // /settings → Me
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" {...common}>
      <circle cx="11" cy="8" r="3" />
      <path d="M4 18c0-3.3 3-6 7-6s7 2.7 7 6" />
    </svg>
  );
}

export default function ClientNav({ unreadCount = 0 }: { unreadCount?: number }) {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
      <div className="w-full max-w-[520px] bg-bg/95 backdrop-blur border-t border-border pointer-events-auto">
        <div className="flex items-stretch justify-around h-[76px] px-2">
          {tabs.map(tab => {
            const active = pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="relative flex flex-col items-center justify-center gap-[6px] flex-1"
              >
                <TabIcon href={tab.href} active={active} />
                {tab.href === '/messages' && unreadCount > 0 && (
                  <span className="absolute top-[14px] right-[calc(50%-18px)] w-1.5 h-1.5 rounded-full bg-[var(--color-accent)]" />
                )}
                <span
                  className={`font-mono text-[9px] tracking-[0.22em] uppercase ${
                    active ? 'text-[var(--color-accent)]' : 'text-text-muted'
                  }`}
                >
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
