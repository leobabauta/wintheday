import { queryOne } from './db';

export interface DayStats {
  date: string;
  total: number;
  completed: number;
}

export async function getClientWinHistory(userId: number, days: number = 14): Promise<DayStats[]> {
  const results: DayStats[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const date = d.toISOString().split('T')[0];

    const row = await queryOne<{ total: string; completed: string }>(
      'SELECT COUNT(*) as total, COALESCE(SUM(completed), 0) as completed FROM win_entries WHERE user_id = $1 AND date = $2',
      [userId, date]
    );

    results.push({
      date,
      total: parseInt(row?.total || '0'),
      completed: parseInt(row?.completed || '0'),
    });
  }

  return results;
}
