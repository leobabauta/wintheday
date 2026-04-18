'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import MutedMono from '@/components/ui/MutedMono';

const DAYS = [
  { k: 'mon', l: 'M' }, { k: 'tue', l: 'T' }, { k: 'wed', l: 'W' },
  { k: 'thu', l: 'T' }, { k: 'fri', l: 'F' }, { k: 'sat', l: 'S' }, { k: 'sun', l: 'S' },
];

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

interface Props {
  userName: string;
  onComplete: (s: WelcomeState) => Promise<void>;
}

export default function WelcomeFlow({ userName, onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [state, setState] = useState<WelcomeState>({
    commitments: [],
    practice: '',
    rating: 'Inner peace',
  });

  const Steps = [
    <Intro key="intro" name={userName} onNext={() => setStep(1)} />,
    <CommitBuilder key="commits"
      commitments={state.commitments}
      onChange={(cs) => setState({ ...state, commitments: cs })}
      onBack={() => setStep(0)}
      onNext={() => setStep(2)} />,
    <PracticeStep key="practice"
      value={state.practice}
      onChange={(v) => setState({ ...state, practice: v })}
      onBack={() => setStep(1)}
      onNext={() => setStep(3)} />,
    <Done key="done" state={state} name={userName} onBack={() => setStep(2)} onComplete={() => onComplete(state)} />,
  ];

  return (
    <div className="max-w-[420px] mx-auto pt-12 pb-24 min-h-dvh flex flex-col">
      <Progress step={step} total={Steps.length} />
      <div className="flex-1 flex flex-col justify-center">
        {Steps[step]}
      </div>
    </div>
  );
}

function Progress({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex gap-1 mb-12">
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} className={`flex-1 h-[2px] rounded ${i <= step ? 'bg-accent' : 'bg-border'}`} />
      ))}
    </div>
  );
}

function Intro({ name, onNext }: { name: string; onNext: () => void }) {
  return (
    <div className="text-center">
      <MutedMono>Welcome, {name.split(' ')[0].toLowerCase()}</MutedMono>
      <h1 className="font-display text-[34px] mt-4 leading-[1.15]">
        A small enough day<br/><em>to win.</em>
      </h1>
      <p className="reflection-text text-text-secondary text-[16px] mt-6 text-pretty">
        A handful of commitments, a practice you want to keep alive, a nightly reflection. That&apos;s the whole app.
      </p>
      <Button variant="filled" size="lg" className="mt-10" onClick={onNext}>Begin</Button>
    </div>
  );
}

function CommitBuilder({
  commitments, onChange, onBack, onNext,
}: {
  commitments: DraftCommitment[];
  onChange: (cs: DraftCommitment[]) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const [draft, setDraft] = useState('');

  const add = () => {
    if (!draft.trim()) return;
    onChange([...commitments, {
      id: 'c' + Date.now(), title: draft.trim(), days: ['mon','tue','wed','thu','fri'],
    }]);
    setDraft('');
  };
  const remove = (id: string) => onChange(commitments.filter(c => c.id !== id));
  const toggleDay = (id: string, day: string) => onChange(commitments.map(c =>
    c.id === id ? { ...c, days: c.days.includes(day) ? c.days.filter(d => d !== day) : [...c.days, day] } : c
  ));

  return (
    <div>
      <MutedMono>Step 02 · commitments</MutedMono>
      <h2 className="font-display text-[26px] mt-3 leading-[1.2]">
        What will you commit to?
      </h2>
      <p className="reflection-text text-text-secondary text-[15px] mt-3">
        Start with one or two small things. You can always add more.
      </p>

      <div className="mt-8 border-t border-border">
        {commitments.map(c => (
          <div key={c.id} className="py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="flex-1 text-[14px]">{c.title}</span>
              <button onClick={() => remove(c.id)} className="font-mono text-[10px] tracking-[0.12em] uppercase text-destructive">Remove</button>
            </div>
            <div className="flex gap-1.5 mt-2">
              {DAYS.map(d => (
                <button key={d.k} onClick={() => toggleDay(c.id, d.k)}
                  className={`w-7 h-7 rounded-full text-[11px] font-mono ${c.days.includes(d.k) ? 'bg-accent text-bg' : 'border border-border text-text-muted'}`}>
                  {d.l}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mt-4">
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') add(); }}
          placeholder="e.g., Morning meditation (10 min)"
          className="flex-1"
        />
        <Button variant="outline" onClick={add} disabled={!draft.trim()}>Add</Button>
      </div>

      <div className="flex gap-2 mt-12 justify-between">
        <Button variant="text" onClick={onBack}>← Back</Button>
        <Button variant="filled" onClick={onNext} disabled={commitments.length === 0}>
          Continue · {commitments.length} {commitments.length === 1 ? 'commitment' : 'commitments'}
        </Button>
      </div>
    </div>
  );
}

function PracticeStep({ value, onChange, onBack, onNext }: {
  value: string; onChange: (v: string) => void; onBack: () => void; onNext: () => void;
}) {
  return (
    <div>
      <MutedMono>Step 03 · practice</MutedMono>
      <h2 className="font-display text-[26px] mt-3 leading-[1.2]">
        What&apos;s the practice you want to grow?
      </h2>
      <p className="reflection-text text-text-secondary text-[15px] mt-3">
        Not a task — a way of being. "Being present." "Patience." "Showing up."
      </p>
      <input
        autoFocus
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Being present"
        className="w-full mt-8 text-[18px]"
      />
      <div className="flex gap-2 mt-12 justify-between">
        <Button variant="text" onClick={onBack}>← Back</Button>
        <Button variant="filled" onClick={onNext} disabled={!value.trim()}>Continue</Button>
      </div>
    </div>
  );
}

function Done({ state, name, onBack, onComplete }: {
  state: WelcomeState; name: string; onBack: () => void; onComplete: () => Promise<void>;
}) {
  return (
    <div className="text-center">
      <MutedMono>Ready</MutedMono>
      <h2 className="font-display text-[30px] mt-3 leading-[1.15]">
        Let&apos;s begin, {name.split(' ')[0]}.
      </h2>
      <p className="reflection-text text-text-secondary text-[16px] mt-4">
        {state.commitments.length} {state.commitments.length === 1 ? 'commitment' : 'commitments'}. Practice: <em>{state.practice || 'being present'}</em>.
      </p>
      <div className="flex gap-2 mt-10 justify-center">
        <Button variant="text" onClick={onBack}>← Back</Button>
        <Button variant="filled" size="lg" onClick={onComplete}>Enter</Button>
      </div>
    </div>
  );
}
