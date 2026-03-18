'use client';

import { useState, useCallback, useEffect } from 'react';
import confetti from 'canvas-confetti';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import TrophyIcon from '@/components/ui/TrophyIcon';
import ReflectionModal from '@/components/journal/ReflectionModal';

interface WinItem {
  id: number;
  commitment_id: number;
  title: string;
  type: string;
  completed: boolean;
}

interface DailyWinsProps {
  initialWins: WinItem[];
  userName: string;
  reflectionTime: number;
  existingReflection: string;
  date: string;
  reflectionSnoozedUntil: string | null;
  reflectionSkippedDate: string | null;
}

function StarCircle({ completed, animating }: { completed: boolean; animating: boolean }) {
  return (
    <div
      className={`w-5 h-5 rounded-full flex items-center justify-center transition-all duration-400 shrink-0 ${
        completed
          ? 'bg-gold scale-110 shadow-sm shadow-gold/30'
          : 'border-[1.5px] border-lavender-dark'
      } ${animating ? 'animate-bounce' : ''}`}
    >
      {completed && (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="white" stroke="none">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      )}
    </div>
  );
}

export default function DailyWins({ initialWins, userName, reflectionTime, existingReflection, date, reflectionSnoozedUntil, reflectionSkippedDate }: DailyWinsProps) {
  const [wins, setWins] = useState(initialWins);
  const [allComplete, setAllComplete] = useState(initialWins.every(w => w.completed) && initialWins.length > 0);
  const [celebrating, setCelebrating] = useState(false);
  const [animatingId, setAnimatingId] = useState<number | null>(null);
  const [showReflection, setShowReflection] = useState(false);
  const [reflection, setReflection] = useState(existingReflection);
  const [showModal, setShowModal] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [snoozedUntil, setSnoozedUntil] = useState(reflectionSnoozedUntil);
  const [skippedDate, setSkippedDate] = useState(reflectionSkippedDate);

  const commitments = wins.filter(w => w.type === 'commitment');
  const practices = wins.filter(w => w.type === 'practice');
  const completedCount = wins.filter(w => w.completed).length;
  const totalCount = wins.length;
  const progressPct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const isAllDone = completedCount === totalCount && totalCount > 0;

  useEffect(() => {
    const checkTime = () => {
      const now = new Date();
      const isTime = now.getHours() >= reflectionTime;
      setShowReflection(isTime);

      // Show prompt popup if it's time and not snoozed/skipped
      if (isTime && skippedDate !== date) {
        const isSnoozed = snoozedUntil && new Date(snoozedUntil) > now;
        if (!isSnoozed) {
          setShowPrompt(true);
        }
      }
    };
    checkTime();
    const interval = setInterval(checkTime, 60000);
    return () => clearInterval(interval);
  }, [reflectionTime, date, snoozedUntil, skippedDate]);

  const handleSnooze = async () => {
    const until = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    setSnoozedUntil(until);
    setShowPrompt(false);
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reflection_snoozed_until: until }),
    });
  };

  const handleSkip = async () => {
    setSkippedDate(date);
    setShowPrompt(false);
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reflection_skipped_date: date }),
    });
  };

  const fireSmallConfetti = useCallback(() => {
    confetti({
      particleCount: 30,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#F0A500', '#FFEEB0', '#1B1F3B', '#22C55E'],
    });
  }, []);

  const fireBigConfetti = useCallback(() => {
    const duration = 2000;
    const end = Date.now() + duration;
    const frame = () => {
      confetti({
        particleCount: 50,
        spread: 100,
        startVelocity: 40,
        origin: { x: Math.random(), y: Math.random() * 0.4 },
        colors: ['#F0A500', '#FFEEB0', '#FFD700', '#1B1F3B', '#22C55E'],
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, []);

  const toggleWin = async (winId: number) => {
    const win = wins.find(w => w.id === winId);
    if (!win) return;

    const newCompleted = !win.completed;
    setWins(prev => prev.map(w => w.id === winId ? { ...w, completed: newCompleted } : w));

    if (newCompleted) {
      setAnimatingId(winId);
      setTimeout(() => setAnimatingId(null), 600);
    }

    try {
      await fetch('/api/wins', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: winId, completed: newCompleted }),
      });
    } catch {
      setWins(prev => prev.map(w => w.id === winId ? { ...w, completed: !newCompleted } : w));
      return;
    }

    if (newCompleted) {
      fireSmallConfetti();
      const updatedWins = wins.map(w => w.id === winId ? { ...w, completed: true } : w);
      const allDone = updatedWins.every(w => w.completed);
      if (allDone && !allComplete) {
        setAllComplete(true);
        setCelebrating(true);
        setTimeout(() => fireBigConfetti(), 300);
        setTimeout(() => setCelebrating(false), 3000);
      }
    } else {
      setAllComplete(false);
    }
  };

  const hasReflection = (() => {
    try {
      const parsed = JSON.parse(reflection);
      return typeof parsed === 'object' && parsed !== null && Object.values(parsed).some((v: unknown) => typeof v === 'string' && v.trim());
    } catch {
      return !!reflection.trim();
    }
  })();

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  if (totalCount === 0) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-navy">{greeting()}, {userName.split(' ')[0]}!</h1>
          <p className="text-sm text-navy/50 mt-1">{today}</p>
        </div>
        <Card>
          <p className="text-center text-navy/50 py-4">
            No wins scheduled for today. Enjoy your day off!
          </p>
        </Card>
        <div className="mt-3 text-center">
          <Link href="/settings" className="text-xs text-navy/40 hover:text-navy transition-colors">
            Edit wins
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-navy">{greeting()}, {userName.split(' ')[0]}!</h1>
        <p className="text-sm text-navy/50 mt-1">{today}</p>
      </div>

      {/* Progress */}
      <Card className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-navy/70">Progress: Win the Day</span>
          <span className="text-sm font-bold text-navy">{completedCount}/{totalCount}</span>
        </div>
        <div className="w-full bg-lavender-light rounded-full h-3">
          <div
            className={`rounded-full h-3 transition-all duration-500 ${
              isAllDone ? 'bg-gold shadow-sm shadow-gold/40' : 'bg-navy'
            }`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </Card>

      {/* All Complete Celebration */}
      {allComplete && (
        <Card className={`mb-4 text-center border-2 border-gold/30 ${celebrating ? 'animate-pulse' : ''}`}>
          <div className="flex justify-center mb-2"><TrophyIcon size={56} /></div>
          <h2 className="text-xl font-extrabold text-navy">You Won the Day!</h2>
          <p className="text-sm text-navy/60 mt-1">Amazing work! Every single win — crushed it.</p>
        </Card>
      )}

      {/* Almost there */}
      {!allComplete && completedCount > 0 && completedCount === totalCount - 1 && (
        <Card className="mb-4 text-center border border-gold/30">
          <p className="text-sm text-navy/70">Almost there! Just one more to win the day!</p>
        </Card>
      )}

      {/* Commitments */}
      {commitments.length > 0 && (
        <Card className="mb-4">
          <h2 className="text-xs font-bold text-navy/50 uppercase tracking-wider mb-4">
            {commitments.length === 1 ? 'Commitment' : 'Commitments'}
          </h2>
          <div className="space-y-3">
            {commitments.map(win => (
              <WinRow key={win.id} win={win} onToggle={toggleWin} animating={animatingId === win.id} />
            ))}
          </div>
        </Card>
      )}

      {/* Practices */}
      {practices.length > 0 && (
        <Card className="mb-4">
          <h2 className="text-xs font-bold text-navy/50 uppercase tracking-wider mb-4">
            {practices.length === 1 ? 'Practice' : 'Practices'}
          </h2>
          <div className="space-y-3">
            {practices.map(win => (
              <WinRow key={win.id} win={win} onToggle={toggleWin} animating={animatingId === win.id} />
            ))}
          </div>
        </Card>
      )}

      {/* Edit wins link */}
      <div className="text-center mb-2">
        <Link href="/settings" className="text-xs text-navy/40 hover:text-navy transition-colors">
          Edit wins
        </Link>
      </div>

      {/* Encouragement */}
      {!allComplete && completedCount > 0 && (
        <div className="text-center py-2">
          <p className="text-sm text-navy/50">
            {completedCount >= totalCount / 2
              ? "You're doing great! Keep going!"
              : "Every win counts. You've got this!"}
          </p>
        </div>
      )}

      {/* Daily Reflection (time-gated) */}
      {showReflection && (
        <button
          onClick={() => setShowModal(true)}
          className="w-full mt-4"
        >
          <Card className="hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-navy/5 flex items-center justify-center shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-navy/40">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
              </div>
              <div className="text-left">
                <h2 className="text-sm font-semibold text-navy">Daily Reflection Time</h2>
                <p className="text-xs text-navy/40">
                  {hasReflection ? 'Tap to view or edit your reflection' : 'Tap to start your reflection'}
                </p>
              </div>
              {hasReflection && (
                <span className="ml-auto text-[10px] text-success font-medium">Done</span>
              )}
            </div>
          </Card>
        </button>
      )}

      {/* Reflection prompt popup */}
      {showPrompt && !showModal && !hasReflection && (
        <div className="fixed bottom-24 left-0 right-0 flex justify-center z-40 px-4">
          <div className="w-full max-w-[480px] bg-card rounded-2xl shadow-lg border border-lavender-dark/20 p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center shrink-0 mt-0.5">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-gold">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-navy">Time for your daily reflection</p>
                <p className="text-xs text-navy/40 mt-0.5">Take a moment to reflect on your day</p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => { setShowPrompt(false); setShowModal(true); }}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium bg-navy text-white hover:bg-navy-light transition-colors"
                  >
                    Start Reflection
                  </button>
                  <button
                    onClick={handleSnooze}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium text-navy/50 hover:bg-lavender-light/40 transition-colors"
                  >
                    Snooze 30 min
                  </button>
                  <button
                    onClick={handleSkip}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium text-navy/30 hover:text-navy/50 transition-colors"
                  >
                    Skip
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reflection modal */}
      {showModal && (
        <ReflectionModal
          date={date}
          existingReflection={reflection}
          onClose={() => setShowModal(false)}
          onSaved={(content) => setReflection(content)}
        />
      )}
    </div>
  );
}

function WinRow({ win, onToggle, animating }: { win: { id: number; title: string; completed: boolean }; onToggle: (id: number) => void; animating: boolean }) {
  return (
    <button
      onClick={() => onToggle(win.id)}
      className="flex items-center gap-3 w-full text-left group"
    >
      <StarCircle completed={win.completed} animating={animating} />
      <span
        className={`text-sm transition-all duration-300 ${
          win.completed ? 'text-navy/40 line-through' : 'text-navy font-semibold'
        }`}
      >
        {win.title}
      </span>
    </button>
  );
}
