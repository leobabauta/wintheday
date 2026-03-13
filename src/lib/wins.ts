import { getDb } from './db';

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

export function getTodaysWins(userId: number, date?: string): WinItem[] {
  const db = getDb();
  const today = date || getDateString();
  const dayName = date
    ? DAY_MAP[new Date(date + 'T12:00:00').getDay()]
    : getTodayDayName();

  // Get active commitments for today's day of week
  const commitments = db.prepare(
    `SELECT id, title, type, days_of_week FROM commitments
     WHERE user_id = ? AND active = 1`
  ).all(userId) as { id: number; title: string; type: string; days_of_week: string }[];

  const todayCommitments = commitments.filter(c => {
    const days: string[] = JSON.parse(c.days_of_week);
    return days.includes(dayName);
  });

  // Ensure win_entries exist for each commitment today
  const upsert = db.prepare(
    `INSERT OR IGNORE INTO win_entries (user_id, commitment_id, date, completed) VALUES (?, ?, ?, 0)`
  );

  for (const c of todayCommitments) {
    upsert.run(userId, c.id, today);
  }

  // Fetch win entries only for active commitments scheduled today
  const commitmentIds = todayCommitments.map(c => c.id);
  if (commitmentIds.length === 0) return [];

  const placeholders = commitmentIds.map(() => '?').join(',');
  const wins = db.prepare(
    `SELECT w.id, w.commitment_id, c.title, c.type, w.completed
     FROM win_entries w
     JOIN commitments c ON c.id = w.commitment_id
     WHERE w.user_id = ? AND w.date = ? AND c.active = 1 AND w.commitment_id IN (${placeholders})
     ORDER BY c.type, c.title`
  ).all(userId, today, ...commitmentIds) as { id: number; commitment_id: number; title: string; type: string; completed: number }[];

  return wins.map(w => ({
    id: w.id,
    commitment_id: w.commitment_id,
    title: w.title,
    type: w.type,
    completed: w.completed === 1,
  }));
}
