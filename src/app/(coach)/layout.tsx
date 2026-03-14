import Link from 'next/link';
import LogoutButton from '@/components/layout/LogoutButton';
import TrophyIcon from '@/components/ui/TrophyIcon';

export default function CoachLayout({ children }: { children: React.ReactNode }) {
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
