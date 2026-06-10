import { queryOne, execute } from './db';

export interface UserSettings {
  reflection_time: number;
  onboarded: boolean;
  dark_mode: boolean;
  reflection_snoozed_until: string | null;
  reflection_skipped_date: string | null;
  // null when the user hasn't picked a quality yet — the Today tab uses
  // this to decide whether to show the "pick a quality" prompt.
  rating_label: string | null;
  timezone: string;
  nudges_enabled: boolean;
  nudges_morning_on: boolean;
  nudges_morning_time: string;
  nudges_morning_days: string[];
  nudges_evening_on: boolean;
  nudges_evening_time: string;
  nudges_evening_days: string[];
  nudges_tone: 'soft' | 'plain';
  nudges_quiet_mode: boolean;
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
    return {
      reflection_time: 17, onboarded: false, dark_mode: false,
      reflection_snoozed_until: null, reflection_skipped_date: null,
      rating_label: null, timezone: 'Pacific/Honolulu',
      nudges_enabled: true, nudges_morning_on: true, nudges_morning_time: '07:00',
      nudges_morning_days: ['mon','tue','wed','thu','fri'],
      nudges_evening_on: true, nudges_evening_time: '21:00',
      nudges_evening_days: ['mon','tue','wed','thu','fri','sat','sun'],
      nudges_tone: 'soft', nudges_quiet_mode: false,
    };
  }

  const r = row as Record<string, unknown>;
  const rawLabel = r.rating_label;
  return {
    reflection_time: row.reflection_time,
    onboarded: row.onboarded === 1,
    dark_mode: (row.dark_mode ?? 0) === 1,
    reflection_snoozed_until: r.reflection_snoozed_until as string | null,
    reflection_skipped_date: r.reflection_skipped_date as string | null,
    rating_label: typeof rawLabel === 'string' && rawLabel.trim() ? rawLabel : null,
    timezone: (r.timezone as string) || 'Pacific/Honolulu',
    nudges_enabled: (r.nudges_enabled ?? 1) !== 0,
    nudges_morning_on: (r.nudges_morning_on ?? 1) !== 0,
    nudges_morning_time: (r.nudges_morning_time as string) || '07:00',
    nudges_morning_days: ((r.nudges_morning_days as string) || 'mon,tue,wed,thu,fri').split(','),
    nudges_evening_on: (r.nudges_evening_on ?? 1) !== 0,
    nudges_evening_time: (r.nudges_evening_time as string) || '21:00',
    nudges_evening_days: ((r.nudges_evening_days as string) || 'mon,tue,wed,thu,fri,sat,sun').split(','),
    nudges_tone: ((r.nudges_tone as string) === 'plain' ? 'plain' : 'soft') as 'soft' | 'plain',
    nudges_quiet_mode: (r.nudges_quiet_mode ?? 0) !== 0,
  };
}

export async function updateUserSettings(userId: number, updates: Partial<{
  reflection_time: number;
  onboarded: boolean;
  dark_mode: boolean;
  reflection_snoozed_until: string | null;
  reflection_skipped_date: string | null;
  rating_label: string;
  timezone: string;
  nudges_enabled: number;
  nudges_morning_on: number;
  nudges_morning_time: string;
  nudges_morning_days: string;
  nudges_evening_on: number;
  nudges_evening_time: string;
  nudges_evening_days: string;
  nudges_tone: string;
  nudges_quiet_mode: number;
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
  if (updates.timezone !== undefined) {
    await execute('UPDATE user_settings SET timezone = $1 WHERE user_id = $2', [updates.timezone, userId]);
  }
  if (updates.nudges_enabled !== undefined) {
    await execute('UPDATE user_settings SET nudges_enabled = $1 WHERE user_id = $2', [updates.nudges_enabled, userId]);
  }
  if (updates.nudges_morning_on !== undefined) {
    await execute('UPDATE user_settings SET nudges_morning_on = $1 WHERE user_id = $2', [updates.nudges_morning_on, userId]);
  }
  if (updates.nudges_morning_time !== undefined) {
    await execute('UPDATE user_settings SET nudges_morning_time = $1 WHERE user_id = $2', [updates.nudges_morning_time, userId]);
  }
  if (updates.nudges_morning_days !== undefined) {
    await execute('UPDATE user_settings SET nudges_morning_days = $1 WHERE user_id = $2', [updates.nudges_morning_days, userId]);
  }
  if (updates.nudges_evening_on !== undefined) {
    await execute('UPDATE user_settings SET nudges_evening_on = $1 WHERE user_id = $2', [updates.nudges_evening_on, userId]);
  }
  if (updates.nudges_evening_time !== undefined) {
    await execute('UPDATE user_settings SET nudges_evening_time = $1 WHERE user_id = $2', [updates.nudges_evening_time, userId]);
  }
  if (updates.nudges_evening_days !== undefined) {
    await execute('UPDATE user_settings SET nudges_evening_days = $1 WHERE user_id = $2', [updates.nudges_evening_days, userId]);
  }
  if (updates.nudges_tone !== undefined) {
    await execute('UPDATE user_settings SET nudges_tone = $1 WHERE user_id = $2', [updates.nudges_tone, userId]);
  }
  if (updates.nudges_quiet_mode !== undefined) {
    await execute('UPDATE user_settings SET nudges_quiet_mode = $1 WHERE user_id = $2', [updates.nudges_quiet_mode, userId]);
  }
}
