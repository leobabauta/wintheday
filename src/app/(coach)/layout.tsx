import Link from 'next/link';
import LogoutButton from '@/components/layout/LogoutButton';
import TrophyIcon from '@/components/ui/TrophyIcon';
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
    <div className="min-h-dvh">
      <header className="bg-card border-b border-lavender-dark/30 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="text-lg font-bold text-navy tracking-tight">
            <span className="flex items-center gap-2"><TrophyIcon size={24} /> Win the Day</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm text-navy/60 hover:text-navy transition-colors">
              Dashboard
            </Link>
            <Link href="/dashboard/inbox" className="text-sm text-navy/60 hover:text-navy transition-colors flex items-center gap-1">
              Inbox
              {unreadCount > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-danger text-white text-[10px] font-bold">
                  {unreadCount}
                </span>
              )}
            </Link>
            <Link href="/dashboard/settings" className="text-sm text-navy/60 hover:text-navy transition-colors">
              Settings
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>
      <div className="max-w-6xl mx-auto px-4 py-6">
        {children}
      </div>
    </div>
  );
}
