import { getSession } from '@/lib/auth';
import { queryOne } from '@/lib/db';
import { redirect } from 'next/navigation';
import { getUserSettings } from '@/lib/settings';
import ClientShell from '@/components/layout/ClientShell';
import TimezoneSync from '@/components/layout/TimezoneSync';
import PushRegistration from '@/components/layout/PushRegistration';

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  let unreadCount = 0;
  let timezone = 'Pacific/Honolulu';
  let userName: string | undefined;

  if (session) {
    const user = await queryOne<{ name: string }>(
      'SELECT name FROM users WHERE id = $1',
      [session.userId]
    );
    // A still-valid JWT for a deleted account (e.g. a second device).
    if (!user) redirect('/login');
    userName = user.name;

    const settings = await getUserSettings(session.userId);
    timezone = settings.timezone;

    const clientInfo = await queryOne<{ coach_id: number }>(
      'SELECT coach_id FROM client_info WHERE user_id = $1',
      [session.userId]
    );

    if (clientInfo) {
      const row = await queryOne<{ count: string }>(
        'SELECT COUNT(*) as count FROM messages WHERE recipient_id = $1 AND sender_id = $2 AND read = 0',
        [session.userId, clientInfo.coach_id]
      );
      unreadCount = parseInt(row?.count || '0');
    }
  }

  return (
    <ClientShell unreadCount={unreadCount} userName={userName}>
      <TimezoneSync currentTimezone={timezone} />
      {session && <PushRegistration />}
      {children}
    </ClientShell>
  );
}
