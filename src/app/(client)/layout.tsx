import { getSession } from '@/lib/auth';
import { queryOne } from '@/lib/db';
import { getUserSettings } from '@/lib/settings';
import ClientShell from '@/components/layout/ClientShell';
import TimezoneSync from '@/components/layout/TimezoneSync';

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  let unreadCount = 0;
  let darkMode = false;
  let timezone = 'Pacific/Honolulu';

  if (session) {
    const settings = await getUserSettings(session.userId);
    darkMode = settings.dark_mode;
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
    <ClientShell darkMode={darkMode} unreadCount={unreadCount}>
      <TimezoneSync currentTimezone={timezone} />
      {children}
    </ClientShell>
  );
}
