'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';

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
    <Card>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-bold text-text-muted uppercase tracking-wider">Your Email</h2>
        {!saved && <span className="text-[10px] text-accent">Saving...</span>}
      </div>
      <Input
        type="email"
        value={email}
        onChange={e => { setEmail(e.target.value); setError(''); }}
        onBlur={save}
        placeholder="your@email.com"
      />
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </Card>
  );
}
