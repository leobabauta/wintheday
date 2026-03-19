'use client';

import { useState, useEffect } from 'react';
import DailyWins from './DailyWins';

interface Props {
  userName: string;
  reflectionTime: number;
  reflectionSnoozedUntil: string | null;
  reflectionSkippedDate: string | null;
  ratingLabel: string;
}

function getLocalDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface WinItem {
  id: number;
  commitment_id: number;
  title: string;
  type: string;
  completed: boolean;
}

export default function TodayClient({ userName, reflectionTime, reflectionSnoozedUntil, reflectionSkippedDate, ratingLabel }: Props) {
  const [date] = useState(getLocalDate);
  const [wins, setWins] = useState<WinItem[] | null>(null);
  const [reflection, setReflection] = useState('');
  const [rating, setRating] = useState(0);

  useEffect(() => {
    async function load() {
      const [winsRes, journalRes] = await Promise.all([
        fetch(`/api/wins?date=${date}`),
        fetch(`/api/journal?date=${date}`),
      ]);
      const winsData = await winsRes.json();
      const journalData = await journalRes.json();
      setWins(winsData);
      setReflection(journalData?.content || '');
      setRating(journalData?.rating ? Number(journalData.rating) : 0);
    }
    load();
  }, [date]);

  if (wins === null) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm text-navy/40">Loading...</div>
      </div>
    );
  }

  return (
    <DailyWins
      initialWins={wins}
      userName={userName}
      reflectionTime={reflectionTime}
      existingReflection={reflection}
      date={date}
      reflectionSnoozedUntil={reflectionSnoozedUntil}
      reflectionSkippedDate={reflectionSkippedDate}
      ratingLabel={ratingLabel}
      existingRating={rating}
      onRatingChange={setRating}
    />
  );
}
