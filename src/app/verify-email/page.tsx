'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'no-token'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('no-token');
      return;
    }

    const verify = async () => {
      try {
        let res = await fetch('/api/customer/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        if (!res.ok) {
          res = await fetch('/api/auth/verify-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
          });
        }
        const data = await res.json();
        if (res.ok) {
          setStatus('success');
        } else {
          setErrorMsg(data.error || 'Verification failed.');
          setStatus('error');
        }
      } catch {
        setErrorMsg('Network error. Please try again.');
        setStatus('error');
      }
    };

    verify();
  }, [token]);

  const containerStyle: React.CSSProperties = {
    minHeight: '100vh',
    background: 'var(--bg-void)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
  };

  if (status === 'loading') {
    return (
      <div style={containerStyle}>
        <div style={{ textAlign: 'center' }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2" style={{ animation: 'spin 1s linear infinite', marginBottom: '16px' }}>
            <line x1="12" y1="2" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="22" />
            <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" /><line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
            <line x1="2" y1="12" x2="6" y2="12" /><line x1="18" y1="12" x2="22" y2="12" />
            <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" /><line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
          </svg>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#fff', marginBottom: '8px' }}>Verifying your email...</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Please wait while we confirm your account.</p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div style={containerStyle}>
        <div style={{ textAlign: 'center', maxWidth: '420px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(16,185,129,0.15)', border: '1px solid var(--status-ready)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: 'var(--status-ready)', fontSize: '24px' }}>
            ✓
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#fff', marginBottom: '10px' }}>Email Verified!</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '14px' }}>Your account is active and verified. You have full access to AUTORA Studio.</p>
          <Link href="/" className="btn btn-primary" style={{ width: '100%' }}>Launch Studio ➔</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={{ textAlign: 'center', maxWidth: '420px' }}>
        <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(239,68,68,0.15)', border: '1px solid #ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: '#ef4444', fontSize: '24px' }}>
          ✕
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#fff', marginBottom: '10px' }}>Verification Failed</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '14px' }}>{errorMsg || 'The verification link is invalid or expired.'}</p>
        <Link href="/login" className="btn btn-secondary">Return to Sign In</Link>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Verifying...</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
