import Link from 'next/link';
import LogoutButton from '@/components/layout/LogoutButton';
import InboxBadge from '@/components/layout/InboxBadge';
import PushRegistration from '@/components/layout/PushRegistration';

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-bg">
      <header className="bg-bg border-b border-border sticky top-0 z-50">
        <div className="max-w-[1100px] mx-auto px-8 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="font-display text-[18px] tracking-tight">
            <span className="flex items-center gap-2"><span className="text-accent" aria-hidden>✦</span> Win the Day <span className="text-text-muted">· Coach</span></span>
          </Link>
          <div className="flex items-center gap-5">
            <Link href="/dashboard" className="text-[13px] text-text-secondary hover:text-text transition-colors">
              Dashboard
            </Link>
            <Link href="/dashboard/inbox" className="text-[13px] text-text-secondary hover:text-text transition-colors flex items-center gap-1.5">
              Inbox
              <InboxBadge />
            </Link>
            <Link href="/dashboard/settings" className="text-[13px] text-text-secondary hover:text-text transition-colors">
              Settings
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>
      <div className="max-w-[1100px] mx-auto px-8 py-8">
        <PushRegistration />
        {children}
      </div>
    </div>
  );
}
