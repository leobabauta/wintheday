// Shared SQL fragment so every surface that loads a thread returns reactions
// in the same shape. Expects the messages table to be aliased as `m`.
export const REACTIONS_SELECT = `COALESCE((
    SELECT json_agg(json_build_object('emoji', r.emoji, 'userId', r.user_id) ORDER BY r.created_at)
    FROM message_reactions r WHERE r.message_id = m.id
  ), '[]'::json) AS reactions`;
