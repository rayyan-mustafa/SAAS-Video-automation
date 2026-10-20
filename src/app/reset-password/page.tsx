'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!token) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-void)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#fff', marginBottom: '10px' }}>Invalid reset link</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>This password reset link is missing or invalid.</p>
          <Link href="/forgot-password" className="btn btn-secondary">Request New Link</Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/customer/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Reset failed. The link may be expired.');
        return;
      }
      setSuccess(true);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-void)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(16,185,129,0.15)', border: '1px solid var(--status-ready)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: 'var(--status-ready)' }}>
            ✓
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#fff', marginBottom: '10px' }}>Password Reset Complete</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Your password has been securely updated. You can now sign in.</p>
          <Link href="/login" className="btn btn-primary" style={{ width: '100%' }}>Sign In to AUTORA</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-void)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div className="card" style={{ width: '100%', maxWidth: '420px', padding: '32px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>Set New Password</h1>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '24px' }}>Choose a secure password with at least 8 characters.</p>

        {error && (
          <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-md)', color: '#ef4444', fontSize: '13px', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#cbd5e1', display: 'block' }}>New Password</label>
            <input
              type="password"
              className="form-input"
              style={{ width: '100%', padding: '11px 14px', background: '#141824', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '6px', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min. 8 characters"
              required
              minLength={8}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#cbd5e1', display: 'block' }}>Confirm New Password</label>
            <input
              type="password"
              className="form-input"
              style={{ width: '100%', padding: '11px 14px', background: '#141824', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '6px', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              required
              minLength={8}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={loading}
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
            {loading ? 'Updating Password...' : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
