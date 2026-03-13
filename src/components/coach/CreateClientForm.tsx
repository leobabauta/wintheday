'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

export default function CreateClientForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    signOnDate: new Date().toISOString().split('T')[0],
    closingDate: '',
    coachingDay: 'Wednesday',
    coachingTime: '4:00 PM',
    coachingFrequency: 'Every 2 weeks',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (field: string, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to create client');
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Client Name"
          value={form.name}
          onChange={e => update('name', e.target.value)}
          required
        />
        <Input
          label="Email"
          type="email"
          value={form.email}
          onChange={e => update('email', e.target.value)}
          required
        />
        <Input
          label="Temporary Password"
          type="text"
          value={form.password}
          onChange={e => update('password', e.target.value)}
          placeholder="They can change it later"
          required
        />
        <Input
          label="Sign-on Date"
          type="date"
          value={form.signOnDate}
          onChange={e => update('signOnDate', e.target.value)}
        />
        <Input
          label="Closing Date (optional)"
          type="date"
          value={form.closingDate}
          onChange={e => update('closingDate', e.target.value)}
        />
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-navy/70">Coaching Day</label>
          <select
            value={form.coachingDay}
            onChange={e => update('coachingDay', e.target.value)}
            className="rounded-xl border border-lavender-dark bg-white px-4 py-2.5 text-navy outline-none focus:border-navy focus:ring-1 focus:ring-navy transition-colors"
          >
            {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <Input
          label="Coaching Time"
          value={form.coachingTime}
          onChange={e => update('coachingTime', e.target.value)}
          placeholder="e.g., 4:00 PM"
        />
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-navy/70">Frequency</label>
          <select
            value={form.coachingFrequency}
            onChange={e => update('coachingFrequency', e.target.value)}
            className="rounded-xl border border-lavender-dark bg-white px-4 py-2.5 text-navy outline-none focus:border-navy focus:ring-1 focus:ring-navy transition-colors"
          >
            <option value="Weekly">Weekly</option>
            <option value="Every 2 weeks">Every 2 weeks</option>
            <option value="Monthly">Monthly</option>
          </select>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Creating...' : 'Create Client'}
        </Button>
      </form>
    </Card>
  );
}
