import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const hash = (pw: string) => bcrypt.hashSync(pw, 10);

async function seed() {
  const client = await pool.connect();
  try {
    // Create coach
    const coachRes = await client.query(
      `INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO NOTHING RETURNING id`,
      ['coach@wintheday.app', hash('coach123'), 'Leo (Coach)', 'coach']
    );
    let coachId = coachRes.rows[0]?.id;
    if (!coachId) {
      const existing = await client.query('SELECT id FROM users WHERE email = $1', ['coach@wintheday.app']);
      coachId = existing.rows[0].id;
    }

    // Create sample client
    const clientRes = await client.query(
      `INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO NOTHING RETURNING id`,
      ['client@example.com', hash('client123'), 'Sample Client', 'client']
    );
    let clientId = clientRes.rows[0]?.id;
    if (!clientId) {
      const existing = await client.query('SELECT id FROM users WHERE email = $1', ['client@example.com']);
      clientId = existing.rows[0].id;
    }

    // Client info
    await client.query(
      `INSERT INTO client_info (user_id, coach_id, sign_on_date, coaching_day, coaching_time, coaching_frequency)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT DO NOTHING`,
      [clientId, coachId, '2024-03-01', 'Wednesday', '4:00 PM', 'Every 2 weeks']
    );

    // Sample commitments
    const commitments = [
      { title: 'Morning meditation (10 min)', type: 'commitment', days: '["mon","tue","wed","thu","fri"]' },
      { title: 'Write 500 words', type: 'commitment', days: '["mon","wed","fri"]' },
      { title: 'Exercise 30 min', type: 'commitment', days: '["mon","tue","wed","thu","fri"]' },
      { title: 'Practice deep breathing', type: 'practice', days: '["mon","tue","wed","thu","fri","sat","sun"]' },
      { title: 'Practice gratitude journaling', type: 'practice', days: '["mon","wed","fri"]' },
    ];

    for (const c of commitments) {
      await client.query(
        `INSERT INTO commitments (user_id, title, type, days_of_week)
         SELECT $1, $2, $3, $4
         WHERE NOT EXISTS (SELECT 1 FROM commitments WHERE user_id = $1 AND title = $2)`,
        [clientId, c.title, c.type, c.days]
      );
    }

    console.log('Seed complete!');
    console.log('Coach login: coach@wintheday.app / coach123');
    console.log('Client login: client@example.com / client123');
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(console.error);
