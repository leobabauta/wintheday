'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import confetti from 'canvas-confetti';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import TrophyIcon from '@/components/ui/TrophyIcon';

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

export default function DailyWins({ initialWins, userName, reflectionTime, existingReflection, date }: DailyWinsProps) {
  const [wins, setWins] = useState(initialWins);
  const [allComplete, setAllComplete] = useState(initialWins.every(w => w.completed) && initialWins.length > 0);
  const [celebrating, setCelebrating] = useState(false);
  const [animatingId, setAnimatingId] = useState<number | null>(null);
  const [showReflection, setShowReflection] = useState(false);
  const [reflection, setReflection] = useState(existingReflection);
  const [reflectionSaved, setReflectionSaved] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

  const commitments = wins.filter(w => w.type === 'commitment');
  const practices = wins.filter(w => w.type === 'practice');
  const completedCount = wins.filter(w => w.completed).length;
  const totalCount = wins.length;
  const progressPct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const isAllDone = completedCount === totalCount && totalCount > 0;

  useEffect(() => {
    const checkTime = () => {
      setShowReflection(new Date().getHours() >= reflectionTime);
    };
    checkTime();
    const interval = setInterval(checkTime, 60000);
    return () => clearInterval(interval);
  }, [reflectionTime]);

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

  const saveReflection = useCallback(async (text: string) => {
    try {
      await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, content: text }),
      });
      setReflectionSaved(true);
    } catch { /* retry on next change */ }
  }, [date]);

  const handleReflectionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setReflection(text);
    setReflectionSaved(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => saveReflection(text), 2000);
  };

  const handleReflectionBlur = () => {
    if (!reflectionSaved) {
      if (timerRef.current) clearTimeout(timerRef.current);
      saveReflection(reflection);
    }
  };

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
        <Card className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold text-navy/50 uppercase tracking-wider">Daily Reflection</h2>
            <span className={`text-[10px] ${reflectionSaved ? 'text-success' : 'text-warning'}`}>
              {reflectionSaved ? (reflection ? 'Saved' : '') : 'Saving...'}
            </span>
          </div>
          <div className="mb-3 space-y-0.5">
            <p className="text-xs text-navy/40 italic">What went well today?</p>
            <p className="text-xs text-navy/40 italic">What was challenging?</p>
            <p className="text-xs text-navy/40 italic">What will you focus on tomorrow?</p>
          </div>
          <textarea
            value={reflection}
            onChange={handleReflectionChange}
            onBlur={handleReflectionBlur}
            placeholder="Write your reflection here..."
            className="w-full h-32 bg-lavender-light/40 rounded-xl p-4 text-sm text-navy outline-none resize-none focus:ring-1 focus:ring-navy/20 transition-colors"
          />
        </Card>
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
