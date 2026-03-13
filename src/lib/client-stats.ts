import { getDb } from './db';

export interface DayStats {
  date: string;
  total: number;
  completed: number;
}

export function getClientWinHistory(userId: number, days: number = 14): DayStats[] {
  const db = getDb();
  const results: DayStats[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const date = d.toISOString().split('T')[0];

    const row = db.prepare(
      `SELECT COUNT(*) as total, SUM(completed) as completed
       FROM win_entries WHERE user_id = ? AND date = ?`
    ).get(userId, date) as { total: number; completed: number } | undefined;

    results.push({
      date,
      total: row?.total || 0,
      completed: row?.completed || 0,
    });
  }

  return results;
}
