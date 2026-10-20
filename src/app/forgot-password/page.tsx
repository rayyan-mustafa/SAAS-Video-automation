'use client';

import React, { useState } from 'react';
import Link from 'next/link';

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
    <div style={{ minHeight: '100vh', background: 'var(--bg-void)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '420px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-lg)', background: 'var(--gradient-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 0 24px rgba(99, 102, 241, 0.4)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', marginBottom: '6px' }}>
            Forgot password?
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            {submitted ? "Check your inbox" : "Enter your email and we'll send a reset link"}
          </p>
        </div>

        <div className="card card-glow" style={{ padding: '32px' }}>
          {submitted ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--status-live-bg)', border: '1px solid rgba(16, 185, 129, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--status-live)" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                If an account exists for <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>, a password reset link has been sent.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#cbd5e1', display: 'block' }}>Email Address</label>
                <input
                  type="email"
                  className="form-input"
                  style={{ width: '100%', padding: '11px 14px', background: '#141824', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '6px', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary btn-lg"
                style={{
                  width: '100%',
                  marginTop: '8px',
                  padding: '12px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#fff',
                  background: '#4f46e5',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          )}
        </div>

        <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
          Remember your password?{' '}
          <Link href="/login" style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
