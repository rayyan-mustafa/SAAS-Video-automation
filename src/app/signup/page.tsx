'use client';

export const dynamic = 'force-dynamic';

import React, { useState } from 'react';
import Link from 'next/link';
import { AuthShell, AuthError, authInputClass, authButtonClass } from '@/components/auth/AuthShell';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) return setError('Passwords do not match.');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (!accepted) return setError('Please accept the Terms of Service and Privacy Policy to continue.');
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/customer/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, acceptTerms: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Failed to create account. Please try again.');
        return;
      }
      window.location.href = '/onboarding';
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Start with a free trial video. No credit card required."
      footer={<>Already have an account? <Link href="/login" className="font-bold text-purple-700 hover:underline">Sign in</Link></>}
    >
      {error && <AuthError>{error}</AuthError>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-semibold mb-1.5">Full name</label>
          <input id="name" type="text" required autoComplete="name" className={authInputClass} placeholder="Jane Smith" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-semibold mb-1.5">Email</label>
          <input id="email" type="email" required autoComplete="email" className={authInputClass} placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-semibold mb-1.5">Password</label>
          <div className="relative">
            <input id="password" type={showPw ? 'text' : 'password'} required minLength={8} autoComplete="new-password" className={authInputClass + ' pr-16'} placeholder="At least 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500 hover:text-slate-800">{showPw ? 'Hide' : 'Show'}</button>
          </div>
        </div>
        <div>
          <label htmlFor="confirm" className="block text-sm font-semibold mb-1.5">Confirm password</label>
          <input id="confirm" type={showPw ? 'text' : 'password'} required autoComplete="new-password" className={authInputClass} placeholder="Re-enter password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
        </div>
        <label className="flex items-start gap-3 text-sm text-slate-600 cursor-pointer">
          <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-purple-600" />
          <span>I agree to the <Link href="/terms" target="_blank" className="font-semibold text-purple-700 hover:underline">Terms of Service</Link> and <Link href="/privacy" target="_blank" className="font-semibold text-purple-700 hover:underline">Privacy Policy</Link>.</span>
        </label>
        <button type="submit" disabled={loading} className={authButtonClass}>{loading ? 'Creating account…' : 'Create account'}</button>
      </form>
    </AuthShell>
  );
}
