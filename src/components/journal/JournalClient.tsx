'use client';

import { useRouter } from 'next/navigation';
import JournalView, { JournalEntry } from './JournalView';

export default function JournalClient({ entries, today }: { entries: JournalEntry[]; today: string }) {
  const router = useRouter();

  const onCreate = async (text: string) => {
    await fetch('/api/journal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: today, content: JSON.stringify({ well: text }) }),
    });
    router.refresh();
  };

  return <JournalView entries={entries} today={today} onCreate={onCreate} />;
}
