import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { runMigrations } from './schema';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'wintheday.db');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
runMigrations(db);

const hash = (pw: string) => bcrypt.hashSync(pw, 10);

// Create coach
const coachResult = db.prepare(
  `INSERT OR IGNORE INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)`
).run('coach@wintheday.app', hash('coach123'), 'Leo (Coach)', 'coach');

const coachId = coachResult.lastInsertRowid || db.prepare(`SELECT id FROM users WHERE email = ?`).get('coach@wintheday.app') as { id: number };
const coachUserId = typeof coachId === 'number' ? coachId : (coachId as { id: number }).id;

// Create sample client
const clientResult = db.prepare(
  `INSERT OR IGNORE INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)`
).run('client@example.com', hash('client123'), 'Sample Client', 'client');

const clientId = clientResult.lastInsertRowid || db.prepare(`SELECT id FROM users WHERE email = ?`).get('client@example.com') as { id: number };
const clientUserId = typeof clientId === 'number' ? clientId : (clientId as { id: number }).id;

// Client info
db.prepare(
  `INSERT OR IGNORE INTO client_info (user_id, coach_id, sign_on_date, coaching_day, coaching_time, coaching_frequency)
   VALUES (?, ?, ?, ?, ?, ?)`
).run(clientUserId, coachUserId, '2024-03-01', 'Wednesday', '4:00 PM', 'Every 2 weeks');

// Sample commitments
const commitments = [
  { title: 'Morning meditation (10 min)', type: 'commitment', days: '["mon","tue","wed","thu","fri"]' },
  { title: 'Write 500 words', type: 'commitment', days: '["mon","wed","fri"]' },
  { title: 'Exercise 30 min', type: 'commitment', days: '["mon","tue","wed","thu","fri"]' },
  { title: 'Practice deep breathing', type: 'practice', days: '["mon","tue","wed","thu","fri","sat","sun"]' },
  { title: 'Practice gratitude journaling', type: 'practice', days: '["mon","wed","fri"]' },
];

for (const c of commitments) {
  db.prepare(
    `INSERT OR IGNORE INTO commitments (user_id, title, type, days_of_week) VALUES (?, ?, ?, ?)`
  ).run(clientUserId, c.title, c.type, c.days);
}

console.log('Seed complete!');
console.log('Coach login: coach@wintheday.app / coach123');
console.log('Client login: client@example.com / client123');

db.close();
