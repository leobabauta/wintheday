'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Suspense } from 'react';

function ResetForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // No token = request reset email
  if (!token) {
    const handleRequest = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setLoading(true);
      await fetch('/api/auth/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setLoading(false);
      setSuccess('If that email exists, we sent a reset link. Check your inbox.');
    };

    return (
      <>
        <div className="text-center mb-8">
          <div className="text-accent text-3xl mb-3" aria-hidden>✦</div>
          <h1 className="font-display text-[28px] leading-[1.15]">Reset Password</h1>
          <p className="text-sm text-text-muted mt-1">Enter your email and we'll send you a reset link</p>
        </div>

        {success ? (
          <div className="text-center">
            <p className="text-sm text-success mb-4">{success}</p>
            <a href="/login" className="text-sm text-text-secondary hover:text-text">Back to login</a>
          </div>
        ) : (
          <form onSubmit={handleRequest} className="flex flex-col gap-4">
            <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
            {error && <p className="text-sm text-destructive text-center">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full mt-2">
              {loading ? 'Sending...' : 'Send Reset Link'}
            </Button>
            <a href="/login" className="text-sm text-text-muted hover:text-text text-center">Back to login</a>
          </form>
        )}
      </>
    );
  }

  // Has token = set new password
  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (newPassword !== confirm) { setError('Passwords do not match'); return; }

    setLoading(true);
    const res = await fetch('/api/auth/reset', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || 'Failed to reset password');
      setLoading(false);
      return;
    }

    setLoading(false);
    setSuccess('Password updated! Redirecting to login...');
    setTimeout(() => { window.location.href = '/login'; }, 2000);
  };

  return (
    <>
      <div className="text-center mb-8">
        <div className="text-accent text-3xl mb-3" aria-hidden>✦</div>
        <h1 className="font-display text-[28px] leading-[1.15]">Set New Password</h1>
      </div>

      {success ? (
        <p className="text-sm text-success text-center">{success}</p>
      ) : (
        <form onSubmit={handleReset} className="flex flex-col gap-4">
          <Input label="New Password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="At least 6 characters" required />
          <Input label="Confirm Password" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required />
          {error && <p className="text-sm text-destructive text-center">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full mt-2">
            {loading ? 'Resetting...' : 'Reset Password'}
          </Button>
        </form>
      )}
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-dvh flex justify-center bg-bg">
      <div className="w-full max-w-[520px] min-h-dvh bg-bg rounded-none sm:rounded-[28px] sm:my-6 sm:min-h-0 sm:border sm:border-border flex items-center justify-center px-6">
        <Card className="w-full max-w-sm bg-surface">
          <Suspense fallback={<div className="text-center text-text-muted">Loading...</div>}>
            <ResetForm />
          </Suspense>
        </Card>
      </div>
    </div>
  );
}
