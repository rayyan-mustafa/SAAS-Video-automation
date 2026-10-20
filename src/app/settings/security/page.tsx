'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';

interface Session {
  id: string;
  ip: string;
  user_agent: string;
  created_at: string;
}

export default function SecuritySettingsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [logoutAllLoading, setLogoutAllLoading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);

  useEffect(() => {
    const loadSessions = async () => {
      try {
        const res = await fetch('/api/customer/sessions');
        if (res.ok) {
          const data = await res.json();
          setSessions(data.sessions || []);
        }
      } catch {
        // ignore
      } finally {
        setSessionsLoading(false);
      }
    };
    loadSessions();
  }, []);

  const handleLogoutAll = async () => {
    setLogoutAllLoading(true);
    try {
      await fetch('/api/customer/logout-all', { method: 'POST' });
      window.location.href = '/login';
    } catch {
      setLogoutAllLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    setPwSuccess(false);

    if (newPassword !== confirmNewPassword) {
      setPwError('New passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setPwError('New password must be at least 8 characters.');
      return;
    }

    setPwLoading(true);
    try {
      const res = await fetch('/api/customer/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPwError(data.error || 'Failed to change password.');
        return;
      }
      setPwSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setTimeout(() => setPwSuccess(false), 4000);
    } catch {
      setPwError('Network error. Please try again.');
    } finally {
      setPwLoading(false);
    }
  };

  const formatDate = (dt: string) => {
    try { return new Date(dt).toLocaleString(); } catch { return dt; }
  };

  const truncateUA = (ua: string) => ua.length > 80 ? ua.slice(0, 77) + '...' : ua;

  return (
    <div className="content-container" style={{ maxWidth: '640px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>Security</h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Manage your sessions and password</p>
      </div>

      {/* Active Sessions */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div>
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>Active Sessions</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Devices currently signed in to your account</p>
          </div>
          <button
            onClick={handleLogoutAll}
            disabled={logoutAllLoading}
            className="btn btn-danger btn-sm"
          >
            {logoutAllLoading ? 'Logging out...' : 'Logout All Devices'}
          </button>
        </div>

        {sessionsLoading ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Loading sessions...</p>
        ) : sessions.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No active sessions found.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {sessions.map((s) => (
              <div
                key={s.id}
                style={{ padding: '12px 14px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                    <line x1="8" y1="21" x2="16" y2="21" />
                    <line x1="12" y1="17" x2="12" y2="21" />
                  </svg>
                  <span style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 600 }}>{s.ip || 'Unknown IP'}</span>
                  <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>•</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formatDate(s.created_at)}</span>
                </div>
                <p style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>{truncateUA(s.user_agent || 'Unknown device')}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Change Password */}
      <div className="card">
        <div style={{ marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--border-subtle)' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>Change Password</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Use a strong, unique password for your account</p>
        </div>

        {pwError && (
          <div style={{ padding: '12px 16px', background: 'var(--status-error-bg)', border: '1px solid rgba(244, 63, 94, 0.3)', borderRadius: 'var(--radius-md)', color: 'var(--status-error)', fontSize: '13px', marginBottom: '20px', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            {pwError}
          </div>
        )}
        {pwSuccess && (
          <div style={{ padding: '12px 16px', background: 'var(--status-live-bg)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 'var(--radius-md)', color: 'var(--status-live)', fontSize: '13px', marginBottom: '20px', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
            Password changed successfully.
          </div>
        )}

        <form onSubmit={handleChangePassword}>
          <div className="form-group">
            <label className="form-label">Current Password</label>
            <input type="password" className="form-input" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required autoComplete="current-password" />
          </div>
          <div className="form-group">
            <label className="form-label">New Password</label>
            <input type="password" className="form-input" placeholder="Min. 8 characters" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required autoComplete="new-password" />
          </div>
          <div className="form-group" style={{ marginBottom: '4px' }}>
            <label className="form-label">Confirm New Password</label>
            <input type="password" className="form-input" placeholder="Re-enter new password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} required autoComplete="new-password" />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
            <button type="submit" disabled={pwLoading} className="btn btn-primary">
              {pwLoading ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
