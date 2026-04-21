'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import MutedMono from '@/components/ui/MutedMono';
import Avatar from '@/components/ui/Avatar';

interface ClientInfoData {
  name: string;
  email: string;
  avatar_url: string | null;
  sign_on_date: string;
  closing_date: string | null;
  coaching_day: string;
  coaching_time: string;
  coaching_frequency: string;
  payment_amount: number | null;
  payment_frequency: string | null;
  renewal_day: number | null;
  rating_label: string;
}

// Resize to a 200×200 JPEG data URL so avatars stay small enough to live
// inline in the users table without introducing a storage backend.
async function fileToResizedDataUrl(file: File, size = 200): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  // Center-crop to square
  const srcSize = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - srcSize) / 2;
  const sy = (bitmap.height - srcSize) / 2;
  ctx.drawImage(bitmap, sx, sy, srcSize, srcSize, 0, 0, size, size);
  return canvas.toDataURL('image/jpeg', 0.85);
}

export default function ClientInfoEditor({ clientId, data }: { clientId: number; data: ClientInfoData }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(data);
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const formatDate = (d: string | null) =>
    d ? new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—';

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToResizedDataUrl(file);
      setForm({ ...form, avatar_url: dataUrl });
    } catch (err) {
      console.error('Failed to read image:', err);
      alert('Could not read that image. Try a different file.');
    }
    e.target.value = '';
  };

  const handleSave = async () => {
    setSaving(true);
    if (form.name !== data.name || form.email !== data.email || form.avatar_url !== data.avatar_url) {
      await fetch(`/api/clients/${clientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, email: form.email, avatar_url: form.avatar_url }),
      });
    }
    await fetch(`/api/clients/${clientId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sign_on_date: form.sign_on_date || null,
        closing_date: form.closing_date || null,
        coaching_day: form.coaching_day || null,
        coaching_time: form.coaching_time || null,
        coaching_frequency: form.coaching_frequency || null,
        payment_amount: form.payment_amount || null,
        payment_frequency: form.payment_frequency || null,
        renewal_day: form.renewal_day || null,
        rating_label: form.rating_label || 'inner peace',
        ...(newPassword.length >= 6 ? { password: newPassword } : {}),
      }),
    });
    setSaving(false);
    setEditing(false);
    setNewPassword('');
    router.refresh();
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${data.name}? This will permanently remove all their data including wins, journal entries, commitments, and messages. This cannot be undone.`)) return;
    setDeleting(true);
    await fetch(`/api/clients/${clientId}`, { method: 'DELETE' });
    router.push('/dashboard');
  };

  if (!editing) {
    return (
      <Card>
        <div className="flex items-center justify-between mb-4">
          <MutedMono>Client Info</MutedMono>
          <Button variant="text" size="sm" onClick={() => setEditing(true)}>Edit</Button>
        </div>
        <div className="flex items-center gap-3 mb-4">
          <Avatar name={data.name} avatarUrl={data.avatar_url} size={52} textSize={16} />
          <div>
            <div className="text-[15px] text-text">{data.name}</div>
            <div className="text-[12px] text-text-muted">{data.email}</div>
          </div>
        </div>
        <div className="space-y-2 text-[13px]">
          <div className="flex justify-between">
            <span className="text-text-secondary">Sign-on Date</span>
            <span className="text-text">{formatDate(data.sign_on_date)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Closing Date</span>
            <span className="text-text">{formatDate(data.closing_date)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Coaching Spot</span>
            <span className="text-text">
              {data.coaching_frequency}, {data.coaching_day} at {data.coaching_time}
            </span>
          </div>
          {data.payment_amount && (
            <div className="flex justify-between">
              <span className="text-text-secondary">Payment</span>
              <span className="text-text">
                ${Number(data.payment_amount).toFixed(2)}/{data.payment_frequency === 'yearly' ? 'year' : 'month'}
                {data.payment_frequency === 'monthly' && data.renewal_day && ` (renews on the ${data.renewal_day}${data.renewal_day === 1 ? 'st' : data.renewal_day === 2 ? 'nd' : data.renewal_day === 3 ? 'rd' : 'th'})`}
              </span>
            </div>
          )}
        </div>
        <div className="border-t border-border mt-4 pt-4">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-[11px] text-destructive hover:opacity-80 transition-opacity"
          >
            {deleting ? 'Deleting...' : 'Delete this client'}
          </button>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <MutedMono className="block mb-4">Edit Client Info</MutedMono>
      <div className="space-y-3">
        <div className="flex items-center gap-4 pb-3 border-b border-border">
          <Avatar name={form.name} avatarUrl={form.avatar_url} size={56} textSize={18} />
          <div className="flex flex-col gap-1.5">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                {form.avatar_url ? 'Change photo' : 'Upload photo'}
              </Button>
              {form.avatar_url && (
                <Button variant="text" size="sm" onClick={() => setForm({ ...form, avatar_url: null })}>
                  Remove
                </Button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <p className="text-[11px] text-text-muted">Stored at 200×200 JPEG.</p>
          </div>
        </div>
        <Input label="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        <Input label="Email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
        <Input label="Sign-on Date" type="date" value={form.sign_on_date || ''} onChange={e => setForm({ ...form, sign_on_date: e.target.value })} />
        <Input label="Closing Date" type="date" value={form.closing_date || ''} onChange={e => setForm({ ...form, closing_date: e.target.value })} />
        <Input label="Coaching Day" value={form.coaching_day || ''} onChange={e => setForm({ ...form, coaching_day: e.target.value })} placeholder="e.g., Wednesday" />
        <Input label="Coaching Time" value={form.coaching_time || ''} onChange={e => setForm({ ...form, coaching_time: e.target.value })} placeholder="e.g., 4:00 PM" />
        <Input label="Coaching Frequency" value={form.coaching_frequency || ''} onChange={e => setForm({ ...form, coaching_frequency: e.target.value })} placeholder="e.g., Every 2 weeks" />
        <div className="border-t border-border pt-3 mt-1">
          <MutedMono className="block mb-3">Payment</MutedMono>
          <div className="space-y-3">
            <Input label="Amount ($)" type="number" step="0.01" value={form.payment_amount ?? ''} onChange={e => setForm({ ...form, payment_amount: e.target.value ? parseFloat(e.target.value) : null })} placeholder="e.g., 200" />
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] text-text-secondary">Frequency</label>
              <select
                className="rounded-[12px] border border-border bg-bg px-4 py-2.5 text-text outline-none focus:border-accent transition-colors"
                value={form.payment_frequency || ''}
                onChange={e => setForm({ ...form, payment_frequency: e.target.value || null })}
              >
                <option value="">—</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            {form.payment_frequency === 'monthly' && (
              <Input label="Renewal Day of Month" type="number" min="1" max="31" value={form.renewal_day ?? ''} onChange={e => setForm({ ...form, renewal_day: e.target.value ? parseInt(e.target.value) : null })} placeholder="e.g., 15" />
            )}
          </div>
        </div>
        <Input label="Daily Quality Label" value={form.rating_label || ''} onChange={e => setForm({ ...form, rating_label: e.target.value })} placeholder="e.g., inner peace, confidence" />
        <div className="border-t border-border pt-3 mt-1">
          <MutedMono className="block mb-3">Password</MutedMono>
          <Input label="Set New Password" type="text" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Leave blank to keep current" />
          {newPassword && newPassword.length < 6 && (
            <p className="text-[11px] text-destructive mt-1">Must be at least 6 characters</p>
          )}
        </div>
        <div className="flex gap-2 pt-2">
          <Button variant="text" size="sm" onClick={() => { setForm(data); setEditing(false); }}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
        </div>
      </div>
    </Card>
  );
}
