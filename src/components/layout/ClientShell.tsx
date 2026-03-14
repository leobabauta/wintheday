'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ClientNav from './ClientNav';

interface Props {
  darkMode: boolean;
  unreadCount: number;
  children: React.ReactNode;
}

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export default function ClientShell({ darkMode: initialDark, unreadCount, children }: Props) {
  const [isDark, setIsDark] = useState(initialDark);
  const router = useRouter();

  const toggleDark = async () => {
    const newVal = !isDark;
    setIsDark(newVal);
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dark_mode: newVal }),
    });
    router.refresh();
  };

  return (
    <div className={`min-h-dvh flex justify-center transition-colors duration-300 ${isDark ? 'dark-mode bg-[#141926]' : 'bg-lavender'}`}>
      <div
        className="w-full max-w-[520px] min-h-dvh bg-card shadow-2xl rounded-none sm:rounded-3xl sm:my-4 sm:min-h-0 sm:max-h-[calc(100dvh-2rem)] sm:overflow-y-auto flex flex-col relative transition-colors duration-300"
        style={{ boxShadow: isDark
          ? '0 0 60px 8px rgba(59, 130, 246, 0.08), 0 25px 50px -12px rgba(0, 0, 0, 0.7)'
          : '0 0 60px 8px rgba(240, 165, 0, 0.15), 0 25px 50px -12px rgba(0, 0, 0, 0.5)'
        }}
      >
        {/* Top bar */}
        <div className="flex items-center justify-end gap-2 px-5 pt-4 pb-0">
          {unreadCount > 0 && (
            <a href="/messages" className="relative p-1">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-navy">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-danger text-white text-[9px] font-bold flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            </a>
          )}
          <button
            onClick={toggleDark}
            className="p-1 text-navy/50 hover:text-navy transition-colors"
            title={isDark ? 'Light mode' : 'Dark mode'}
          >
            {isDark ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>

        <div className="flex-1 px-5 pb-20">
          {children}
        </div>
        <ClientNav unreadCount={unreadCount} isDark={isDark} />
      </div>
    </div>
  );
}
