'use client';

export const dynamic = 'force-dynamic';

import React, { useState } from 'react';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unverified, setUnverified] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);

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
      const data = await res.json();

      if (!res.ok) {
        if (data.unverified) {
          setUnverified(true);
        } else {
          setError(data.error || 'Login failed. Please try again.');
        }
        return;
      }

      window.location.href = '/';
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setResendLoading(true);
    try {
      await fetch('/api/customer/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setResendSent(true);
    } catch {
      // silently fail
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-void)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center' }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none', marginBottom: '16px' }}>
            <div className="logo-icon" style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #7928CA, #00F0FF)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 4px 12px rgba(0, 240, 255, 0.2)',
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                <polygon points="10 8 16 12 10 16 10 8" fill="currentColor"></polygon>
              </svg>
            </div>
            <span className="logo-text" style={{ fontSize: '18px', fontWeight: 700, color: '#fff', letterSpacing: '-0.5px' }}>
              Auto<span className="highlight" style={{ color: '#00F0FF' }}>RA</span>
            </span>
          </Link>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', marginBottom: '4px' }}>
            Welcome back
          </h1>
          <p style={{ fontSize: '13px', color: '#94a3b8' }}>Sign in to your AUTORA account</p>
        </div>

        {/* Card */}
        <div style={{ padding: '28px', background: '#0f121a', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px' }}>
          {error && (
            <div
              style={{
                padding: '12px 16px',
                background: 'var(--status-error-bg)',
                border: '1px solid rgba(244, 63, 94, 0.3)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--status-error)',
                fontSize: '13px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}

          {unverified && (
            <div
              style={{
                padding: '14px 16px',
                background: 'var(--status-warn-bg)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: 'var(--radius-md)',
                fontSize: '13px',
                marginBottom: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--status-warn)' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <strong>Email not verified.</strong>
              </div>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Please check your inbox and verify your email to continue.
              </p>
              {resendSent ? (
                <span style={{ color: 'var(--status-live)', fontSize: '12px', fontWeight: 600 }}>
                  Verification email sent!
                </span>
              ) : (
                <button
                  onClick={handleResendVerification}
                  disabled={resendLoading}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent-primary)',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: 0,
                    textAlign: 'left',
                    opacity: resendLoading ? 0.6 : 1,
                  }}
                >
                  {resendLoading ? 'Sending...' : 'Resend verification email'}
                </button>
              )}
            </div>
          )}

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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#cbd5e1', display: 'block' }}>Password</label>
                <Link
                  href="/forgot-password"
                  style={{ fontSize: '12px', color: 'var(--accent-primary)', fontWeight: 500 }}
                >
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                className="form-input"
                style={{ width: '100%', padding: '11px 14px', background: '#141824', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '6px', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
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
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
          Don&apos;t have an account?{' '}
          <Link href="/signup" style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>
            Create account
          </Link>
        </p>
      </div>
    </div>
  );
}
