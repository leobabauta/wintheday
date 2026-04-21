'use client';

import { useState, useEffect } from 'react';
import DailyWins from './DailyWins';
import ReflectionModal from '@/components/journal/ReflectionModal';

interface Props {
  userName: string;
  ratingLabel: string;
}

interface WinItem {
  id: number;
  commitment_id: number;
  title: string;
  type: string;
  completed: boolean;
}

function getLocalDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function extractReflectionPreview(content: unknown): string {
  if (typeof content !== 'string' || !content.trim()) return '';
  try {
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed === 'object') {
      const keys = ['well', 'challenge', 'learn', 'tomorrow'] as const;
      for (const k of keys) {
        const v = (parsed as Record<string, unknown>)[k];
        if (typeof v === 'string' && v.trim()) return v.trim();
      }
      return '';
    }
  } catch {}
  return content.trim();
}

export default function TodayClient({ userName, ratingLabel }: Props) {
  const [date] = useState(getLocalDate);
  const [wins, setWins] = useState<WinItem[] | null>(null);
  const [reflection, setReflection] = useState('');
  const [rating, setRating] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    async function load() {
      const [winsRes, journalRes] = await Promise.all([
        fetch(`/api/wins?date=${date}`),
        fetch(`/api/journal?date=${date}`),
      ]);
      const winsData = await winsRes.json();
      const journalData = await journalRes.json();
      setWins(winsData);
      setReflection(extractReflectionPreview(journalData?.content));
      setRating(journalData?.rating ? Number(journalData.rating) : 0);
    }
    load();
  }, [date]);

  const reload = async () => {
    const winsRes = await fetch(`/api/wins?date=${date}`);
    setWins(await winsRes.json());
  };

  const onToggle = async (id: string) => {
    if (!wins) return;
    const win = wins.find(w => String(w.id) === id);
    if (!win) return;
    const newCompleted = !win.completed;
    setWins(wins.map(w => w.id === win.id ? { ...w, completed: newCompleted } : w));
    await fetch('/api/wins', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: win.id, completed: newCompleted }),
    });
  };

  const onAddCommitment = async (title: string) => {
    await fetch('/api/commitments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        type: 'commitment',
        days_of_week: ['mon','tue','wed','thu','fri','sat','sun'],
      }),
    });
    await reload();
  };

  if (wins === null) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-[13px] text-text-muted">Loading...</div>
      </div>
    );
  }

  const commitments = wins.map(w => ({
    id: String(w.id),
    title: w.title,
    completed: w.completed,
    type: w.type as 'commitment' | 'practice',
  }));

  return (
    <>
      <DailyWins
        userName={userName}
        commitments={commitments}
        reflection={reflection}
        onToggle={onToggle}
        onAddCommitment={onAddCommitment}
        onOpenReflection={() => setModalOpen(true)}
        rating={ratingLabel}
      />
      {modalOpen && (
        <ReflectionModal
          date={date}
          existingReflection={reflection}
          existingRating={rating}
          ratingLabel={ratingLabel}
          onClose={() => setModalOpen(false)}
          onSaved={(content, r) => {
            setReflection(content);
            setRating(r);
            setModalOpen(false);
          }}
        />
      )}
    </>
  );
}
