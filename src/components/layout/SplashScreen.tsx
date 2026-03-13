'use client';

import { useState, useEffect } from 'react';

interface Props {
  userName: string;
  children: React.ReactNode;
}

export default function SplashScreen({ userName, children }: Props) {
  const [showSplash, setShowSplash] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const shown = sessionStorage.getItem('wtd_splash_shown');
    if (!shown) {
      setShowSplash(true);
      sessionStorage.setItem('wtd_splash_shown', '1');
      // Auto-dismiss after 2.5s
      const timer = setTimeout(() => {
        setFadeOut(true);
        setTimeout(() => {
          setShowSplash(false);
          setDone(true);
        }, 500);
      }, 2500);
      return () => clearTimeout(timer);
    } else {
      setDone(true);
    }
  }, []);

  if (showSplash) {
    return (
      <div
        className={`fixed inset-0 z-[100] flex justify-center transition-opacity duration-500 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}
        onClick={() => { setFadeOut(true); setTimeout(() => { setShowSplash(false); setDone(true); }, 300); }}
      >
        <div className="w-full max-w-[520px] min-h-dvh bg-navy flex flex-col items-center justify-center text-center px-8 sm:rounded-3xl sm:my-4 sm:min-h-0 sm:max-h-[calc(100dvh-2rem)]">
          {/* Abstract decorative shape */}
          <div className="relative mb-12 w-48 h-48">
            <div className="absolute inset-0 rounded-full bg-white/5" />
            <div className="absolute top-4 left-4 w-40 h-40 rounded-full bg-white/5" />
            <div className="absolute top-10 left-10 w-28 h-28 rounded-full bg-white/10 flex items-center justify-center">
              <span className="text-6xl">🏆</span>
            </div>
          </div>

          <h1 className="text-3xl font-extrabold text-white tracking-wide uppercase mb-4">
            Win the Day
          </h1>
          <p className="text-white/60 text-base leading-relaxed max-w-xs">
            Welcome back, {userName.split(' ')[0]}. Let&apos;s make today count.
          </p>

          <div className="mt-12">
            <p className="text-white/30 text-xs uppercase tracking-widest">Tap to continue</p>
          </div>
        </div>
      </div>
    );
  }

  if (!done) return null;
  return <>{children}</>;
}
