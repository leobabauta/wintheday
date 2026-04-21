'use client';

import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'auto';
type Accent = 'clay' | 'sage' | 'cobalt';

const ACCENT_SWATCH: Record<Accent, string> = {
  clay: '#B5705A',
  sage: '#4A7C6F',
  cobalt: '#003175',
};

function readTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  const v = localStorage.getItem('wtd.theme');
  return v === 'dark' || v === 'auto' ? v : 'light';
}

function readAccent(): Accent {
  if (typeof window === 'undefined') return 'clay';
  const v = localStorage.getItem('wtd.accent');
  return v === 'sage' || v === 'cobalt' ? v : 'clay';
}

export default function AppearanceSettings() {
  const [accent, setAccent] = useState<Accent>('clay');
  const [theme, setTheme] = useState<Theme>('light');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setAccent(readAccent());
    setTheme(readTheme());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem('wtd.accent', accent);
    document.documentElement.dataset.accent = accent;
  }, [accent, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem('wtd.theme', theme);

    const apply = () => {
      const resolved: 'light' | 'dark' =
        theme === 'auto'
          ? window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light'
          : theme;
      document.documentElement.dataset.theme = resolved;
    };
    apply();

    if (theme === 'auto') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => apply();
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
  }, [theme, hydrated]);

  return (
    <div>
      <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-text-muted mb-2.5">Accent</p>
      <div className="flex gap-2.5 mb-6">
        {(['clay', 'sage', 'cobalt'] as const).map((v) => {
          const selected = accent === v;
          return (
            <button
              key={v}
              type="button"
              onClick={() => setAccent(v)}
              className="flex-1 flex flex-col items-center gap-2 py-3 px-2.5 rounded-[10px] bg-transparent cursor-pointer transition-colors"
              style={{
                border: selected ? '1px solid var(--color-text)' : '1px solid var(--color-border)',
              }}
            >
              <span
                className="w-[22px] h-[22px] rounded-full"
                style={{ background: ACCENT_SWATCH[v] }}
              />
              <span
                className="text-[12px] tracking-[0.04em]"
                style={{ color: selected ? 'var(--color-text)' : 'var(--color-text-muted)' }}
              >
                {v[0].toUpperCase() + v.slice(1)}
              </span>
            </button>
          );
        })}
      </div>

      <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-text-muted mb-2.5">Theme</p>
      <div className="flex gap-2.5">
        {(['light', 'dark', 'auto'] as const).map((v) => {
          const selected = theme === v;
          const swatchBg =
            v === 'light'
              ? '#FAFAFA'
              : v === 'dark'
                ? '#1C1915'
                : 'linear-gradient(90deg, #FAFAFA 50%, #1C1915 50%)';
          return (
            <button
              key={v}
              type="button"
              onClick={() => setTheme(v)}
              className="flex-1 flex flex-col items-center gap-2 py-3 px-2.5 rounded-[10px] bg-transparent cursor-pointer transition-colors"
              style={{
                border: selected ? '1px solid var(--color-text)' : '1px solid var(--color-border)',
              }}
            >
              <span
                className="w-[22px] h-[22px] rounded-full"
                style={{ background: swatchBg, border: '1px solid var(--color-border)' }}
              />
              <span
                className="text-[12px] tracking-[0.04em]"
                style={{ color: selected ? 'var(--color-text)' : 'var(--color-text-muted)' }}
              >
                {v[0].toUpperCase() + v.slice(1)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
