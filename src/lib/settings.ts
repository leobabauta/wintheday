import { getDb } from './db';

export interface UserSettings {
  reflection_time: number;
  onboarded: boolean;
  dark_mode: boolean;
}

export function getUserSettings(userId: number): UserSettings {
  const db = getDb();

  // Ensure dark_mode column exists (migration for existing DBs)
  try {
    db.prepare("SELECT dark_mode FROM user_settings LIMIT 0").run();
  } catch {
    try { db.exec("ALTER TABLE user_settings ADD COLUMN dark_mode INTEGER NOT NULL DEFAULT 0"); } catch { /* already exists */ }
  }

  const row = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(userId) as {
    reflection_time: number; onboarded: number; dark_mode: number;
  } | undefined;

  if (!row) {
    db.prepare('INSERT OR IGNORE INTO user_settings (user_id) VALUES (?)').run(userId);
    return { reflection_time: 17, onboarded: false, dark_mode: false };
  }

  return {
    reflection_time: row.reflection_time,
    onboarded: row.onboarded === 1,
    dark_mode: (row.dark_mode ?? 0) === 1,
  };
}

export function updateUserSettings(userId: number, updates: Partial<{ reflection_time: number; onboarded: boolean; dark_mode: boolean }>) {
  const db = getDb();
  db.prepare('INSERT OR IGNORE INTO user_settings (user_id) VALUES (?)').run(userId);

  if (updates.reflection_time !== undefined) {
    db.prepare('UPDATE user_settings SET reflection_time = ? WHERE user_id = ?').run(updates.reflection_time, userId);
  }
  if (updates.onboarded !== undefined) {
    db.prepare('UPDATE user_settings SET onboarded = ? WHERE user_id = ?').run(updates.onboarded ? 1 : 0, userId);
  }
  if (updates.dark_mode !== undefined) {
    db.prepare('UPDATE user_settings SET dark_mode = ? WHERE user_id = ?').run(updates.dark_mode ? 1 : 0, userId);
  }
}
