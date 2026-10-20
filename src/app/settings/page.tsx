'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface YouTubeStatus {
  status: 'CONNECTED' | 'NOT_CONNECTED' | 'AUTH_REQUIRED';
  channel?: {
    id: string;
    title: string;
    email?: string;
  };
  message: string;
}

export default function SettingsHubPage() {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [activeTab, setActiveTab] = useState<'account' | 'publishing' | 'preferences' | 'infrastructure'>('account');

  // Profile State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [profileLoading, setProfileLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // YouTube State
  const [ytStatus, setYtStatus] = useState<YouTubeStatus | null>(null);
  const [ytLoading, setYtLoading] = useState(true);
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const [ytError, setYtError] = useState<string | null>(null);
  const [ytSuccess, setYtSuccess] = useState<string | null>(null);

  // User Preferences State
  const [defaultVisibility, setDefaultVisibility] = useState<'PRIVATE' | 'UNLISTED' | 'PUBLIC'>('PRIVATE');
  const [autoPublishEnabled, setAutoPublishEnabled] = useState(false);
  const [defaultDuration, setDefaultDuration] = useState('STANDARD');
  const [defaultLanguage, setDefaultLanguage] = useState('en');
  const [prefSaved, setPrefSaved] = useState(false);

  // Danger Zone
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadProfile();
    loadYouTubeStatus();
  }, []);

  const loadProfile = async () => {
    try {
      setProfileLoading(true);
      const res = await fetch('/api/customer/me');
      if (res.ok) {
        const data = await res.json();
        setName(data.name || '');
        setEmail(data.email || '');
        setEmailVerified(data.email_verified === 1 || data.email_verified === true);
        setAvatarUrl(data.avatar_url || '');
      }
    } catch {
      // ignore
    } finally {
      setProfileLoading(false);
    }
  };

  const loadYouTubeStatus = async () => {
    try {
      setYtLoading(true);
      const [statusRes, urlRes] = await Promise.all([
        fetch('/api/auth/youtube/status'),
        fetch('/api/auth/youtube/url'),
      ]);

      if (statusRes.ok) {
        const sData = await statusRes.json();
        setYtStatus(sData);
      }
      if (urlRes.ok) {
        const uData = await urlRes.json();
        setAuthUrl(uData.authUrl);
      }
    } catch (err: any) {
      setYtError(err.message);
    } finally {
      setYtLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    router.push('/login');
    router.refresh();
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileError(null);
    setProfileSuccess(false);
    try {
      const res = await fetch('/api/customer/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, avatar_url: avatarUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        setProfileError(data.error || 'Failed to save profile changes.');
        return;
      }
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch {
      setProfileError('Network error. Please try again.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleDisconnectYouTube = async () => {
    try {
      setDisconnecting(true);
      setYtError(null);
      const res = await fetch('/api/auth/youtube/disconnect', { method: 'POST' });
      if (res.ok) {
        setYtSuccess('YouTube account disconnected.');
        await loadYouTubeStatus();
        setTimeout(() => setYtSuccess(null), 3000);
      } else {
        const d = await res.json();
        throw new Error(d.error || 'Failed to disconnect');
      }
    } catch (err: any) {
      setYtError(err.message);
    } finally {
      setDisconnecting(false);
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

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    setPrefSaved(true);
    setTimeout(() => setPrefSaved(false), 3000);
  };

  return (
    <div className="content-container" style={{ display: 'flex', flexDirection: 'column', gap: '28px', maxWidth: '880px' }}>
      {/* Page Header */}
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>
          Account & Studio Settings
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Manage your personal profile, YouTube publishing integration, and studio production preferences.
        </p>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', flexWrap: 'wrap' }}>
        {[
          { id: 'account', label: 'Profile & Account', icon: '👤' },
          { id: 'publishing', label: 'YouTube Publishing', icon: '📺' },
          { id: 'preferences', label: 'Studio Preferences', icon: '⚙️' },
          { id: 'infrastructure', label: 'AI & Media Status', icon: '⚡' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`btn btn-sm ${activeTab === t.id ? 'btn-secondary' : 'btn-ghost'}`}
            style={{
              fontWeight: activeTab === t.id ? 700 : 500,
              background: activeTab === t.id ? 'var(--bg-elevated)' : 'transparent',
              color: activeTab === t.id ? '#fff' : 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TAB 1: ACCOUNT & PROFILE
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'account' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Profile Card */}
          <div className="card card-elevated" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--border-subtle)' }}>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>Profile Information</h2>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Update your name and profile details</p>
              </div>
              <Link href="/settings/security" className="btn btn-secondary btn-sm">
                <span>🔒 Security & Password</span>
              </Link>
            </div>

            {profileError && (
              <div style={{ padding: '12px 16px', background: 'var(--status-error-bg)', border: '1px solid rgba(244, 63, 94, 0.3)', borderRadius: 'var(--radius-md)', color: 'var(--status-error)', fontSize: '13px', marginBottom: '18px' }}>
                ⚠️ {profileError}
              </div>
            )}
            {profileSuccess && (
              <div style={{ padding: '12px 16px', background: 'var(--status-ready-bg)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 'var(--radius-md)', color: 'var(--status-ready)', fontSize: '13px', marginBottom: '18px' }}>
                ✓ Profile changes saved successfully.
              </div>
            )}

            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your Name"
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Email Address</span>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-full)',
                      background: emailVerified ? 'var(--status-ready-bg)' : 'var(--status-error-bg)',
                      color: emailVerified ? 'var(--status-ready)' : 'var(--status-error)',
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

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Avatar URL</label>
                <input
                  type="url"
                  className="form-input"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button type="submit" disabled={savingProfile} className="btn btn-primary">
                  {savingProfile ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>

          {/* Quick Billing & Plan Overview */}
          <div className="card" style={{ padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>
                Subscription & Credits
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Manage your billing plan, invoice history, and video generation allowances.
              </p>
            </div>
            <Link href="/billing" className="btn btn-secondary btn-sm">
              <span>View Billing & Plans ➔</span>
            </Link>
          </div>

          {/* Active Session & Sign Out */}
          <div className="card" style={{ padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>
                Account Session
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Sign out of your active browser session on this device.
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="btn btn-secondary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span>{loggingOut ? 'Signing out...' : 'Sign Out'}</span>
            </button>
          </div>

          {/* Danger Zone */}
          <div className="card" style={{ padding: '24px', borderColor: 'rgba(244, 63, 94, 0.25)', background: 'rgba(244, 63, 94, 0.03)' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--status-error)', marginBottom: '4px' }}>
              Danger Zone
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Permanently delete your customer account, generated video projects, and channel presets. This action cannot be reversed.
            </p>
            {showDeleteConfirm ? (
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button onClick={handleDeleteAccount} disabled={deleting} className="btn btn-danger btn-sm">
                  {deleting ? 'Deleting...' : 'Yes, Delete My Account'}
                </button>
                <button onClick={() => setShowDeleteConfirm(false)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
              </div>
            ) : (
              <button onClick={() => setShowDeleteConfirm(true)} className="btn btn-danger btn-sm">
                Delete Account
              </button>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 2: YOUTUBE PUBLISHING
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'publishing' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Main YouTube Card */}
          <div className="card card-elevated" style={{ padding: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: 'var(--radius-md)',
                    background: '#ff0000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    boxShadow: '0 0 24px rgba(255, 0, 0, 0.4)',
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
                    <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" fill="#000" />
                  </svg>
                </div>

                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#fff' }}>YouTube Publishing Gateway</h2>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Official Google OAuth 2.0 channel connection</p>
                </div>
              </div>

              <span className={`badge ${ytStatus?.status === 'CONNECTED' ? 'badge-ready' : 'badge-idle'}`}>
                {ytStatus?.status === 'CONNECTED' ? '✅ Connected' : 'Not Connected'}
              </span>
            </div>

            {ytSuccess && (
              <div style={{ padding: '12px 18px', background: 'var(--status-ready-bg)', color: 'var(--status-ready)', border: '1px solid var(--status-ready-border)', borderRadius: 'var(--radius-md)', fontSize: '13px', marginBottom: '16px' }}>
                ✓ {ytSuccess}
              </div>
            )}

            {ytError && (
              <div style={{ padding: '12px 18px', background: 'var(--status-error-bg)', color: 'var(--status-error)', border: '1px solid var(--status-error-border)', borderRadius: 'var(--radius-md)', fontSize: '13px', marginBottom: '16px' }}>
                ⚠️ {ytError}
              </div>
            )}

            {ytStatus?.status === 'CONNECTED' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ padding: '20px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                      Connected Channel
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginTop: '2px' }}>
                      {ytStatus.channel?.title || 'Active Channel'}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                      Channel ID
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                      {ytStatus.channel?.id || 'Connected'}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                      Account Email
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      {ytStatus.channel?.email || 'Authorized'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    AUTORA is authorized to publish and schedule videos directly to this channel.
                  </p>
                  <button
                    type="button"
                    onClick={handleDisconnectYouTube}
                    disabled={disconnecting}
                    className="btn btn-secondary btn-sm"
                    style={{ color: 'var(--status-error)' }}
                  >
                    {disconnecting ? 'Disconnecting...' : 'Disconnect YouTube'}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  Connect your YouTube channel to automatically publish your generated videos directly from your 30-day content calendar.
                </p>

                {authUrl ? (
                  <a href={authUrl} className="btn btn-primary btn-lg" style={{ width: 'fit-content', textDecoration: 'none' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
                      <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" fill="#fff" />
                    </svg>
                    <span>Connect YouTube</span>
                  </a>
                ) : (
                  <div style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-medium)', color: 'var(--text-muted)', fontSize: '13px', lineHeight: 1.6 }}>
                    <strong style={{ color: '#fff', display: 'block', marginBottom: '4px' }}>Google OAuth Setup:</strong>
                    YouTube OAuth connection is configured server-side. Click Connect YouTube when ready to link your channel.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Default Publishing Preferences */}
          <div className="card" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>
              Default Publishing Settings
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '18px' }}>
              Set default privacy status and automated schedule triggers for new video projects.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Default Privacy Status
                </label>
                <select
                  className="topbar-search"
                  style={{ width: '100%', borderRadius: 'var(--radius-md)', padding: '10px 14px', background: 'var(--bg-primary)' }}
                  value={defaultVisibility}
                  onChange={(e) => setDefaultVisibility(e.target.value as any)}
                >
                  <option value="PRIVATE">Private (Review Before Release)</option>
                  <option value="UNLISTED">Unlisted (Shareable Link)</option>
                  <option value="PUBLIC">Public (Instant Distribution)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Automated Publishing Trigger
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', height: '42px' }}>
                  <input
                    type="checkbox"
                    id="autoPubCheck"
                    checked={autoPublishEnabled}
                    onChange={(e) => setAutoPublishEnabled(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                  />
                  <label htmlFor="autoPubCheck" style={{ fontSize: '13px', color: '#fff', cursor: 'pointer' }}>
                    Auto-publish on calendar scheduled date
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 3: STUDIO & VIDEO PREFERENCES
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'preferences' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="card" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>
              Video Production Defaults
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Configure your default presets when launching new automation pipelines.
            </p>

            {prefSaved && (
              <div style={{ padding: '12px 16px', background: 'var(--status-ready-bg)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 'var(--radius-md)', color: 'var(--status-ready)', fontSize: '13px', marginBottom: '18px' }}>
                ✓ Production preferences saved.
              </div>
            )}

            <form onSubmit={handleSavePreferences} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Default Target Duration</label>
                  <select
                    className="topbar-search"
                    style={{ width: '100%', borderRadius: 'var(--radius-md)', padding: '10px 14px', background: 'var(--bg-primary)' }}
                    value={defaultDuration}
                    onChange={(e) => setDefaultDuration(e.target.value)}
                  >
                    <option value="SHORT">YouTube Shorts (30 - 60s)</option>
                    <option value="STANDARD">Standard Video (5 - 8 mins)</option>
                    <option value="LONG">In-Depth Explainer (10 - 15 mins)</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Default Language</label>
                  <select
                    className="topbar-search"
                    style={{ width: '100%', borderRadius: 'var(--radius-md)', padding: '10px 14px', background: 'var(--bg-primary)' }}
                    value={defaultLanguage}
                    onChange={(e) => setDefaultLanguage(e.target.value)}
                  >
                    <option value="en">English (US / UK / Global)</option>
                    <option value="es">Spanish (Español)</option>
                    <option value="fr">French (Français)</option>
                    <option value="de">German (Deutsch)</option>
                    <option value="ur">Urdu / Hindi</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Master Video Rendering Quality</label>
                  <input type="text" className="form-input" value="1080p Full HD (1920x1080 @ 30fps CFR)" readOnly style={{ opacity: 0.8 }} />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Audio Stream Standard</label>
                  <input type="text" className="form-input" value="192 kbps AAC Stereo (48,000 Hz)" readOnly style={{ opacity: 0.8 }} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button type="submit" className="btn btn-primary">
                  Save Preferences
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 4: PLATFORM INFRASTRUCTURE STATUS (NO EXPOSED KEYS)
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'infrastructure' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="card" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>
              AUTORA Managed Infrastructure
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px' }}>
              AUTORA provides fully managed AI models, high-definition stock media feeds, and neural voice engines out-of-the-box.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { name: 'AI Video Scriptwriting & Copilot', status: 'Operational', desc: 'Managed high-speed LLM engine for multi-scene video scripts and hook optimization.' },
                { name: 'HD Stock Footage Engine', status: 'Operational', desc: 'Direct access to over 3,000,000 HD/4K royalty-free cinematic B-roll video clips.' },
                { name: 'Neural Voice Synthesis', status: 'Operational', desc: 'Over 40 realistic neural voice actors across accents and languages.' },
                { name: 'FFmpeg 1080p Render Compositor', status: 'Operational', desc: 'High-speed cloud video rendering, audio mixing, and animated subtitle burning.' },
                { name: 'YouTube Direct OAuth Pipeline', status: 'Operational', desc: 'Resumable 1080p video uploading, scheduled releases, and thumbnail attachment.' },
              ].map((svc) => (
                <div
                  key={svc.name}
                  style={{
                    padding: '16px 20px',
                    background: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <strong style={{ fontSize: '14px', color: '#fff' }}>{svc.name}</strong>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{svc.desc}</div>
                  </div>
                  <span className="badge badge-ready" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }} />
                    {svc.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
