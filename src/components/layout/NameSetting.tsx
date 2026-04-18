'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';

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
    <Card>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-bold text-text-muted uppercase tracking-wider">Your Name</h2>
        {!saved && <span className="text-[10px] text-accent">Saving...</span>}
      </div>
      <Input
        value={name}
        onChange={e => setName(e.target.value)}
        onBlur={save}
        placeholder="Your name"
      />
    </Card>
  );
}
