import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { getUserSettings } from '@/lib/settings';
import ClientShell from '@/components/layout/ClientShell';

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  let unreadCount = 0;
  let darkMode = false;

  if (session) {
    const settings = getUserSettings(session.userId);
    darkMode = settings.dark_mode;

    const db = getDb();
    const clientInfo = db.prepare(
      'SELECT coach_id FROM client_info WHERE user_id = ?'
    ).get(session.userId) as { coach_id: number } | undefined;

    if (clientInfo) {
      const row = db.prepare(
        'SELECT COUNT(*) as count FROM messages WHERE recipient_id = ? AND sender_id = ? AND read = 0'
      ).get(session.userId, clientInfo.coach_id) as { count: number };
      unreadCount = row.count;
    }
  }

  return (
    <ClientShell darkMode={darkMode} unreadCount={unreadCount}>
      {children}
    </ClientShell>
  );
}
