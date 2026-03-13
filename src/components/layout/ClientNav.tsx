'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

function makeIcon(pathD: string, active: boolean, isDark: boolean) {
  const color = active
    ? (isDark ? '#E8E4EF' : '#1B1F3B')
    : (isDark ? '#E8E4EF55' : '#1B1F3B55');
  return color;
}

const tabs = [
  {
    href: '/today', label: 'Today',
    icon: (c: string) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    href: '/journal', label: 'Journal',
    icon: (c: string) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        <line x1="8" y1="7" x2="16" y2="7" />
        <line x1="8" y1="11" x2="14" y2="11" />
      </svg>
    ),
  },
  {
    href: '/messages', label: 'Messages',
    icon: (c: string) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    href: '/settings', label: 'Settings',
    icon: (c: string, active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="6" x2="20" y2="6" />
        <line x1="4" y1="12" x2="20" y2="12" />
        <line x1="4" y1="18" x2="20" y2="18" />
        <circle cx="8" cy="6" r="2" fill={active ? c : 'none'} />
        <circle cx="16" cy="12" r="2" fill={active ? c : 'none'} />
        <circle cx="10" cy="18" r="2" fill={active ? c : 'none'} />
      </svg>
    ),
  },
];

export default function ClientNav({ unreadCount = 0, isDark = false }: { unreadCount?: number; isDark?: boolean }) {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-center">
      <div className={`w-full max-w-[520px] border-t sm:rounded-b-3xl transition-colors duration-300 ${
        isDark ? 'bg-[#1E1A2E] border-[#3A3455]' : 'bg-card border-lavender-dark/20'
      }`}>
        <div className="flex justify-around items-center h-14">
          {tabs.map(tab => {
            const active = pathname.startsWith(tab.href);
            const color = makeIcon('', active, isDark);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="relative flex flex-col items-center gap-0.5 px-3 py-1 transition-colors"
              >
                {tab.icon(active
                  ? (isDark ? '#E8E4EF' : '#1B1F3B')
                  : (isDark ? '#E8E4EF55' : '#1B1F3B55'),
                  active
                )}
                {tab.href === '/messages' && unreadCount > 0 && (
                  <span className="absolute -top-0.5 right-1 w-3 h-3 rounded-full bg-danger" />
                )}
                <span className={`text-[10px] font-medium transition-colors ${
                  active
                    ? (isDark ? 'text-lavender-light' : 'text-navy')
                    : (isDark ? 'text-lavender-light/40' : 'text-navy/40')
                }`}>{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
