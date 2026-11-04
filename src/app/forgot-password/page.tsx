'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AuthShell, authInputClass, authButtonClass } from '@/components/auth/AuthShell';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch('/api/customer/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
    } catch {
      // Always show the generic message
    } finally {
      setLoading(false);
      setSubmitted(true);
    }
  };

  return (
    <AuthShell
      title="Forgot your password?"
      subtitle={submitted ? 'Check your inbox' : "Enter your email and we'll send a reset link"}
      footer={<Link href="/login" className="font-bold text-purple-700 hover:underline">Back to sign in</Link>}
    >
      {submitted ? (
        <p className="text-sm text-slate-600 leading-relaxed text-center">
          If an account exists for <strong>{email}</strong>, a password reset link is on its way. The link expires after a short time.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-semibold mb-1.5">Email</label>
            <input id="email" type="email" required autoComplete="email" className={authInputClass} placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <button type="submit" disabled={loading} className={authButtonClass}>{loading ? 'Sending…' : 'Send reset link'}</button>
        </form>
      )}
    </AuthShell>
  );
}
