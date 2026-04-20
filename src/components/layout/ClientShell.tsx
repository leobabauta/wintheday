'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ClientNav from './ClientNav';

interface Props {
  unreadCount?: number;
  userName?: string;
  children: React.ReactNode;
}

// ZHD shell — responsive:
//   < md (mobile): single column, max-w-[520px], bottom tab bar (ClientNav).
//   ≥ md (desktop): 2-column — left rail with ZHD mark + vertical nav + user
//                    footer, right column is the content (same hairline ZHD).
//
// No rounded-phone-on-desktop floating card. On desktop the app fills the
// viewport; content is capped at 680px reading width inside the right column.

const deskNav = [
  { href: '/today',    label: 'Today' },
  { href: '/meetings', label: 'Sessions' },
  { href: '/journal',  label: 'Journal' },
  { href: '/messages', label: 'Messages' },
  { href: '/settings', label: 'Me' },
];

function WTDMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none" aria-hidden>
      <circle cx="15" cy="22" r="13" stroke="var(--color-accent)" strokeWidth="1" />
      <circle cx="29" cy="22" r="13" stroke="var(--color-accent)" strokeWidth="1" />
    </svg>
  );
}

function DesktopSidebar({
  pathname,
  unreadCount,
  userName,
}: {
  pathname: string;
  unreadCount: number;
  userName?: string;
}) {
  return (
    <aside className="hidden md:flex flex-col w-[240px] border-r border-border px-8 py-10 shrink-0 sticky top-0 h-dvh">
      <Link href="/today" className="flex items-center gap-[10px] mb-14">
        <WTDMark />
        <span className="font-display text-[17px] tracking-[-0.01em]">Win the Day</span>
      </Link>

      <nav className="flex flex-col gap-[2px]">
        {deskNav.map(tab => {
          const active = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`group flex items-center justify-between py-[9px] text-[14px] transition-colors ${
                active ? 'text-text' : 'text-text-muted hover:text-text'
              }`}
            >
              <span className="flex items-center gap-3">
                {active && (
                  <span className="block w-[14px] h-px bg-[var(--color-accent)]" aria-hidden />
                )}
                <span className={active ? '' : 'ml-[26px]'}>{tab.label}</span>
              </span>
              {tab.href === '/messages' && unreadCount > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)]" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-8 border-t border-border">
        <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-text-muted mb-1">
          Signed in as
        </p>
        <p className="text-[13px] text-text-secondary truncate">{userName || '—'}</p>
      </div>
    </aside>
  );
}

export default function ClientShell({ unreadCount = 0, userName, children }: Props) {
  const pathname = usePathname();

  return (
    <div className="min-h-dvh bg-bg flex">
      <DesktopSidebar pathname={pathname} unreadCount={unreadCount} userName={userName} />

      {/* Content column */}
      <main className="flex-1 min-w-0 flex justify-center">
        <div className="w-full max-w-[680px] px-6 pt-10 pb-24 md:px-10 md:pt-14 md:pb-16">
          {children}
        </div>
      </main>

      {/* Mobile tab bar — hidden on md+ */}
      <div className="md:hidden">
        <ClientNav unreadCount={unreadCount} />
      </div>
    </div>
  );
}
