'use client';

import { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import TrophyIcon from '@/components/ui/TrophyIcon';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }

      window.location.href = data.role === 'coach' ? '/dashboard' : '/today';
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh flex justify-center bg-lavender">
      <div
        className="w-full max-w-[520px] min-h-dvh bg-card shadow-2xl rounded-none sm:rounded-3xl sm:my-4 sm:min-h-0 flex items-center justify-center px-6"
        style={{ boxShadow: '0 0 60px 8px rgba(240, 165, 0, 0.15), 0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}
      >
        <Card className="w-full max-w-sm bg-lavender-light/40">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-3"><TrophyIcon size={48} /></div>
            <h1 className="text-2xl font-bold text-navy tracking-tight">Win the Day</h1>
            <p className="text-sm text-navy/50 mt-1">Sign in to your account</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />

            {error && (
              <p className="text-sm text-danger text-center">{error}</p>
            )}

            <Button type="submit" disabled={loading} className="w-full mt-2">
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
