'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';

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
          c.id === editing ? { ...c, title: form.title, days_of_week: JSON.stringify(form.days) } : c
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
        { id: data.id, title: form.title, type: form.type, days_of_week: JSON.stringify(form.days), active: 1 },
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
    setCommitments(prev => prev.map(c => c.id === id ? { ...c, active: 0 } : c));
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

  const renderList = (items: Commitment[], label: string) => (
    <Card className="mb-4">
      <h2 className="text-xs font-semibold text-navy/50 uppercase tracking-wider mb-4">{label}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-navy/40">None yet</p>
      ) : (
        <div className="space-y-3">
          {items.map(c => {
            const days: string[] = JSON.parse(c.days_of_week);
            return (
              <div key={c.id} className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-navy">{c.title}</p>
                  <div className="flex gap-1 mt-1">
                    {DAYS.map(d => (
                      <Badge
                        key={d.key}
                        variant={days.includes(d.key) ? 'active' : 'default'}
                        className="w-6 h-6 justify-center text-[10px]"
                      >
                        {d.label}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => startEdit(c)}
                    className="text-xs text-navy/50 hover:text-navy px-2 py-1"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeactivate(c.id)}
                    className="text-xs text-danger/50 hover:text-danger px-2 py-1"
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );

  return (
    <div>
      {renderList(activeCommitments, 'Commitments')}
      {renderList(activePractices, 'Practices')}

      {adding ? (
        <Card className="mb-4">
          <h3 className="text-sm font-semibold text-navy mb-4">
            {editing ? 'Edit' : 'Add'} Win
          </h3>
          <div className="space-y-4">
            <Input
              label="What are you committed to?"
              value={form.title}
              onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., Morning meditation (10 min)"
            />
            <div>
              <label className="text-sm font-medium text-navy/70 block mb-1.5">Type</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setForm(prev => ({ ...prev, type: 'commitment' }))}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                    form.type === 'commitment' ? 'bg-navy text-white' : 'bg-lavender-light text-navy/60'
                  }`}
                >
                  Commitment
                </button>
                <button
                  onClick={() => setForm(prev => ({ ...prev, type: 'practice' }))}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                    form.type === 'practice' ? 'bg-navy text-white' : 'bg-lavender-light text-navy/60'
                  }`}
                >
                  Practice
                </button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-navy/70 block mb-1.5">Days</label>
              <div className="flex gap-2">
                {DAYS.map(d => (
                  <button
                    key={d.key}
                    onClick={() => toggleDay(d.key)}
                    className={`w-9 h-9 rounded-xl text-sm font-medium transition-colors ${
                      form.days.includes(d.key) ? 'bg-navy text-white' : 'bg-lavender-light text-navy/60'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} size="sm" disabled={!form.title.trim() || form.days.length === 0}>
                {editing ? 'Update' : 'Add'}
              </Button>
              <Button onClick={resetForm} variant="ghost" size="sm">Cancel</Button>
            </div>
          </div>
        </Card>
      ) : (
        <Button onClick={() => setAdding(true)} className="w-full">
          + Add Win
        </Button>
      )}
    </div>
  );
}
