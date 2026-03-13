import { query, execute } from './db';

const DAY_MAP: Record<number, string> = {
  0: 'sun', 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat',
};

export function getTodayDayName(): string {
  return DAY_MAP[new Date().getDay()];
}

export function getDateString(date?: Date): string {
  const d = date || new Date();
  return d.toISOString().split('T')[0];
}

export interface WinItem {
  id: number;
  commitment_id: number;
  title: string;
  type: string;
  completed: boolean;
}

export async function getTodaysWins(userId: number, date?: string): Promise<WinItem[]> {
  const today = date || getDateString();
  const dayName = date
    ? DAY_MAP[new Date(date + 'T12:00:00').getDay()]
    : getTodayDayName();

  // Get active commitments for today's day of week
  const commitments = await query<{ id: number; title: string; type: string; days_of_week: string }>(
    'SELECT id, title, type, days_of_week FROM commitments WHERE user_id = $1 AND active = 1',
    [userId]
  );

  const todayCommitments = commitments.filter(c => {
    const days: string[] = JSON.parse(c.days_of_week);
    return days.includes(dayName);
  });

  // Ensure win_entries exist for each commitment today
  for (const c of todayCommitments) {
    await execute(
      'INSERT INTO win_entries (user_id, commitment_id, date, completed) VALUES ($1, $2, $3, 0) ON CONFLICT (user_id, commitment_id, date) DO NOTHING',
      [userId, c.id, today]
    );
  }

  // Fetch win entries only for active commitments scheduled today
  const commitmentIds = todayCommitments.map(c => c.id);
  if (commitmentIds.length === 0) return [];

  const placeholders = commitmentIds.map((_, i) => `$${i + 3}`).join(',');
  const wins = await query<{ id: number; commitment_id: number; title: string; type: string; completed: number }>(
    `SELECT w.id, w.commitment_id, c.title, c.type, w.completed
     FROM win_entries w
     JOIN commitments c ON c.id = w.commitment_id
     WHERE w.user_id = $1 AND w.date = $2 AND c.active = 1 AND w.commitment_id IN (${placeholders})
     ORDER BY c.type, c.title`,
    [userId, today, ...commitmentIds]
  );

  return wins.map(w => ({
    id: w.id,
    commitment_id: w.commitment_id,
    title: w.title,
    type: w.type,
    completed: w.completed === 1,
  }));
}
