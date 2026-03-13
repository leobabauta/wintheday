import { queryOne, execute } from './db';

export interface UserSettings {
  reflection_time: number;
  onboarded: boolean;
  dark_mode: boolean;
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
    return { reflection_time: 17, onboarded: false, dark_mode: false };
  }

  return {
    reflection_time: row.reflection_time,
    onboarded: row.onboarded === 1,
    dark_mode: (row.dark_mode ?? 0) === 1,
  };
}

export async function updateUserSettings(userId: number, updates: Partial<{ reflection_time: number; onboarded: boolean; dark_mode: boolean }>) {
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
}
