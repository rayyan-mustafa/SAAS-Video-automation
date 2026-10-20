'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface YouTubeStatus {
  status: 'CONNECTED' | 'NOT_CONNECTED' | 'AUTH_REQUIRED';
  channel?: {
    id: string;
    title: string;
    email?: string;
  };
  message: string;
}

export default function PublishingSettingsPage() {
  const [ytStatus, setYtStatus] = useState<YouTubeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Publishing Defaults
  const [defaultVisibility, setDefaultVisibility] = useState<'PRIVATE' | 'UNLISTED' | 'PUBLIC'>('PRIVATE');
  const [autoPublishEnabled, setAutoPublishEnabled] = useState(false);

  const fetchStatus = async () => {
    try {
      setLoading(true);
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
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('connected') === 'true') {
        setSuccessMsg('YouTube channel connected successfully.');
      }
      if (params.get('error')) {
        setError(decodeURIComponent(params.get('error') || 'Authentication failed'));
      }
    }
  }, []);

  const handleDisconnect = async () => {
    try {
      setDisconnecting(true);
      setError(null);
      const res = await fetch('/api/auth/youtube/disconnect', { method: 'POST' });
      if (res.ok) {
        setSuccessMsg('YouTube account disconnected.');
        await fetchStatus();
      } else {
        const d = await res.json();
        throw new Error(d.error || 'Failed to disconnect');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Top Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <Link href="/settings" style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Settings</Link>
          <span style={{ color: 'var(--text-dim)' }}>/</span>
          <span style={{ fontSize: '13px', color: '#fff', fontWeight: 600 }}>YouTube Integration</span>
        </div>
        <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
          YouTube Publishing & Integration
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Connect your Google YouTube channel for automated video uploading, scheduling, and custom thumbnails.
        </p>
      </div>

      {successMsg && (
        <div style={{ padding: '12px 18px', background: 'var(--status-ready-bg)', color: 'var(--status-ready)', border: '1px solid var(--status-ready-border)', borderRadius: 'var(--radius-md)', fontSize: '13px' }}>
          ✓ {successMsg}
        </div>
      )}

      {error && (
        <div style={{ padding: '12px 18px', background: 'var(--status-error-bg)', color: 'var(--status-error)', border: '1px solid var(--status-error-border)', borderRadius: 'var(--radius-md)', fontSize: '13px' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Main Connection Status Card */}
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
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#fff' }}>YouTube Data API v3</h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Official Google OAuth 2.0 channel authorization</p>
            </div>
          </div>

          <span className={`badge ${ytStatus?.status === 'CONNECTED' ? 'badge-ready' : 'badge-idle'}`}>
            {ytStatus?.status === 'CONNECTED' ? '✅ Connected' : 'Not Connected'}
          </span>
        </div>

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
                onClick={handleDisconnect}
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
              Connect your YouTube channel to automatically publish your generated videos according to your 30-day content calendar.
            </p>

            {authUrl ? (
              <a href={authUrl} className="btn btn-primary btn-lg" style={{ width: 'fit-content' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
                  <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" fill="#fff" />
                </svg>
                <span>Connect YouTube</span>
              </a>
            ) : (
              <div style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-medium)', color: 'var(--text-muted)', fontSize: '13px', lineHeight: 1.6 }}>
                <strong style={{ color: '#fff', display: 'block', marginBottom: '4px' }}>Google OAuth Setup Required:</strong>
                Add <code style={{ color: 'var(--accent-cyan)' }}>GOOGLE_CLIENT_ID</code> and <code style={{ color: 'var(--accent-cyan)' }}>GOOGLE_CLIENT_SECRET</code> to your <code style={{ color: 'var(--accent-cyan)' }}>.env</code> file to enable live 1-click Google OAuth 2.0 connection.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Default Publishing Preferences */}
      <div className="card" style={{ padding: '28px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>
          Default Publishing Preferences
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
          Configure default metadata and privacy states applied to automated video releases.
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
              <option value="PRIVATE">Private (Recommended for Review)</option>
              <option value="UNLISTED">Unlisted (Direct Link Only)</option>
              <option value="PUBLIC">Public (Immediate Distribution)</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
              30-Day Auto-Publisher
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
                Automatically upload completed calendar items
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
