'use client';

import { useState } from 'react';
import SettingRow from './SettingRow';

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

  const inputCls =
    'w-full bg-transparent border-0 border-b border-border focus:border-[var(--color-accent)] py-1 text-[15px] text-text outline-none transition-colors';

  if (!open) {
    return (
      <SettingRow
        eyebrow="Password"
        right={
          <button
            onClick={() => setOpen(true)}
            className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-muted hover:text-text"
          >
            Change
          </button>
        }
      >
        <p className="text-[15px] text-text-muted">••••••••</p>
      </SettingRow>
    );
  }

  return (
    <SettingRow eyebrow="Change password">
      <div className="space-y-4">
        <div>
          <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-muted block mb-1">
            Current
          </label>
          <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-muted block mb-1">
            New
          </label>
          <input
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            placeholder="At least 6 characters"
            className={inputCls}
          />
        </div>
        <div>
          <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-muted block mb-1">
            Confirm
          </label>
          <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} className={inputCls} />
        </div>
        {error && <p className="text-[12px] text-destructive">{error}</p>}
        {success && <p className="text-[12px] text-[var(--color-success)]">Password updated.</p>}
        <div className="flex gap-4 pt-1">
          <button
            onClick={() => { setOpen(false); setError(''); }}
            className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-muted hover:text-text"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-accent)] disabled:opacity-40"
          >
            {saving ? 'Saving…' : 'Update'}
          </button>
        </div>
      </div>
    </SettingRow>
  );
}
