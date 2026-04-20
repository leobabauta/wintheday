'use client';

import { useRouter } from 'next/navigation';
import JournalView, { JournalEntry } from './JournalView';

export default function JournalClient({
  entries,
  today,
  ratingLabel,
}: {
  entries: JournalEntry[];
  today: string;
  ratingLabel: string;
}) {
  const router = useRouter();

  const onCreate = async (well: string) => {
    await fetch('/api/journal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: today, content: JSON.stringify({ well }) }),
    });
    router.refresh();
  };

  return <JournalView entries={entries} today={today} ratingLabel={ratingLabel} onCreate={onCreate} />;
}
