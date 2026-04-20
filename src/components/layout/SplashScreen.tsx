'use client';

import { useState, useEffect } from 'react';

interface Props {
  userName: string;
  children: React.ReactNode;
}

// ZHD splash — warm cream, Jost welcome, Fraunces italic pulled-quote,
// a quiet letterform mark. No dark mode, no stacked circles, no glyph.
// Auto-dismisses after 2.2s; tap anywhere to skip.
export default function SplashScreen({ userName, children }: Props) {
  const [showSplash, setShowSplash] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const shown = sessionStorage.getItem('wtd_splash_shown');
    if (!shown) {
      setShowSplash(true);
      sessionStorage.setItem('wtd_splash_shown', '1');
      const timer = setTimeout(() => {
        setFadeOut(true);
        setTimeout(() => { setShowSplash(false); setDone(true); }, 420);
      }, 2200);
      return () => clearTimeout(timer);
    } else {
      setDone(true);
    }
  }, []);

  const dismiss = () => {
    setFadeOut(true);
    setTimeout(() => { setShowSplash(false); setDone(true); }, 300);
  };

  const firstName = (userName || '').split(' ')[0];
  const hour = new Date().getHours();
  const timeOfDay = hour < 5 ? 'night' : hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';

  if (showSplash) {
    return (
      <div
        className={`fixed inset-0 z-[100] bg-bg flex justify-center transition-opacity duration-[420ms] ${fadeOut ? 'opacity-0' : 'opacity-100'}`}
        onClick={dismiss}
      >
        <div className="w-full max-w-[520px] min-h-dvh flex flex-col items-center justify-center text-center px-8">

          {/* Quiet monogram — two overlapping thin circles forming a 'W' arc */}
          <svg width="44" height="44" viewBox="0 0 44 44" fill="none" className="mb-10" aria-hidden="true">
            <circle cx="15" cy="22" r="13" stroke="var(--color-accent)" strokeWidth="1" fill="none" />
            <circle cx="29" cy="22" r="13" stroke="var(--color-accent)" strokeWidth="1" fill="none" />
          </svg>

          {/* Eyebrow: timezone-aware welcome */}
          <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-text-muted mb-5">
            Good {timeOfDay}
          </p>

          {/* Greeting — Jost, not Fraunces */}
          <p className="text-[22px] font-light tracking-[-0.01em] text-text mb-4 leading-[1.3]">
            Welcome back{firstName ? `, ${firstName}` : ''}.
          </p>

          {/* Fraunces italic pulled-quote — the calm beneath */}
          <p className="font-display italic font-light text-[17px] leading-[1.5] text-text-secondary max-w-[320px] text-balance">
            A small enough day to win.
          </p>

          {/* Tap affordance — subtle */}
          <p className="font-mono text-[9px] tracking-[0.22em] uppercase text-text-muted mt-16">
            Tap to continue
          </p>

        </div>
      </div>
    );
  }

  if (!done) return null;
  return <>{children}</>;
}
