'use client';

import { useRouter } from 'next/navigation';
import WelcomeFlow from './WelcomeFlow';

interface DraftCommitment {
  id: string;
  title: string;
  days: string[];
}

interface WelcomeState {
  commitments: DraftCommitment[];
  practice: string;
  rating: string;
}

export default function WelcomeFlowWrapper({ userName }: { userName: string }) {
  const router = useRouter();

  const onComplete = async (state: WelcomeState) => {
    for (const c of state.commitments) {
      await fetch('/api/commitments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: c.title, type: 'commitment', days_of_week: c.days }),
      });
    }
    if (state.practice.trim()) {
      await fetch('/api/commitments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: state.practice.trim(),
          type: 'practice',
          days_of_week: ['mon','tue','wed','thu','fri','sat','sun'],
        }),
      });
    }
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ onboarded: true, rating_label: state.rating.toLowerCase() }),
    });
    router.push('/today');
  };

  return <WelcomeFlow userName={userName} onComplete={onComplete} />;
}
