'use client';

import { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

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
    <div className="min-h-dvh flex justify-center bg-bg">
      <div className="w-full max-w-[520px] min-h-dvh bg-bg rounded-none sm:rounded-[28px] sm:my-6 sm:min-h-0 sm:border sm:border-border flex items-center justify-center px-6">
        <Card className="w-full max-w-sm bg-surface">
          <div className="text-center mb-8">
            <div className="text-accent text-3xl mb-3" aria-hidden>✦</div>
            <h1 className="font-display text-[28px] leading-[1.15]">Win the Day</h1>
            <p className="text-sm text-text-muted mt-1">Sign in to your account</p>
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
              <p className="text-sm text-destructive text-center">{error}</p>
            )}

            <Button type="submit" disabled={loading} className="w-full mt-2">
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
            <a href="/reset-password" className="text-sm text-text-muted hover:text-text text-center block mt-2">
              Forgot password?
            </a>
          </form>
        </Card>
      </div>
    </div>
  );
}
