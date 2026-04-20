'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import SettingRow from './SettingRow';

export default function NameSetting({ initialName }: { initialName: string }) {
  const [name, setName] = useState(initialName);
  const [saved, setSaved] = useState(true);
  const router = useRouter();

  const save = async () => {
    if (!name.trim() || name === initialName) return;
    setSaved(false);
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim() }),
    });
    setSaved(true);
    router.refresh();
  };

  return (
    <SettingRow
      eyebrow="Name"
      right={!saved && <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-accent)]">Saving…</span>}
    >
      <input
        value={name}
        onChange={e => setName(e.target.value)}
        onBlur={save}
        placeholder="Your name"
        className="w-full bg-transparent border-0 border-b border-transparent focus:border-[var(--color-accent)] py-1 text-[15px] text-text outline-none transition-colors"
      />
    </SettingRow>
  );
}
