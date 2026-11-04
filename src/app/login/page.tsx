'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AuthShell, AuthError, authInputClass, authButtonClass } from '@/components/auth/AuthShell';
import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton';

function safeRedirect(): string {
  if (typeof window === 'undefined') return '/dashboard';
  const from = new URLSearchParams(window.location.search).get('from');
  return from && from.startsWith('/') && !from.startsWith('//') && !from.startsWith('/\\') ? from : '/dashboard';
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unverified, setUnverified] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const errParam = new URLSearchParams(window.location.search).get('error');
      if (errParam) {
        setError(errParam);
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setUnverified(false);
    try {
      const res = await fetch('/api/customer/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.unverified) setUnverified(true);
        else setError(data.error || 'Login failed. Please try again.');
        return;
      }
      window.location.href = safeRedirect();
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    try {
      await fetch('/api/customer/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setResendSent(true);
    } catch {
      setError('Could not send the verification email. Please try again.');
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your Tillercast account"
      footer={<>New to Tillercast? <Link href="/signup" className="font-bold text-purple-700 hover:underline">Create a free account</Link></>}
    >
      {error && <AuthError>{error}</AuthError>}
      {unverified && (
        <div role="alert" className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong>Email not verified.</strong> Check your inbox to verify your email.{' '}
          {resendSent ? <span className="font-semibold">Verification email sent.</span> : (
            <button type="button" onClick={resend} className="font-bold underline">Resend verification email</button>
          )}
        </div>
      )}

      {/* 1-Click Google Sign-in */}
      <div className="mb-5">
        <GoogleAuthButton text="Continue with Google" />
      </div>

      <div className="relative my-5 flex items-center justify-center">
        <div className="w-full border-t border-slate-200" />
        <span className="absolute bg-white px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          or continue with email
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-semibold mb-1.5">Email</label>
          <input id="email" type="email" required autoComplete="email" className={authInputClass} placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="password" className="text-sm font-semibold">Password</label>
            <Link href="/forgot-password" className="text-xs font-semibold text-purple-700 hover:underline">Forgot password?</Link>
          </div>
          <div className="relative">
            <input id="password" type={showPw ? 'text' : 'password'} required autoComplete="current-password" className={authInputClass + ' pr-16'} placeholder="Your password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500 hover:text-slate-800">{showPw ? 'Hide' : 'Show'}</button>
          </div>
        </div>
        <button type="submit" disabled={loading} className={authButtonClass}>{loading ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </AuthShell>
  );
}
