// Creates (or rebuilds) the App Store reviewer demo client with ~2 weeks of
// realistic data. Idempotent: an existing demo account is wiped and re-seeded,
// keeping its password. Credentials go to .env.review (gitignored).
//
//   node scripts/seed-review-account.mjs
//
// The account is marked `inactive` so the hourly nudge cron skips it, and it
// gets no future meetings so no session-reminder emails go to the fake address.
import pg from 'pg';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import fs from 'node:fs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const EMAIL = 'appreview@wintheday.work';
const NAME = 'Sam Rivera';
const COACH_EMAIL = 'coach@wintheday.app';
const TZ = 'America/Los_Angeles';
const CREDS_FILE = '.env.review';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

// Local calendar date N days ago, as YYYY-MM-DD.
function day(n) {
  const d = new Date(Date.now() - n * 86400000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d);
}
// A timestamp N days ago at a given local-ish hour (UTC offset approximated as -7).
function at(n, hour, minute = 0) {
  const d = new Date(`${day(n)}T00:00:00Z`);
  d.setUTCHours(hour + 7, minute);
  return d.toISOString();
}

function loadPassword() {
  if (!fs.existsSync(CREDS_FILE)) return null;
  const m = fs.readFileSync(CREDS_FILE, 'utf8').match(/^REVIEW_PASSWORD=(.+)$/m);
  return m ? m[1].trim() : null;
}

const COMMITMENTS = [
  { title: 'Morning meditation, 10 minutes', type: 'commitment', days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] },
  { title: 'Walk outside for 30 minutes', type: 'commitment', days: ['mon', 'tue', 'wed', 'thu', 'fri'] },
  { title: 'Phone off by 9:30pm', type: 'commitment', days: ['sun', 'mon', 'tue', 'wed', 'thu'] },
  { title: 'Pause before reacting in meetings', type: 'practice', days: ['mon', 'tue', 'wed', 'thu', 'fri'] },
  { title: 'Write for 20 minutes on the book', type: 'practice', days: ['mon', 'wed', 'fri'] },
];

const REFLECTIONS = [
  { ago: 1, rating: 4, well: 'Got my writing time in before email. Felt clear all morning.', hard: 'Skipped the walk — rained, and I let that be the excuse.', noticed: 'When I start the day with something I care about, the rest of the day feels less frantic.', tomorrow: 'Walk even if it’s drizzling. Bring the umbrella.' },
  { ago: 2, rating: 3.5, well: 'Paused before answering Jordan in standup instead of defending the timeline.', hard: 'Phone stayed on until 11. Scrolling when tired.', noticed: 'The urge to scroll shows up right after I finish something hard.', tomorrow: 'Charge the phone in the kitchen.' },
  { ago: 3, rating: 4.5, well: 'Meditation, walk, writing — all of it. Best day in a while.', hard: 'Nothing big. A little restless in the afternoon.', noticed: 'Restlessness passed in about ten minutes when I just let it be there.', tomorrow: 'Same rhythm. Don’t over-schedule the afternoon.' },
  { ago: 5, rating: 2.5, well: 'Still meditated, even though it was a rough morning.', hard: 'Big deadline. Snapped at my partner over dinner plans.', noticed: 'I tighten up and go into “get it done” mode, and stop noticing people.', tomorrow: 'Apologize. Take one real break in the afternoon.' },
  { ago: 6, rating: 3.5, well: 'Wrote 900 words. The chapter is finally moving.', hard: 'Skipped the walk to keep writing.', noticed: 'I treat rest as something I have to earn.', tomorrow: 'Walk first, then write.' },
  { ago: 8, rating: 4, well: 'Good coaching session — I left with one practice instead of five.', hard: 'Felt some resistance to slowing down.', noticed: 'Doing fewer things well feels better than doing many things anxiously.', tomorrow: 'Start the pause practice in the 10am meeting.' },
  { ago: 10, rating: 3, well: 'Walked with a friend at lunch.', hard: 'Woke up late, no meditation.', noticed: 'The evening sets up the morning more than I admit.', tomorrow: 'Phone off at 9:30.' },
  { ago: 12, rating: 3.5, well: 'Finished the outline.', hard: 'Distracted by Slack most of the afternoon.', noticed: 'I check messages when I don’t know what to write next.', tomorrow: 'Close Slack during writing time.' },
];

