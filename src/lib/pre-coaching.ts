export const PRE_COACHING_PROMPTS: Array<{ key: string; label: string; hint?: string }> = [
  { key: 'request', label: 'Request for coaching this week' },
  { key: 'practices_completed', label: 'Practices I completed' },
  { key: 'practices_not_completed', label: 'Practices I did not complete' },
  {
    key: 'discovery',
    label: 'What did you discover for yourself this week, by virtue of the practices you took on?',
  },
];

export type PreCoachingResponses = Partial<Record<string, string>>;
