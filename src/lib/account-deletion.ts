import { query, queryOne, transaction } from './db';
import { Resend } from 'resend';

const PHOTO_BUCKET = 'message-photos';

// Permanently deletes a client account and everything tied to it (App Store
// guideline 5.1.1(v)). Most FKs to users have no ON DELETE CASCADE, so
// dependents are removed explicitly, children before parents, in one
// transaction. Coach-authored rows about this client (session notes, payment
// terms in client_info) go too — nothing survives that points at the user.
export async function deleteClientAccount(userId: number): Promise<void> {
  const user = await queryOne<{ name: string; email: string }>(
    'SELECT name, email FROM users WHERE id = $1',
    [userId]
  );
  if (!user) return;

  const coach = await queryOne<{ email: string }>(
    `SELECT u.email FROM client_info ci JOIN users u ON u.id = ci.coach_id WHERE ci.user_id = $1`,
    [userId]
  );

  // Collected before the delete so storage can be cleaned up afterwards.
  const photos = await query<{ attachment_url: string }>(
    `SELECT attachment_url FROM messages
     WHERE (sender_id = $1 OR recipient_id = $1) AND attachment_url IS NOT NULL`,
    [userId]
  );

  await transaction(async (exec) => {
    const mine = `SELECT id FROM messages WHERE sender_id = $1 OR recipient_id = $1`;
    // Reactions on this user's conversation go via ON DELETE CASCADE from
    // messages; this catches any the user left elsewhere.
    await exec('DELETE FROM message_reactions WHERE user_id = $1', [userId]);
    await exec(`UPDATE messages SET parent_id = NULL WHERE parent_id IN (${mine})`, [userId]);
    await exec('DELETE FROM messages WHERE sender_id = $1 OR recipient_id = $1', [userId]);
    await exec('DELETE FROM pre_coaching_logs WHERE client_id = $1', [userId]);
    await exec('DELETE FROM meetings WHERE client_id = $1', [userId]);
    await exec('UPDATE meetings SET reschedule_requested_by = NULL WHERE reschedule_requested_by = $1', [userId]);
    await exec('DELETE FROM win_entries WHERE user_id = $1', [userId]);
    await exec('DELETE FROM commitments WHERE user_id = $1', [userId]);
    await exec('DELETE FROM journal_entries WHERE user_id = $1', [userId]);
    await exec('DELETE FROM user_settings WHERE user_id = $1', [userId]);
    await exec('DELETE FROM client_info WHERE user_id = $1', [userId]);
    // daily_completions and device_tokens cascade.
    await exec('DELETE FROM users WHERE id = $1', [userId]);
  });

  await Promise.all([
    deletePhotos(photos.map(p => p.attachment_url)),
    notifyCoach(coach?.email, user),
  ]);
}

async function deletePhotos(urls: string[]) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey || urls.length === 0) return;

  const marker = `/storage/v1/object/public/${PHOTO_BUCKET}/`;
  const prefixes = urls
    .map(u => (u.includes(marker) ? u.slice(u.indexOf(marker) + marker.length) : null))
    .filter((p): p is string => !!p);
  if (prefixes.length === 0) return;

  // Best-effort: the account is already gone, so a storage hiccup is logged, not thrown.
  await fetch(`${supabaseUrl}/storage/v1/object/${PHOTO_BUCKET}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefixes }),
  }).catch(err => console.error('account deletion: photo cleanup failed:', err));
}

async function notifyCoach(coachEmail: string | undefined, client: { name: string; email: string }) {
  if (!coachEmail || !process.env.RESEND_API_KEY) return;
  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails
    .send({
      from: process.env.REMINDER_FROM_EMAIL || 'Win the Day <onboarding@resend.dev>',
      to: coachEmail,
      subject: `${client.name} deleted their account`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
          <h2 style="color: #1A1714; font-size: 20px; margin-bottom: 8px;">Account deleted</h2>
          <p style="color: #5A4F45; font-size: 15px; line-height: 1.6;">
            <strong>${client.name}</strong> (${client.email}) deleted their Win the Day account from the app.
            Their wins, reflections, messages and session history have been permanently removed.
          </p>
        </div>
      `,
    })
    .catch(err => console.error('account deletion: coach email failed:', err));
}
