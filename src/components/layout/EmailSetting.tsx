'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import SettingRow from './SettingRow';

export default function EmailSetting({ initialEmail }: { initialEmail: string }) {
  const [email, setEmail] = useState(initialEmail);
  const [saved, setSaved] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  const save = async () => {
    if (!email.trim() || email === initialEmail) return;
    if (!email.includes('@')) {
      setError('Please enter a valid email');
      return;
    }
    setError('');
    setSaved(false);
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim() }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || 'Failed to update email');
      setSaved(true);
      return;
    }
    setSaved(true);
    router.refresh();
  };

  return (
    <SettingRow
      eyebrow="Email"
      right={!saved && <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-accent)]">Saving…</span>}
    >
      <input
        type="email"
        value={email}
        onChange={e => { setEmail(e.target.value); setError(''); }}
        onBlur={save}
        placeholder="your@email.com"
        className="w-full bg-transparent border-0 border-b border-transparent focus:border-[var(--color-accent)] py-1 text-[15px] text-text outline-none transition-colors"
      />
      {error && <p className="text-xs text-destructive mt-2">{error}</p>}
    </SettingRow>
  );
}
