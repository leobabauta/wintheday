import { queryOne, execute } from './db';

export interface UserSettings {
  reflection_time: number;
  onboarded: boolean;
  dark_mode: boolean;
  reflection_snoozed_until: string | null;
  reflection_skipped_date: string | null;
  rating_label: string;
}

export async function getUserSettings(userId: number): Promise<UserSettings> {
  const row = await queryOne<{ reflection_time: number; onboarded: number; dark_mode: number }>(
    'SELECT * FROM user_settings WHERE user_id = $1',
    [userId]
  );

  if (!row) {
    await execute(
      'INSERT INTO user_settings (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING',
      [userId]
    );
    return { reflection_time: 17, onboarded: false, dark_mode: false, reflection_snoozed_until: null, reflection_skipped_date: null, rating_label: 'inner peace' };
  }

  return {
    reflection_time: row.reflection_time,
    onboarded: row.onboarded === 1,
    dark_mode: (row.dark_mode ?? 0) === 1,
    reflection_snoozed_until: (row as Record<string, unknown>).reflection_snoozed_until as string | null,
    reflection_skipped_date: (row as Record<string, unknown>).reflection_skipped_date as string | null,
    rating_label: ((row as Record<string, unknown>).rating_label as string) || 'inner peace',
  };
}

export async function updateUserSettings(userId: number, updates: Partial<{
  reflection_time: number;
  onboarded: boolean;
  dark_mode: boolean;
  reflection_snoozed_until: string | null;
  reflection_skipped_date: string | null;
  rating_label: string;
}>) {
  await execute(
    'INSERT INTO user_settings (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING',
    [userId]
  );

  if (updates.reflection_time !== undefined) {
    await execute('UPDATE user_settings SET reflection_time = $1 WHERE user_id = $2', [updates.reflection_time, userId]);
  }
  if (updates.onboarded !== undefined) {
    await execute('UPDATE user_settings SET onboarded = $1 WHERE user_id = $2', [updates.onboarded ? 1 : 0, userId]);
  }
  if (updates.dark_mode !== undefined) {
    await execute('UPDATE user_settings SET dark_mode = $1 WHERE user_id = $2', [updates.dark_mode ? 1 : 0, userId]);
  }
  if (updates.reflection_snoozed_until !== undefined) {
    await execute('UPDATE user_settings SET reflection_snoozed_until = $1 WHERE user_id = $2', [updates.reflection_snoozed_until, userId]);
  }
  if (updates.reflection_skipped_date !== undefined) {
    await execute('UPDATE user_settings SET reflection_skipped_date = $1 WHERE user_id = $2', [updates.reflection_skipped_date, userId]);
  }
  if (updates.rating_label !== undefined) {
    await execute('UPDATE user_settings SET rating_label = $1 WHERE user_id = $2', [updates.rating_label, userId]);
  }
}
