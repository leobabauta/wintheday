'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Commitment {
  id: number;
  title: string;
  type: string;
  days_of_week: string;
  active: number;
}

const DAYS = [
  { key: 'mon', label: 'M' },
  { key: 'tue', label: 'T' },
  { key: 'wed', label: 'W' },
  { key: 'thu', label: 'T' },
  { key: 'fri', label: 'F' },
  { key: 'sat', label: 'S' },
  { key: 'sun', label: 'S' },
];

interface Props {
  initialCommitments: Commitment[];
  userId?: number; // Set when coach is editing for a client
}

// ZHD CommitmentEditor — no Card boxes, no black-pill day markers, no Badge.
// Hairline separators between items, mono-caps eyebrows, accent underline
// links for Edit/Remove, ring-style day pills (outline by default, accent
// fill when active). Fits inside the /settings "Your wins" section.

export default function CommitmentEditor({ initialCommitments, userId }: Props) {
  const router = useRouter();
  const [commitments, setCommitments] = useState(initialCommitments);
  const [editing, setEditing] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: '', type: 'commitment' as string, days: [] as string[] });

  const active = commitments.filter(c => c.active);
  const activeCommitments = active.filter(c => c.type === 'commitment');
  const activePractices = active.filter(c => c.type === 'practice');

  const resetForm = () => {
    setForm({ title: '', type: 'commitment', days: [] });
    setAdding(false);
    setEditing(null);
  };

  const toggleDay = (day: string) => {
    setForm(prev => ({
      ...prev,
      days: prev.days.includes(day) ? prev.days.filter(d => d !== day) : [...prev.days, day],
    }));
  };

  const handleSave = async () => {
    if (!form.title.trim() || form.days.length === 0) return;
    const body: Record<string, unknown> = {
      title: form.title,
      type: form.type,
      days_of_week: form.days,
    };
    if (userId) body.userId = userId;

    if (editing !== null) {
      body.id = editing;
      await fetch('/api/commitments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      setCommitments(prev =>
        prev.map(c =>
          c.id === editing
            ? { ...c, title: form.title, days_of_week: JSON.stringify(form.days) }
            : c
        )
      );
    } else {
      const res = await fetch('/api/commitments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setCommitments(prev => [
        ...prev,
        {
          id: data.id,
          title: form.title,
          type: form.type,
          days_of_week: JSON.stringify(form.days),
          active: 1,
        },
      ]);
    }
    resetForm();
    router.refresh();
  };

  const handleDeactivate = async (id: number) => {
    const body: Record<string, unknown> = { id, active: false };
    if (userId) body.userId = userId;
    await fetch('/api/commitments', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    setCommitments(prev => prev.map(c => (c.id === id ? { ...c, active: 0 } : c)));
    router.refresh();
  };

  const startEdit = (c: Commitment) => {
    setEditing(c.id);
    setAdding(true);
    setForm({
      title: c.title,
      type: c.type,
      days: JSON.parse(c.days_of_week),
    });
  };

  // Static day pill — shows which days a commitment runs on.
  const DayPill = ({ on, children }: { on: boolean; children: React.ReactNode }) => (
    <span
      className={`w-6 h-6 inline-flex items-center justify-center rounded-full font-mono text-[10px] uppercase tracking-[0.05em] ${
        on
          ? 'border border-[var(--color-accent)] text-[var(--color-accent)] bg-[var(--color-accent-light)]'
          : 'border border-border text-text-muted'
      }`}
    >
      {children}
    </span>
  );

  // Interactive day toggle — for the add/edit form.
  const DayToggle = ({ on, children, ...rest }: { on: boolean; children: React.ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button
      {...rest}
      type="button"
      className={`w-9 h-9 inline-flex items-center justify-center rounded-full font-mono text-[11px] uppercase tracking-[0.05em] transition-colors ${
        on
          ? 'bg-[var(--color-accent)] text-bg border border-[var(--color-accent)]'
          : 'border border-border text-text-muted hover:text-text hover:border-text-muted'
      }`}
    >
      {children}
    </button>
  );

  const renderList = (items: Commitment[], eyebrow: string) => (
    <div className="mb-8">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-muted mb-2">
        {eyebrow}
      </p>
      {items.length === 0 ? (
        <p className="text-[13px] text-text-muted italic reflection-text py-3 border-t border-border">
          None yet
        </p>
      ) : (
        <div>
          {items.map(c => {
            const days: string[] = JSON.parse(c.days_of_week);
            return (
              <div
                key={c.id}
                className="flex items-start justify-between gap-3 py-4 border-t border-border"
              >
                <div className="min-w-0">
                  <p className="text-[15px] text-text">{c.title}</p>
                  <div className="flex gap-1 mt-2">
                    {DAYS.map(d => (
                      <DayPill key={d.key} on={days.includes(d.key)}>{d.label}</DayPill>
                    ))}
                  </div>
                </div>
                <div className="flex gap-4 shrink-0 pt-[3px]">
                  <button
                    onClick={() => startEdit(c)}
                    className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-muted hover:text-text"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeactivate(c.id)}
                    className="font-mono text-[10px] uppercase tracking-[0.18em] text-destructive/60 hover:text-destructive"
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div>
      {renderList(activeCommitments, 'Commitments')}
      {renderList(activePractices, 'Practices')}

      {adding ? (
        <div className="border-t border-border pt-5 mt-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-muted mb-4">
            {editing ? 'Edit win' : 'Add a win'}
          </p>
          <div className="space-y-5">
            <div>
              <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-muted block mb-2">
                What are you committed to?
              </label>
              <input
                value={form.title}
                onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Morning meditation (10 min)"
                className="w-full bg-transparent border-0 border-b border-border focus:border-[var(--color-accent)] py-1 text-[15px] text-text outline-none transition-colors"
              />
            </div>

            <div>
              <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-muted block mb-2">
                Type
              </label>
              <div className="flex gap-2">
                {(['commitment', 'practice'] as const).map(t => {
                  const on = form.type === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, type: t }))}
                      className={`px-4 py-1.5 rounded-full font-mono text-[11px] uppercase tracking-[0.14em] transition-colors border ${
                        on
                          ? 'border-[var(--color-accent)] text-[var(--color-accent)] bg-[var(--color-accent-light)]'
                          : 'border-border text-text-muted hover:text-text hover:border-text-muted'
                      }`}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-muted block mb-2">
                Days
              </label>
              <div className="flex gap-2">
                {DAYS.map(d => (
                  <DayToggle
                    key={d.key}
                    on={form.days.includes(d.key)}
                    onClick={() => toggleDay(d.key)}
                  >
                    {d.label}
                  </DayToggle>
                ))}
              </div>
            </div>

            <div className="flex gap-5 pt-1">
              <button
                onClick={resetForm}
                className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-muted hover:text-text"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!form.title.trim() || form.days.length === 0}
                className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-accent)] disabled:opacity-40"
              >
                {editing ? 'Update' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="w-full mt-2 py-3 border-t border-border font-mono text-[11px] uppercase tracking-[0.22em] text-text-muted hover:text-[var(--color-accent)] text-left transition-colors"
        >
          + Add a win
        </button>
      )}
    </div>
  );
}
