'use client';

import React, { useState } from 'react';

export default function OnboardingPage() {
  const [workspaceName, setWorkspaceName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/customer/workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: workspaceName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create workspace.');
        return;
      }
      window.location.href = '/';
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-void)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '480px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
        {/* Icon + Header */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: 'var(--radius-lg)', background: 'var(--gradient-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 0 28px rgba(99, 102, 241, 0.5)' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#fff' }}>
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: 'var(--radius-full)', background: 'var(--bg-tertiary)', border: '1px solid var(--border-medium)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--accent-cyan)', marginBottom: '16px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-cyan)' }} />
            Setup
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', marginBottom: '10px', lineHeight: 1.2 }}>
            Welcome!{' '}
            <span style={{ background: 'var(--gradient-brand)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Let&apos;s set up your workspace
            </span>
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Give your workspace a name to get started. You can change this anytime.
          </p>
        </div>

        <div className="card card-glow" style={{ padding: '36px' }}>
          {error && (
            <div style={{ padding: '12px 16px', background: 'var(--status-error-bg)', border: '1px solid rgba(244, 63, 94, 0.3)', borderRadius: 'var(--radius-md)', color: 'var(--status-error)', fontSize: '13px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#cbd5e1', display: 'block' }}>Workspace Name</label>
              <input
                type="text"
                className="form-input"
                style={{ width: '100%', padding: '12px 16px', background: '#141824', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '6px', color: '#fff', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }}
                placeholder="e.g. My Video Studio"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                required
                autoFocus
              />
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                This will be the name of your AUTORA workspace.
              </span>
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
              {loading ? 'Setting up...' : 'Launch My Workspace'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
