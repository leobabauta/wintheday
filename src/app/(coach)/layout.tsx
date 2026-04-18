import Link from 'next/link';
import LogoutButton from '@/components/layout/LogoutButton';
import { getSession } from '@/lib/auth';
import { queryOne } from '@/lib/db';

export default async function CoachLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const unread = session ? await queryOne<{ count: string }>(
    'SELECT COUNT(*) as count FROM messages WHERE recipient_id = $1 AND read = 0 AND archived = 0',
    [session.userId]
  ) : null;
  const unreadCount = parseInt(unread?.count || '0');

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
              {unreadCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-accent text-bg text-[10px] font-medium">
                  {unreadCount}
                </span>
              )}
            </Link>
            <Link href="/dashboard/settings" className="text-[13px] text-text-secondary hover:text-text transition-colors">
              Settings
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>
      <div className="max-w-[1100px] mx-auto px-8 py-8">
        {children}
      </div>
    </div>
  );
}
