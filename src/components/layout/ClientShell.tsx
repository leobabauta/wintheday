'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ClientNav from './ClientNav';

interface Props {
  unreadCount?: number;
  userName?: string;
  children: React.ReactNode;
}

const tabs = [
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

function DesktopTopNav({
  pathname,
  userName,
  unreadCount,
}: {
  pathname: string;
  userName?: string;
  unreadCount: number;
}) {
  const initial = (userName || '?').trim().charAt(0).toUpperCase();

  return (
    <header className="hidden md:block border-b border-border bg-bg">
      <div className="h-[64px] max-w-[1180px] mx-auto px-8 flex items-center">
        {/* Left — wordmark */}
        <Link href="/today" className="flex items-center gap-[10px] flex-shrink-0">
          <WTDMark />
          <span className="font-mono text-[11px] font-medium tracking-[0.22em] uppercase text-text">
            Win the Day
          </span>
        </Link>

        {/* Center — nav items */}
        <nav className="flex-1 flex items-center justify-center gap-8 h-full">
          {tabs.map(t => {
            const active = pathname.startsWith(t.href);
            return (
              <Link
                key={t.href}
                href={t.href}
                className="relative h-full flex items-center"
              >
                <span
                  className={`font-mono text-[12px] tracking-[0.14em] uppercase transition-colors ${
                    active
                      ? 'text-text'
                      : 'text-text-muted hover:text-text-secondary'
                  }`}
                >
                  {t.label}
                </span>
                {t.href === '/messages' && unreadCount > 0 && (
                  <span className="absolute top-[18px] -right-[10px] w-1.5 h-1.5 rounded-full bg-[var(--color-accent)]" />
                )}
                {active && (
                  <span className="absolute bottom-0 left-0 right-0 h-px bg-[var(--color-text)]" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right — avatar */}
        <Link
          href="/settings"
          className="flex-shrink-0 w-[30px] h-[30px] rounded-full bg-[var(--color-accent-light)] text-[var(--color-accent)] flex items-center justify-center font-mono text-[11px] font-medium tracking-[0.05em]"
          aria-label="Account"
        >
          {initial}
        </Link>
      </div>
    </header>
  );
}

export default function ClientShell({ unreadCount = 0, userName, children }: Props) {
  const pathname = usePathname();
  const isJournal = pathname.startsWith('/journal');
  const contentMax = isJournal ? 'max-w-[860px]' : 'max-w-[640px]';

  return (
    <div className="min-h-dvh bg-bg">
      <DesktopTopNav pathname={pathname} userName={userName} unreadCount={unreadCount} />

      <main className={`w-full mx-auto px-6 md:px-10 pt-[calc(2.5rem+env(safe-area-inset-top))] md:pt-12 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-20 ${contentMax}`}>
        {children}
      </main>

      {/* Mobile bottom tab bar */}
      <div className="md:hidden">
        <ClientNav unreadCount={unreadCount} />
      </div>
    </div>
  );
}
