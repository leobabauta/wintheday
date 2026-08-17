// Emoji reactions on chat messages.
//
// A fixed set, deliberately: it keeps the picker to one tap, avoids a picker
// dependency, and lets the API whitelist what it stores. Both the UI row and
// the server validation read from this list, so adding one here is enough.

export const REACTION_EMOJI = ['❤️', '👍', '😂', '🔥', '😮', '🙏'] as const;

export type ReactionEmoji = (typeof REACTION_EMOJI)[number];

export function isReactionEmoji(value: unknown): value is ReactionEmoji {
  return typeof value === 'string' && (REACTION_EMOJI as readonly string[]).includes(value);
}

// Raw rows as the messages API returns them, one per (user, emoji).
export interface RawReaction {
  emoji: string;
  userId: number;
}

// What a bubble renders: one chip per emoji, with a count and whether the
// viewer is one of the reactors.
export interface GroupedReaction {
  emoji: string;
  count: number;
  mine: boolean;
}

export function groupReactions(raw: RawReaction[] | undefined | null, viewerId: number): GroupedReaction[] {
  if (!raw || raw.length === 0) return [];
  const order: string[] = [];
  const byEmoji = new Map<string, GroupedReaction>();
  for (const r of raw) {
    let entry = byEmoji.get(r.emoji);
    if (!entry) {
      entry = { emoji: r.emoji, count: 0, mine: false };
      byEmoji.set(r.emoji, entry);
      order.push(r.emoji);
    }
    entry.count += 1;
    if (r.userId === viewerId) entry.mine = true;
  }
  return order.map(e => byEmoji.get(e)!);
}

// Local toggle used for the optimistic update before the POST lands.
export function toggleReaction(raw: RawReaction[] | undefined | null, viewerId: number, emoji: string): RawReaction[] {
  const list = raw ?? [];
  const has = list.some(r => r.userId === viewerId && r.emoji === emoji);
  return has
    ? list.filter(r => !(r.userId === viewerId && r.emoji === emoji))
    : [...list, { emoji, userId: viewerId }];
}
