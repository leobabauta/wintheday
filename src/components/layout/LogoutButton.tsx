'use client';

import { useRouter } from 'next/navigation';

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  return (
    <button
      onClick={handleLogout}
      className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-muted hover:text-text transition-colors"
    >
      Sign out
    </button>
  );
}
