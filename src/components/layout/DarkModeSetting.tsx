'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';

export default function DarkModeSetting({ initialDark }: { initialDark: boolean }) {
  const [dark, setDark] = useState(initialDark);
  const router = useRouter();

  const toggle = async () => {
    const newVal = !dark;
    setDark(newVal);
    document.documentElement.classList.toggle('dark', newVal);
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dark_mode: newVal }),
    });
    router.refresh();
  };

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xs font-bold text-navy/50 uppercase tracking-wider">Appearance</h2>
          <p className="text-xs text-navy/50 mt-1">Toggle dark or light mode</p>
        </div>
        <button
          onClick={toggle}
          className={`w-12 h-7 rounded-full flex items-center transition-colors px-1 ${
            dark ? 'bg-navy justify-end' : 'bg-lavender-dark justify-start'
          }`}
        >
          <div className="w-5 h-5 rounded-full bg-white shadow-sm flex items-center justify-center">
            {dark ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1B1F3B" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#F0A500" strokeWidth="2">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              </svg>
            )}
          </div>
        </button>
      </div>
    </Card>
  );
}
