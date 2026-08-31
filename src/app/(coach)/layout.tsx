import Link from 'next/link';
import LogoutButton from '@/components/layout/LogoutButton';
import PushRegistration from '@/components/layout/PushRegistration';

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-bg flex flex-col">
      {/* The wordmark is mono/uppercase rather than display type so it holds
        * one line at 360px. Nav links are gone: the inbox lives on the home
        * screen and account links sit in the footer, so the logo is the only
        * thing up here and it goes home. */}
      <header className="bg-bg border-b border-border sticky top-0 z-50 pt-[env(safe-area-inset-top)]">
        <div className="max-w-[1100px] mx-auto px-5 md:px-8 h-14 flex items-center">
          <Link href="/dashboard" className="flex items-center gap-2.5 whitespace-nowrap">
            <span className="text-accent text-[15px] leading-none" aria-hidden>✦</span>
            <span className="font-mono text-[11px] font-medium tracking-[0.2em] uppercase text-text">
              Win the Day
            </span>
            <span className="font-mono text-[11px] tracking-[0.2em] uppercase text-text-muted">
              Coach
            </span>
          </Link>
        </div>
      </header>

      <div className="flex-1 w-full max-w-[1100px] mx-auto px-5 md:px-8 py-7 md:py-8">
        <PushRegistration />
        {children}
      </div>

      <footer className="w-full max-w-[1100px] mx-auto px-5 md:px-8 mt-10">
        <div className="border-t border-border pt-6 pb-[calc(2rem+env(safe-area-inset-bottom))] flex items-center gap-6">
          <Link
            href="/dashboard/settings"
            className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-muted hover:text-text transition-colors"
          >
            Settings
          </Link>
          <LogoutButton />
        </div>
      </footer>
    </div>
  );
}
