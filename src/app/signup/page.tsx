'use client';

export const dynamic = 'force-dynamic';

import React, { useState } from 'react';
import Link from 'next/link';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/customer/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();

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
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', marginBottom: '4px' }}>Create your account</h1>
          <p style={{ fontSize: '13px', color: '#94a3b8' }}>Start automating your video pipeline with AUTORA</p>
        </div>

        <div style={{ padding: '28px', background: '#0f121a', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px' }}>
          {error && (
            <div style={{ padding: '12px 16px', background: 'var(--status-error-bg)', border: '1px solid rgba(244, 63, 94, 0.3)', borderRadius: 'var(--radius-md)', color: 'var(--status-error)', fontSize: '13px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#cbd5e1', display: 'block' }}>Full Name</label>
              <input
                type="text"
                className="form-input"
                style={{ width: '100%', padding: '11px 14px', background: '#141824', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '6px', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                placeholder="Jane Smith"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
              />
            </div>

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
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#cbd5e1', display: 'block' }}>Password</label>
              <input
                type="password"
                className="form-input"
                style={{ width: '100%', padding: '11px 14px', background: '#141824', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '6px', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                placeholder="Min. 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#cbd5e1', display: 'block' }}>Confirm Password</label>
              <input
                type="password"
                className="form-input"
                style={{ width: '100%', padding: '11px 14px', background: '#141824', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '6px', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
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
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
