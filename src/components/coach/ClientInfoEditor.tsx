'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

interface ClientInfoData {
  name: string;
  email: string;
  sign_on_date: string;
  closing_date: string | null;
  coaching_day: string;
  coaching_time: string;
  coaching_frequency: string;
}

export default function ClientInfoEditor({ clientId, data }: { clientId: number; data: ClientInfoData }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(data);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const formatDate = (d: string | null) =>
    d ? new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—';

  const handleSave = async () => {
    setSaving(true);
    // Update user name
    if (form.name !== data.name) {
      await fetch(`/api/clients/${clientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name }),
      });
    }
    // Update client info fields
    await fetch(`/api/clients/${clientId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sign_on_date: form.sign_on_date || null,
        closing_date: form.closing_date || null,
        coaching_day: form.coaching_day || null,
        coaching_time: form.coaching_time || null,
        coaching_frequency: form.coaching_frequency || null,
      }),
    });
    setSaving(false);
    setEditing(false);
    router.refresh();
  };

  if (!editing) {
    return (
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-semibold text-navy/50 uppercase tracking-wider">Client Info</h2>
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>Edit</Button>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-navy/60">Sign-on Date</span>
            <span className="font-medium text-navy">{formatDate(data.sign_on_date)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-navy/60">Closing Date</span>
            <span className="font-medium text-navy">{formatDate(data.closing_date)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-navy/60">Coaching Spot</span>
            <span className="font-medium text-navy">
              {data.coaching_frequency}, {data.coaching_day} at {data.coaching_time}
            </span>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <h2 className="text-xs font-semibold text-navy/50 uppercase tracking-wider mb-4">Edit Client Info</h2>
      <div className="space-y-3">
        <Input label="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        <Input label="Sign-on Date" type="date" value={form.sign_on_date || ''} onChange={e => setForm({ ...form, sign_on_date: e.target.value })} />
        <Input label="Closing Date" type="date" value={form.closing_date || ''} onChange={e => setForm({ ...form, closing_date: e.target.value })} />
        <Input label="Coaching Day" value={form.coaching_day || ''} onChange={e => setForm({ ...form, coaching_day: e.target.value })} placeholder="e.g., Wednesday" />
        <Input label="Coaching Time" value={form.coaching_time || ''} onChange={e => setForm({ ...form, coaching_time: e.target.value })} placeholder="e.g., 4:00 PM" />
        <Input label="Coaching Frequency" value={form.coaching_frequency || ''} onChange={e => setForm({ ...form, coaching_frequency: e.target.value })} placeholder="e.g., Every 2 weeks" />
        <div className="flex gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={() => { setForm(data); setEditing(false); }}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
        </div>
      </div>
    </Card>
  );
}
