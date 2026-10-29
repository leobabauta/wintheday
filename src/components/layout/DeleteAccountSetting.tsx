'use client';

import { useState } from 'react';

export default function DeleteAccountSetting() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    setError('');
    setDeleting(true);
    const res = await fetch('/api/auth/account', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Could not delete account');
      setDeleting(false);
      return;
    }

    // Full navigation so no cached authenticated page survives.
    window.location.href = '/login';
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-muted hover:text-destructive transition-colors"
      >
        Delete account
      </button>
    );
  }

  return (
    <div className="space-y-4 max-w-md">
      <p className="text-[15px] leading-relaxed text-text">
        This permanently deletes your account and everything in it: your wins, reflections,
        messages, photos and session history. Your coach will be told. This can&apos;t be undone.
      </p>
      <div>
        <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-muted block mb-1">
          Enter your password to confirm
        </label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full bg-transparent border-0 border-b border-border focus:border-destructive py-1 text-[16px] text-text outline-none transition-colors"
        />
      </div>
      {error && <p className="text-[12px] text-destructive">{error}</p>}
      <div className="flex gap-4 pt-1">
        <button
          onClick={() => { setOpen(false); setPassword(''); setError(''); }}
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-muted hover:text-text"
        >
          Cancel
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting || !password}
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-destructive disabled:opacity-40"
        >
          {deleting ? 'Deleting…' : 'Delete forever'}
        </button>
      </div>
    </div>
  );
}