// [daysAgo, hour, minute, fromClient, text]
const MESSAGES = [
  [9, 18, 5, true, 'Quick one before our session — I keep adding things to my list. Should I be tracking fewer practices?'],
  [9, 19, 40, false, 'Yes — let’s pick the one that matters most this week. We’ll look at it together in our session. For now, notice which one you reach for first.'],
  [5, 21, 12, true, 'Rough day. Deadline stress and I wasn’t kind at home. Still meditated though.'],
  [5, 21, 50, false, 'Thank you for telling me. That you meditated on a hard day matters. What would it look like to be kind to yourself about this, too?'],
  [3, 20, 30, true, 'Did everything today! Meditation, walk, writing. Felt really good.'],
  [3, 20, 44, false, 'Love this. What made today work? Worth writing down so you can come back to it.'],
  [1, 8, 15, true, 'Writing first thing worked again. I think that’s the key for me.'],
];

async function main() {
  const coach = (await pool.query('SELECT id FROM users WHERE email = $1', [COACH_EMAIL])).rows[0];
  if (!coach) throw new Error(`coach ${COACH_EMAIL} not found`);

  const password = loadPassword() || crypto.randomBytes(9).toString('base64url');
  const db = await pool.connect();
  try {
    await db.query('BEGIN');

    // Wipe a previous demo account (same order as src/lib/account-deletion.ts).
    const existing = (await db.query('SELECT id FROM users WHERE email = $1', [EMAIL])).rows[0];
    if (existing) {
      const id = existing.id;
      const mine = 'SELECT id FROM messages WHERE sender_id = $1 OR recipient_id = $1';
      await db.query('DELETE FROM message_reactions WHERE user_id = $1', [id]);
      await db.query(`UPDATE messages SET parent_id = NULL WHERE parent_id IN (${mine})`, [id]);
      await db.query('DELETE FROM messages WHERE sender_id = $1 OR recipient_id = $1', [id]);
      await db.query('DELETE FROM pre_coaching_logs WHERE client_id = $1', [id]);
      await db.query('DELETE FROM meetings WHERE client_id = $1', [id]);
      await db.query('DELETE FROM win_entries WHERE user_id = $1', [id]);
      await db.query('DELETE FROM commitments WHERE user_id = $1', [id]);
      await db.query('DELETE FROM journal_entries WHERE user_id = $1', [id]);
      await db.query('DELETE FROM user_settings WHERE user_id = $1', [id]);
      await db.query('DELETE FROM client_info WHERE user_id = $1', [id]);
      await db.query('DELETE FROM users WHERE id = $1', [id]);
    }

    const userId = (await db.query(
      `INSERT INTO users (email, password_hash, name, role, created_at, last_active_at)
       VALUES ($1, $2, $3, 'client', $4, now()) RETURNING id`,
      [EMAIL, bcrypt.hashSync(password, 10), NAME, at(21, 9)]
    )).rows[0].id;

    await db.query(
      `INSERT INTO client_info (user_id, coach_id, sign_on_date, coaching_day, coaching_time, coaching_frequency, status)
       VALUES ($1, $2, $3, 'Thursday', '10:00 AM', 'Every 2 weeks', 'inactive')`,
      [userId, coach.id, day(21)]
    );

    await db.query(
      `INSERT INTO user_settings (user_id, onboarded, rating_label, timezone, nudges_enabled)
       VALUES ($1, 1, 'Daily Quality', $2, 0)`,
      [userId, TZ]
    );

    const dow = n => ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][new Date(`${day(n)}T12:00:00Z`).getUTCDay()];
    for (const [i, c] of COMMITMENTS.entries()) {
      const cid = (await db.query(
        `INSERT INTO commitments (user_id, title, type, days_of_week, active) VALUES ($1, $2, $3, $4, 1) RETURNING id`,
        [userId, c.title, c.type, JSON.stringify(c.days)]
      )).rows[0].id;
      // Past 14 days: mostly done, with a few believable misses. Today: first two done.
      for (let n = 14; n >= 0; n--) {
        if (!c.days.includes(dow(n))) continue;
        const done = n === 0 ? i < 2 : (n * 7 + i * 3) % 5 !== 0;
        await db.query(
          'INSERT INTO win_entries (user_id, commitment_id, date, completed) VALUES ($1, $2, $3, $4)',
          [userId, cid, day(n), done ? 1 : 0]
        );
      }
    }

    for (const r of REFLECTIONS) {
      const body = [
        `**What went well:** ${r.well}`,
        `**What was challenging:** ${r.hard}`,
        `**What you learned or noticed:** ${r.noticed}`,
        `**Tomorrow I will:** ${r.tomorrow}`,
      ].join('\n\n');
      await db.query(
        `INSERT INTO journal_entries (user_id, date, content, rating, created_at, updated_at, coach_opened_at)
         VALUES ($1, $2, $3, $4, $5, $5, $6)`,
        [userId, day(r.ago), JSON.stringify({ body }), r.rating, at(r.ago, 21), at(r.ago - 1 >= 0 ? r.ago : 0, 23)]
      );
    }

    for (const [ago, h, m, fromClient, text] of MESSAGES) {
      await db.query(
        `INSERT INTO messages (sender_id, recipient_id, type, content, read, archived, created_at)
         VALUES ($1, $2, $3, $4, 1, 1, $5)`,
        [fromClient ? userId : coach.id, fromClient ? coach.id : userId, fromClient ? 'question' : 'reply', text, at(ago, h, m)]
      );
    }

    // One past session (no google_event_id, so GCal reconciliation ignores it).
    const meetingId = (await db.query(
      `INSERT INTO meetings (coach_id, client_id, starts_at, ends_at, status, coach_notes)
       VALUES ($1, $2, $3, $4, 'completed', $5) RETURNING id`,
      [coach.id, userId, at(8, 10), at(8, 11), [
        '**What we found:** adding practices is a way of managing anxiety — more structure feels like safety, but it turns into pressure.',
        '',
        '**Practice for the next two weeks:** pause before reacting in meetings. One breath, notice what you feel, then respond.',
        '',
        '- Keep meditation and the walk as daily anchors',
        '- Let the rest be optional — no tracking guilt',
        '- Notice the urge to add something new, and just notice it',
      ].join('\n')]
    )).rows[0].id;
    await db.query(
      `INSERT INTO pre_coaching_logs (meeting_id, client_id, coach_id, responses, submitted_at, opened_at, acknowledged_at)
       VALUES ($1, $2, $3, $4, $5, $6, $6)`,
      [meetingId, userId, coach.id, JSON.stringify({
        request: 'I’m trying to do too many practices at once and feel like I’m failing at all of them.',
        practices_completed: 'Meditation most days. Writing three times.',
        practices_not_completed: 'Evening phone cutoff — maybe twice out of five.',
        discovery: 'I add practices when I feel anxious, like more structure will fix the anxiety. It mostly adds pressure.',
      }), at(9, 20), at(9, 21)]
    );

    await db.query('COMMIT');
    fs.writeFileSync(CREDS_FILE, `# App Store reviewer demo login (client role)\nREVIEW_EMAIL=${EMAIL}\nREVIEW_PASSWORD=${password}\n`);
    console.log(`Seeded ${NAME} (user ${userId}). Credentials in ${CREDS_FILE}.`);
  } catch (err) {
    await db.query('ROLLBACK');
    throw err;
  } finally {
    db.release();
    await pool.end();
  }
}

main().catch(err => { console.error(err); process.exit(1); });
