'use client';

import { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';

const DAYS = [
  { key: 'mon', label: 'M' },
  { key: 'tue', label: 'T' },
  { key: 'wed', label: 'W' },
  { key: 'thu', label: 'T' },
  { key: 'fri', label: 'F' },
  { key: 'sat', label: 'S' },
  { key: 'sun', label: 'S' },
];

const ALL_WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri'];

interface WinEntry {
  title: string;
  type: 'commitment' | 'practice';
  days: string[];
}

export default function WelcomeFlow({ userName }: { userName: string }) {
  const [step, setStep] = useState(0);
  const [wins, setWins] = useState<WinEntry[]>([
    { title: '', type: 'commitment', days: [...ALL_WEEKDAYS] },
  ]);
  const [saving, setSaving] = useState(false);

  const commitments = wins.filter(w => w.type === 'commitment');
  const practices = wins.filter(w => w.type === 'practice');

  const updateWin = (index: number, field: string, value: unknown) => {
    setWins(prev => prev.map((w, i) => i === index ? { ...w, [field]: value } : w));
  };

  const toggleDay = (index: number, day: string) => {
    setWins(prev => prev.map((w, i) => {
      if (i !== index) return w;
      const days = w.days.includes(day) ? w.days.filter(d => d !== day) : [...w.days, day];
      return { ...w, days };
    }));
  };

  const addCommitment = () => {
    if (commitments.length >= 3) return;
    setWins(prev => [...prev, { title: '', type: 'commitment', days: [...ALL_WEEKDAYS] }]);
  };

  const addPractice = () => {
    setWins(prev => [...prev, { title: '', type: 'practice', days: [...ALL_WEEKDAYS] }]);
  };

  const removeWin = (index: number) => {
    setWins(prev => prev.filter((_, i) => i !== index));
  };

  const handleFinish = async () => {
    const valid = wins.filter(w => w.title.trim() && w.days.length > 0);
    if (valid.length === 0) return;

    setSaving(true);
    try {
      for (const win of valid) {
        await fetch('/api/commitments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: win.title.trim(),
            type: win.type,
            days_of_week: win.days,
          }),
        });
      }

      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onboarded: true }),
      });

      window.location.href = '/today';
    } catch {
      setSaving(false);
    }
  };

  const canProceedToStep2 = commitments.some(c => c.title.trim() && c.days.length > 0);
  const canFinish = canProceedToStep2 && practices.some(p => p.title.trim() && p.days.length > 0);

  // Step 0: Welcome
  if (step === 0) {
    return (
      <div className="flex flex-col items-center text-center pt-8">
        <div className="text-6xl mb-6">🏆</div>
        <h1 className="text-3xl font-bold text-navy mb-3">Win the Day</h1>
        <p className="text-navy/60 max-w-xs leading-relaxed mb-8">
          Welcome, {userName.split(' ')[0]}! This app helps you track your daily
          commitments and practices so you can build momentum and win each day.
        </p>
        <Card className="w-full text-left mb-6">
          <h3 className="font-semibold text-navy mb-3">How it works</h3>
          <div className="space-y-3 text-sm text-navy/70">
            <div className="flex gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-navy text-white text-xs flex items-center justify-center">1</span>
              <p>Set 1–3 <strong>commitments</strong> — the things you&apos;re committed to doing each day.</p>
            </div>
            <div className="flex gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-navy text-white text-xs flex items-center justify-center">2</span>
              <p>Set a <strong>practice</strong> — something you want to cultivate consistently.</p>
            </div>
            <div className="flex gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-navy text-white text-xs flex items-center justify-center">3</span>
              <p>Check them off each day and <strong>win the day</strong>!</p>
            </div>
          </div>
        </Card>
        <Button onClick={() => setStep(1)} className="w-full">
          Get Started
        </Button>
      </div>
    );
  }

  // Step 1: Commitments
  if (step === 1) {
    return (
      <div>
        <p className="text-xs text-navy/40 uppercase tracking-wider font-semibold mb-1">Step 1 of 2</p>
        <h1 className="text-2xl font-bold text-navy mb-2">Your Commitments</h1>
        <p className="text-sm text-navy/60 mb-6">
          What 1–3 things are you committed to doing? Choose the days each one applies.
        </p>

        <div className="space-y-4 mb-6">
          {wins.map((win, i) => {
            if (win.type !== 'commitment') return null;
            return (
              <Card key={i}>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <Input
                    placeholder="e.g., Morning meditation (10 min)"
                    value={win.title}
                    onChange={e => updateWin(i, 'title', e.target.value)}
                    className="flex-1"
                  />
                  {commitments.length > 1 && (
                    <button onClick={() => removeWin(i)} className="text-navy/30 hover:text-danger text-lg mt-1 shrink-0">×</button>
                  )}
                </div>
                <div className="flex gap-2">
                  {DAYS.map(d => (
                    <button
                      key={d.key}
                      onClick={() => toggleDay(i, d.key)}
                      className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                        win.days.includes(d.key) ? 'bg-navy text-white' : 'bg-lavender-light text-navy/40'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>

        {commitments.length < 3 && (
          <button
            onClick={addCommitment}
            className="w-full py-3 rounded-xl border-2 border-dashed border-lavender-dark/40 text-sm text-navy/50 hover:border-navy/30 hover:text-navy/70 transition-colors mb-6"
          >
            + Add another commitment
          </button>
        )}

        <Button
          onClick={() => {
            if (practices.length === 0) {
              setWins(prev => [...prev, { title: '', type: 'practice', days: [...ALL_WEEKDAYS] }]);
            }
            setStep(2);
          }}
          disabled={!canProceedToStep2}
          className="w-full"
        >
          Next
        </Button>
      </div>
    );
  }

  // Step 2: Practice
  return (
    <div>
      <p className="text-xs text-navy/40 uppercase tracking-wider font-semibold mb-1">Step 2 of 2</p>
      <h1 className="text-2xl font-bold text-navy mb-2">Your Practice</h1>
      <p className="text-sm text-navy/60 mb-6">
        What&apos;s one thing you want to practice consistently? This is something you&apos;re cultivating — not a task, but an ongoing practice.
      </p>

      <div className="space-y-4 mb-6">
        {wins.map((win, i) => {
          if (win.type !== 'practice') return null;
          return (
            <Card key={i}>
              <div className="flex items-start justify-between gap-2 mb-3">
                <Input
                  placeholder="e.g., Practice being present"
                  value={win.title}
                  onChange={e => updateWin(i, 'title', e.target.value)}
                  className="flex-1"
                />
                {practices.length > 1 && (
                  <button onClick={() => removeWin(i)} className="text-navy/30 hover:text-danger text-lg mt-1 shrink-0">×</button>
                )}
              </div>
              <div className="flex gap-2">
                {DAYS.map(d => (
                  <button
                    key={d.key}
                    onClick={() => toggleDay(i, d.key)}
                    className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                      win.days.includes(d.key) ? 'bg-navy text-white' : 'bg-lavender-light text-navy/40'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </Card>
          );
        })}
      </div>

      {practices.length === 0 && (
        <button
          onClick={addPractice}
          className="w-full py-3 rounded-xl border-2 border-dashed border-lavender-dark/40 text-sm text-navy/50 hover:border-navy/30 hover:text-navy/70 transition-colors mb-6"
        >
          + Add a practice
        </button>
      )}

      {practices.length > 0 && (
        <button
          onClick={addPractice}
          className="w-full py-3 rounded-xl border-2 border-dashed border-lavender-dark/40 text-sm text-navy/50 hover:border-navy/30 hover:text-navy/70 transition-colors mb-6"
        >
          + Add another practice
        </button>
      )}

      {/* Summary */}
      <Card className="mb-6">
        <h3 className="text-xs font-semibold text-navy/50 uppercase tracking-wider mb-3">Your Wins</h3>
        <div className="space-y-2">
          {wins.filter(w => w.title.trim()).map((w, i) => (
            <div key={i} className="flex items-center gap-2">
              <Badge variant={w.type === 'commitment' ? 'default' : 'success'} className="text-[10px]">
                {w.type}
              </Badge>
              <span className="text-sm text-navy">{w.title}</span>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex gap-3">
        <Button variant="ghost" onClick={() => setStep(1)} className="flex-1">
          Back
        </Button>
        <Button onClick={handleFinish} disabled={!canFinish || saving} className="flex-1">
          {saving ? 'Saving...' : 'Start Winning!'}
        </Button>
      </div>
    </div>
  );
}
