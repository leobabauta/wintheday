'use client';

import { useState } from 'react';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

export default function PasswordSetting() {
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSave = async () => {
    setError('');
    if (newPassword.length < 6) { setError('New password must be at least 6 characters'); return; }
    if (newPassword !== confirm) { setError('Passwords do not match'); return; }

    setSaving(true);
    const res = await fetch('/api/auth/password', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || 'Failed to update password');
      setSaving(false);
      return;
    }

    setSaving(false);
    setSuccess(true);
    setCurrentPassword('');
    setNewPassword('');
    setConfirm('');
    setTimeout(() => { setSuccess(false); setOpen(false); }, 2000);
  };

  if (!open) {
    return (
      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-navy/50 uppercase tracking-wider">Password</h2>
          <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>Change</Button>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <h2 className="text-xs font-bold text-navy/50 uppercase tracking-wider mb-3">Change Password</h2>
      <div className="space-y-3">
        <Input label="Current Password" type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
        <Input label="New Password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="At least 6 characters" />
        <Input label="Confirm New Password" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} />
        {error && <p className="text-xs text-danger">{error}</p>}
        {success && <p className="text-xs text-success">Password updated!</p>}
        <div className="flex gap-2 pt-1">
          <Button variant="ghost" size="sm" onClick={() => { setOpen(false); setError(''); }}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Update Password'}</Button>
        </div>
      </div>
    </Card>
  );
}
