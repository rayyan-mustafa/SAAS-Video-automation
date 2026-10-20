'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';

export default function AccountSettingsPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await fetch('/api/customer/me');
        if (res.ok) {
          const data = await res.json();
          setName(data.name || '');
          setEmail(data.email || '');
          setEmailVerified(data.email_verified || false);
          setAvatarUrl(data.avatar_url || '');
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const res = await fetch('/api/customer/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, avatar_url: avatarUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveError(data.error || 'Failed to save changes.');
        return;
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      setSaveError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const res = await fetch('/api/customer/me', { method: 'DELETE' });
      if (res.ok) {
        window.location.href = '/login';
      }
    } catch {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="content-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="content-container" style={{ maxWidth: '640px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>Account Settings</h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Manage your profile information</p>
      </div>

      {/* Profile Form */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid var(--border-subtle)' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>Profile Information</h2>
        </div>

        {saveError && (
          <div style={{ padding: '12px 16px', background: 'var(--status-error-bg)', border: '1px solid rgba(244, 63, 94, 0.3)', borderRadius: 'var(--radius-md)', color: 'var(--status-error)', fontSize: '13px', marginBottom: '20px', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            {saveError}
          </div>
        )}
        {saveSuccess && (
          <div style={{ padding: '12px 16px', background: 'var(--status-live-bg)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 'var(--radius-md)', color: 'var(--status-live)', fontSize: '13px', marginBottom: '20px', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
            Changes saved successfully.
          </div>
        )}

        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">Name</label>
            <input type="text" className="form-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Email address</span>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)',
                  background: emailVerified ? 'var(--status-live-bg)' : 'var(--status-error-bg)',
                  color: emailVerified ? 'var(--status-live)' : 'var(--status-error)',
                  border: `1px solid ${emailVerified ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                {emailVerified ? 'Verified' : 'Unverified'}
              </span>
            </label>
            <input
              type="email"
              className="form-input"
              value={email}
              readOnly
              style={{ opacity: 0.6, cursor: 'not-allowed' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Avatar URL</label>
            <input type="url" className="form-input" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://example.com/avatar.jpg" />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" disabled={saving} className="btn btn-primary">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Danger Zone */}
      <div className="card" style={{ borderColor: 'rgba(244, 63, 94, 0.25)', background: 'rgba(244, 63, 94, 0.04)' }}>
        <div style={{ marginBottom: '16px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--status-error)', marginBottom: '4px' }}>Danger Zone</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Permanently delete your account and all associated data. This cannot be undone.
          </p>
        </div>
        {showDeleteConfirm ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p style={{ fontSize: '13px', color: 'var(--status-error)', fontWeight: 600 }}>
              Are you absolutely sure? This will permanently delete your account.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={handleDeleteAccount} disabled={deleting} className="btn btn-danger">
                {deleting ? 'Deleting...' : 'Yes, delete my account'}
              </button>
              <button onClick={() => setShowDeleteConfirm(false)} className="btn btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowDeleteConfirm(true)} className="btn btn-danger">
            Delete Account
          </button>
        )}
      </div>
    </div>
  );
}
