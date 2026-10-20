'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function SuperAdminPage() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [username, setUsername] = useState('sanin5');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  // Admin Navigation State
  const [activeTab, setActiveTab] = useState<'users' | 'overview' | 'channels' | 'keys' | 'diagnostics'>('users');
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Users Management State
  const [users, setUsers] = useState<any[]>([]);
  const [usersSummary, setUsersSummary] = useState<any>(null);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userTierFilter, setUserTierFilter] = useState('ALL');
  const [userStatusFilter, setUserStatusFilter] = useState('ALL');

  // Single User Inspection Modal State
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [loadingUserDetail, setLoadingUserDetail] = useState(false);
  const [userDetailTab, setUserDetailTab] = useState<'projects' | 'channels' | 'ledger' | 'connections'>('projects');
  const [adjustAmount, setAdjustAmount] = useState<number>(100);
  const [adjustReason, setAdjustReason] = useState<string>('Bonus credits');
  const [adjustingCredits, setAdjustingCredits] = useState(false);
  const [newTier, setNewTier] = useState<string>('CREATOR');
  const [newSubStatus, setNewSubStatus] = useState<string>('ACTIVE');
  const [updatingPlan, setUpdatingPlan] = useState(false);
  const [modalActionMsg, setModalActionMsg] = useState<string | null>(null);

  // Quick adjust inline popup
  const [quickAdjustUser, setQuickAdjustUser] = useState<any | null>(null);

  // Keys State
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);

  // Diagnostics State
  const [diagnosticsData, setDiagnosticsData] = useState<any>(null);
  const [runningDiagnostics, setRunningDiagnostics] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/admin/auth');
      const data = await res.json();
      setAuthenticated(data.authenticated === true);
      if (data.authenticated) {
        loadAdminData();
        fetchUsers();
      }
    } catch {
      setAuthenticated(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoggingIn(true);
      setLoginError(null);

      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Authentication failed');
      }

      setAuthenticated(true);
      setPassword('');
      loadAdminData();
      fetchUsers();
    } catch (err: any) {
      setLoginError(err.message || 'Login failed');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/auth', { method: 'DELETE' });
      setAuthenticated(false);
    } catch (err) {
      console.error(err);
    }
  };

  const loadAdminData = async () => {
    try {
      setLoading(true);
      const [statsRes, keysRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/keys'),
      ]);

      if (statsRes.ok) {
        const sData = await statsRes.json();
        setStats(sData);
      }

      if (keysRes.ok) {
        const kData = await keysRes.json();
        const map: Record<string, string> = {};
        if (kData.credentials) {
          if (Array.isArray(kData.credentials)) {
            kData.credentials.forEach((c: any) => {
              map[c.provider] = c.is_configured || c.configured ? '••••••••••••••••••••' : '';
            });
          } else if (typeof kData.credentials === 'object') {
            Object.entries(kData.credentials).forEach(([provider, val]: [string, any]) => {
              map[provider] = val.configured ? '••••••••••••••••••••' : '';
            });
          }
        }
        setCredentials(map);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setUsersLoading(true);
      const params = new URLSearchParams();
      if (userSearch) params.set('search', userSearch);
      if (userTierFilter !== 'ALL') params.set('tier', userTierFilter);
      if (userStatusFilter !== 'ALL') params.set('status', userStatusFilter);

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        setUsersSummary(data.summary || null);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setUsersLoading(false);
    }
  };

  const openUserDetail = async (userId: string) => {
    try {
      setLoadingUserDetail(true);
      setModalActionMsg(null);
      const res = await fetch(`/api/admin/users?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedUser(data.user);
        setNewTier(data.user.plan || 'CREATOR');
        setNewSubStatus(data.user.subscription_status || 'ACTIVE');
      }
    } catch (err) {
      console.error('Error fetching user detail:', err);
    } finally {
      setLoadingUserDetail(false);
    }
  };

  const handleAdjustCredits = async (userId: string, amount: number, reason: string) => {
    try {
      setAdjustingCredits(true);
      setModalActionMsg(null);
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'adjust_credits',
          userId,
          amount,
          reason,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to adjust credits');
      }

      setModalActionMsg(data.message);
      setMsg(data.message);
      // Refresh user modal data and users table
      if (selectedUser && selectedUser.id === userId) {
        openUserDetail(userId);
      }
      fetchUsers();
      setQuickAdjustUser(null);
    } catch (err: any) {
      setModalActionMsg(`Error: ${err.message}`);
    } finally {
      setAdjustingCredits(false);
    }
  };

  const handleUpdatePlan = async (userId: string) => {
    try {
      setUpdatingPlan(true);
      setModalActionMsg(null);
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_plan',
          userId,
          tier: newTier,
          subscription_status: newSubStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update plan');
      }

      setModalActionMsg(data.message);
      setMsg(data.message);
      if (selectedUser && selectedUser.id === userId) {
        openUserDetail(userId);
      }
      fetchUsers();
    } catch (err: any) {
      setModalActionMsg(`Error: ${err.message}`);
    } finally {
      setUpdatingPlan(false);
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: string) => {
    try {
      const nextStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_status',
          userId,
          status: nextStatus,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMsg(data.message);
        if (selectedUser && selectedUser.id === userId) {
          openUserDetail(userId);
        }
        fetchUsers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRunDiagnostics = async () => {
    try {
      setRunningDiagnostics(true);
      const res = await fetch('/api/admin/diagnostics');
      if (res.ok) {
        const data = await res.json();
        setDiagnosticsData(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRunningDiagnostics(false);
    }
  };

  const handleSaveKey = async (provider: string, key: string) => {
    try {
      setSavingKey(provider);
      const res = await fetch('/api/admin/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, key }),
      });
      if (res.ok) {
        setMsg(`API Key for ${provider} updated.`);
        setCredentials((prev) => ({ ...prev, [provider]: key ? '••••••••••••••••••••' : '' }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingKey(null);
    }
  };

  const getTierBadgeStyle = (tier: string) => {
    const t = (tier || '').toUpperCase();
    switch (t) {
      case 'STARTER':
        return { bg: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)' };
      case 'CREATOR':
      case 'PRO':
        return { bg: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.3)' };
      case 'SCALE':
      case 'GROWTH':
        return { bg: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)' };
      case 'AGENCY':
        return { bg: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)' };
      default:
        return { bg: 'rgba(148, 163, 184, 0.15)', color: '#cbd5e1', border: '1px solid rgba(148, 163, 184, 0.3)' };
    }
  };

  const getSubStatusBadgeStyle = (status: string) => {
    const s = (status || '').toUpperCase();
    switch (s) {
      case 'ACTIVE':
        return { bg: 'rgba(34, 197, 94, 0.15)', color: '#4ade80' };
      case 'TRIALING':
        return { bg: 'rgba(234, 179, 8, 0.15)', color: '#facc15' };
      case 'PAST_DUE':
        return { bg: 'rgba(249, 115, 22, 0.15)', color: '#fb923c' };
      case 'CANCELED':
      case 'SUSPENDED':
        return { bg: 'rgba(239, 68, 68, 0.15)', color: '#f87171' };
      default:
        return { bg: 'rgba(148, 163, 184, 0.15)', color: '#cbd5e1' };
    }
  };

  // If Not Authenticated: Render Login Modal
  if (authenticated === false) {
    return (
      <div className="content-container" style={{ maxWidth: '440px', padding: '80px 20px', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="card card-glow" style={{ padding: '36px', width: '100%', borderRadius: '16px', background: '#0e1117', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 14px',
                color: '#fff',
                boxShadow: '0 8px 24px rgba(6,182,212,0.3)',
              }}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', marginBottom: '6px' }}>AUTORA Super Admin</h1>
            <p style={{ fontSize: '13px', color: '#94a3b8' }}>Sign in to manage users, subscriptions, credits & platform infrastructure</p>
          </div>

          {loginError && (
            <div
              style={{
                padding: '12px 14px',
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#f87171',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                fontSize: '13px',
                marginBottom: '18px',
                textAlign: 'center',
              }}
            >
              ⚠️ {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>Admin Username</label>
              <input
                type="text"
                className="form-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: '#161b22', border: '1px solid #30363d', color: '#fff' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>Password</label>
              <input
                type="password"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: '#161b22', border: '1px solid #30363d', color: '#fff' }}
              />
            </div>

            <button
              type="submit"
              disabled={loggingIn}
              className="btn btn-primary"
              style={{
                width: '100%',
                marginTop: '10px',
                padding: '12px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '14px',
                background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {loggingIn ? 'Verifying Credentials...' : 'Sign In as Super Admin'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0d14', color: '#e2e8f0', padding: '28px 24px' }}>
      <div style={{ maxWidth: '1360px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Top Header Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 10px #22c55e' }} />
              <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#38bdf8', letterSpacing: '0.08em' }}>
                AUTORA Console • Logged in as sanin5
              </span>
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', margin: 0 }}>
              Super Admin Management Portal
            </h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Link href="/" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none', padding: '8px 14px', borderRadius: '6px', fontSize: '13px', background: '#1e293b', color: '#cbd5e1' }}>
              ← Return to Studio
            </Link>
            <button onClick={handleLogout} className="btn btn-ghost btn-sm" style={{ padding: '8px 14px', borderRadius: '6px', fontSize: '13px', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              Sign Out
            </button>
          </div>
        </div>

        {/* Global Toast Notification */}
        {msg && (
          <div style={{ padding: '12px 18px', background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '8px', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>✓ {msg}</span>
            <button onClick={() => setMsg(null)} style={{ background: 'transparent', border: 'none', color: '#4ade80', cursor: 'pointer', fontSize: '16px' }}>✕</button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px', flexWrap: 'wrap' }}>
          {[
            { id: 'users', label: '👥 Users & Subscriptions' },
            { id: 'overview', label: '📊 System Health & Stats' },
            { id: 'channels', label: '🎬 Channels & Projects' },
            { id: 'keys', label: '🔑 API Key Vault' },
            { id: 'diagnostics', label: '⚡ Engine Diagnostics' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setActiveTab(t.id as any);
                if (t.id === 'users') fetchUsers();
              }}
              style={{
                padding: '9px 18px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: activeTab === t.id ? 700 : 500,
                background: activeTab === t.id ? 'linear-gradient(135deg, rgba(6,182,212,0.2) 0%, rgba(59,130,246,0.2) 100%)' : 'transparent',
                color: activeTab === t.id ? '#38bdf8' : '#94a3b8',
                border: activeTab === t.id ? '1px solid rgba(6,182,212,0.4)' : '1px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ======================================================== */}
        {/* TAB 1: USERS & SUBSCRIPTIONS (MAIN FOCUS)                */}
        {/* ======================================================== */}
        {activeTab === 'users' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Summary Metrics Bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              <div className="card" style={{ padding: '20px', borderRadius: '12px', background: '#0e131f', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                  Total Registered Users
                </div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#fff', fontFamily: 'monospace' }}>
                  {usersSummary ? usersSummary.totalUsers : users.length}
                </div>
                <div style={{ fontSize: '11px', color: '#38bdf8', marginTop: '4px' }}>Active platform accounts</div>
              </div>

              <div className="card" style={{ padding: '20px', borderRadius: '12px', background: '#0e131f', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                  Active Subscriptions
                </div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#4ade80', fontFamily: 'monospace' }}>
                  {usersSummary ? usersSummary.activeSubscribers : (stats?.counts?.subscriptions || 0)}
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>Paying / Active status tiers</div>
              </div>

              <div className="card" style={{ padding: '20px', borderRadius: '12px', background: '#0e131f', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                  Total Credits in Balances
                </div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#fbbf24', fontFamily: 'monospace' }}>
                  {usersSummary ? usersSummary.totalCredits.toLocaleString() : (stats?.stats?.totalCredits || 0).toLocaleString()}
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>Available video generation credits</div>
              </div>

              <div className="card" style={{ padding: '20px', borderRadius: '12px', background: '#0e131f', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                  User Created Projects
                </div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#c084fc', fontFamily: 'monospace' }}>
                  {usersSummary ? usersSummary.totalProjects : (stats?.counts?.projects || 0)}
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>Total video scripts & jobs</div>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="card" style={{ padding: '16px 20px', borderRadius: '12px', background: '#0e131f', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', flex: 1, minWidth: '280px' }}>
                <input
                  type="text"
                  placeholder="🔍 Search users by name, email or ID..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') fetchUsers(); }}
                  style={{
                    flex: 1,
                    minWidth: '240px',
                    padding: '9px 14px',
                    borderRadius: '8px',
                    background: '#161b26',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff',
                    fontSize: '13px',
                  }}
                />

                <select
                  value={userTierFilter}
                  onChange={(e) => {
                    setUserTierFilter(e.target.value);
                    setTimeout(fetchUsers, 50);
                  }}
                  style={{
                    padding: '9px 14px',
                    borderRadius: '8px',
                    background: '#161b26',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  <option value="ALL">All Plans (Tiers)</option>
                  <option value="STARTER">Starter Plan ($19)</option>
                  <option value="CREATOR">Creator Plan ($49)</option>
                  <option value="SCALE">Scale Plan ($99)</option>
                  <option value="AGENCY">Agency Plan ($249)</option>
                </select>

                <select
                  value={userStatusFilter}
                  onChange={(e) => {
                    setUserStatusFilter(e.target.value);
                    setTimeout(fetchUsers, 50);
                  }}
                  style={{
                    padding: '9px 14px',
                    borderRadius: '8px',
                    background: '#161b26',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  <option value="ALL">All Account Statuses</option>
                  <option value="ACTIVE">Active Users</option>
                  <option value="SUSPENDED">Suspended Users</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={fetchUsers}
                  disabled={usersLoading}
                  style={{
                    padding: '9px 18px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    background: '#1e293b',
                    color: '#38bdf8',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    cursor: 'pointer',
                  }}
                >
                  {usersLoading ? 'Refreshing...' : 'Apply & Refresh'}
                </button>
              </div>
            </div>

            {/* Users Directory Table */}
            <div className="card" style={{ borderRadius: '12px', background: '#0e131f', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#fff', margin: 0 }}>
                  Registered Creators & Customer Accounts ({users.length})
                </h3>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                  Full data visibility • Click user to inspect projects & edit plan
                </span>
              </div>

              <div style={{ overflowX: 'auto', width: '100%' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.06)', color: '#94a3b8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      <th style={{ padding: '14px 20px' }}>User / Account</th>
                      <th style={{ padding: '14px 16px' }}>Subscription Plan</th>
                      <th style={{ padding: '14px 16px' }}>Sub Status</th>
                      <th style={{ padding: '14px 16px' }}>Credits Balance</th>
                      <th style={{ padding: '14px 16px' }}>Channels & Videos</th>
                      <th style={{ padding: '14px 16px' }}>Date Joined</th>
                      <th style={{ padding: '14px 20px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                          {usersLoading ? 'Loading creators from database...' : 'No users found matching your filters.'}
                        </td>
                      </tr>
                    ) : (
                      users.map((u) => {
                        const tierStyle = getTierBadgeStyle(u.plan);
                        const subStyle = getSubStatusBadgeStyle(u.subscription_status);
                        return (
                          <tr
                            key={u.id}
                            style={{
                              borderBottom: '1px solid rgba(255,255,255,0.04)',
                              transition: 'background 0.15s ease',
                              fontSize: '13px',
                            }}
                          >
                            {/* User details */}
                            <td style={{ padding: '14px 20px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div
                                  style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#fff',
                                    fontWeight: 700,
                                    fontSize: '13px',
                                    flexShrink: 0,
                                  }}
                                >
                                  {u.name ? u.name.charAt(0).toUpperCase() : u.email.charAt(0).toUpperCase()}
                                </div>
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span>{u.name || 'Creator'}</span>
                                    {u.role === 'ADMIN' && (
                                      <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', background: '#3b82f6', color: '#fff' }}>ADMIN</span>
                                    )}
                                    {u.status === 'SUSPENDED' && (
                                      <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', background: '#ef4444', color: '#fff' }}>SUSPENDED</span>
                                    )}
                                  </div>
                                  <div style={{ color: '#94a3b8', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {u.email}
                                  </div>
                                  <div style={{ color: '#64748b', fontSize: '10px', fontFamily: 'monospace' }}>
                                    ID: {u.id}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Plan badge */}
                            <td style={{ padding: '14px 16px' }}>
                              <span
                                style={{
                                  padding: '4px 10px',
                                  borderRadius: '20px',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  letterSpacing: '0.04em',
                                  background: tierStyle.bg,
                                  color: tierStyle.color,
                                  border: tierStyle.border,
                                }}
                              >
                                {u.plan || 'CREATOR'}
                              </span>
                            </td>

                            {/* Subscription Status */}
                            <td style={{ padding: '14px 16px' }}>
                              <span
                                style={{
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  background: subStyle.bg,
                                  color: subStyle.color,
                                }}
                              >
                                ● {u.subscription_status || 'ACTIVE'}
                              </span>
                            </td>

                            {/* Credits Balance */}
                            <td style={{ padding: '14px 16px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontWeight: 700, color: '#fbbf24', fontFamily: 'monospace', fontSize: '14px' }}>
                                  {Number(u.credits_balance || 0).toLocaleString()}
                                </span>
                                <button
                                  onClick={() => setQuickAdjustUser(u)}
                                  title="Quick credit adjustment"
                                  style={{
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    fontSize: '10px',
                                    background: 'rgba(251, 191, 36, 0.15)',
                                    color: '#fbbf24',
                                    border: '1px solid rgba(251, 191, 36, 0.3)',
                                    cursor: 'pointer',
                                  }}
                                >
                                  + / -
                                </button>
                              </div>
                              <div style={{ fontSize: '10px', color: '#64748b' }}>
                                Allowance: {u.monthly_allowance || 500}/mo
                              </div>
                            </td>

                            {/* Activity */}
                            <td style={{ padding: '14px 16px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '12px' }}>
                                <span style={{ color: '#e2e8f0' }}>🎬 {u.projects_count || 0} Projects ({u.completed_videos_count || 0} rendered)</span>
                                <span style={{ color: '#94a3b8' }}>📡 {u.channels_count || 0} Channel(s)</span>
                              </div>
                            </td>

                            {/* Date Joined */}
                            <td style={{ padding: '14px 16px', color: '#94a3b8', fontSize: '12px', whiteSpace: 'nowrap' }}>
                              {u.created_at ? new Date(u.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
                            </td>

                            {/* Actions */}
                            <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                <button
                                  onClick={() => openUserDetail(u.id)}
                                  style={{
                                    padding: '6px 12px',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    background: 'linear-gradient(135deg, rgba(6,182,212,0.15) 0%, rgba(59,130,246,0.15) 100%)',
                                    color: '#38bdf8',
                                    border: '1px solid rgba(6,182,212,0.3)',
                                    cursor: 'pointer',
                                  }}
                                >
                                  Inspect & Manage
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quick Credit Adjust Dialog Modal */}
            {quickAdjustUser && (
              <div
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(0,0,0,0.7)',
                  backdropFilter: 'blur(4px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 9999,
                  padding: '20px',
                }}
              >
                <div
                  style={{
                    background: '#111827',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '14px',
                    padding: '24px',
                    width: '100%',
                    maxWidth: '420px',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                  }}
                >
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
                    Adjust Credits for {quickAdjustUser.name || quickAdjustUser.email}
                  </h3>
                  <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '16px' }}>
                    Current Balance: <strong style={{ color: '#fbbf24' }}>{quickAdjustUser.credits_balance}</strong> credits.
                    Enter positive number to grant, negative to deduct.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>Credit Change Amount</label>
                      <input
                        type="number"
                        defaultValue={200}
                        id="quickAdjustInput"
                        style={{
                          width: '100%',
                          padding: '10px',
                          borderRadius: '8px',
                          background: '#1f2937',
                          border: '1px solid #374151',
                          color: '#fff',
                          fontFamily: 'monospace',
                          fontSize: '14px',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>Reason / Note</label>
                      <input
                        type="text"
                        defaultValue="Admin compensation"
                        id="quickAdjustReason"
                        style={{
                          width: '100%',
                          padding: '10px',
                          borderRadius: '8px',
                          background: '#1f2937',
                          border: '1px solid #374151',
                          color: '#fff',
                          fontSize: '13px',
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => setQuickAdjustUser(null)}
                        style={{ padding: '8px 16px', borderRadius: '6px', background: '#374151', color: '#cbd5e1', border: 'none', cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          const input = document.getElementById('quickAdjustInput') as HTMLInputElement;
                          const reasonInput = document.getElementById('quickAdjustReason') as HTMLInputElement;
                          const val = Number(input?.value || 0);
                          const reason = reasonInput?.value || 'Admin adjustment';
                          if (val !== 0) {
                            handleAdjustCredits(quickAdjustUser.id, val, reason);
                          }
                        }}
                        style={{
                          padding: '8px 18px',
                          borderRadius: '6px',
                          background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
                          color: '#fff',
                          fontWeight: 600,
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        Apply Adjustment
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Comprehensive Single User Inspection Modal */}
            {selectedUser && (
              <div
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(0,0,0,0.8)',
                  backdropFilter: 'blur(6px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 9999,
                  padding: '24px',
                }}
              >
                <div
                  style={{
                    background: '#0d111a',
                    border: '1px solid rgba(255,255,255,0.14)',
                    borderRadius: '16px',
                    width: '100%',
                    maxWidth: '920px',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    boxShadow: '0 25px 60px rgba(0,0,0,0.7)',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {/* Modal Header */}
                  <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div
                        style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontWeight: 700,
                          fontSize: '18px',
                        }}
                      >
                        {selectedUser.name ? selectedUser.name.charAt(0).toUpperCase() : selectedUser.email.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', margin: 0 }}>
                            {selectedUser.name || 'Creator'}
                          </h2>
                          <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, ...getTierBadgeStyle(selectedUser.plan) }}>
                            {selectedUser.plan || 'CREATOR'}
                          </span>
                          <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, ...getSubStatusBadgeStyle(selectedUser.subscription_status) }}>
                            {selectedUser.subscription_status || 'ACTIVE'}
                          </span>
                        </div>
                        <div style={{ color: '#94a3b8', fontSize: '13px', marginTop: '2px' }}>
                          {selectedUser.email} • ID: <span style={{ fontFamily: 'monospace' }}>{selectedUser.id}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedUser(null)}
                      style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer', padding: '6px' }}
                    >
                      ✕
                    </button>
                  </div>

                  {modalActionMsg && (
                    <div style={{ margin: '16px 24px 0', padding: '10px 16px', borderRadius: '8px', background: 'rgba(6, 182, 212, 0.15)', color: '#38bdf8', fontSize: '12px' }}>
                      {modalActionMsg}
                    </div>
                  )}

                  {/* Modal Action Controls: Plan Switcher & Credit Adjuster */}
                  <div style={{ padding: '20px 24px', background: '#121724', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                    
                    {/* Plan & Tier Management */}
                    <div style={{ padding: '16px', borderRadius: '10px', background: '#161d2d', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>💳</span> Subscription Plan & Tier Controls
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <select
                            value={newTier}
                            onChange={(e) => setNewTier(e.target.value)}
                            style={{ flex: 1, padding: '8px 10px', borderRadius: '6px', background: '#1f293d', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '12px' }}
                          >
                            <option value="STARTER">STARTER ($19/mo)</option>
                            <option value="CREATOR">CREATOR ($49/mo)</option>
                            <option value="SCALE">SCALE ($99/mo)</option>
                            <option value="AGENCY">AGENCY ($249/mo)</option>
                          </select>

                          <select
                            value={newSubStatus}
                            onChange={(e) => setNewSubStatus(e.target.value)}
                            style={{ width: '120px', padding: '8px 10px', borderRadius: '6px', background: '#1f293d', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '12px' }}
                          >
                            <option value="ACTIVE">ACTIVE</option>
                            <option value="TRIALING">TRIALING</option>
                            <option value="PAST_DUE">PAST DUE</option>
                            <option value="CANCELED">CANCELED</option>
                          </select>
                        </div>

                        <button
                          onClick={() => handleUpdatePlan(selectedUser.id)}
                          disabled={updatingPlan}
                          style={{
                            padding: '8px 14px',
                            borderRadius: '6px',
                            background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
                            color: '#fff',
                            fontWeight: 600,
                            fontSize: '12px',
                            border: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          {updatingPlan ? 'Updating...' : 'Save Plan & Status Change'}
                        </button>
                      </div>
                    </div>

                    {/* Credit Grant / Adjustment */}
                    <div style={{ padding: '16px', borderRadius: '10px', background: '#161d2d', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>🪙 Direct Credit Adjustment</span>
                        <span style={{ color: '#fbbf24', fontFamily: 'monospace' }}>Balance: {selectedUser.credits_balance}</span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <input
                            type="number"
                            value={adjustAmount}
                            onChange={(e) => setAdjustAmount(Number(e.target.value))}
                            placeholder="+/- Amount"
                            style={{ width: '110px', padding: '8px 10px', borderRadius: '6px', background: '#1f293d', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '12px', fontFamily: 'monospace' }}
                          />
                          <input
                            type="text"
                            value={adjustReason}
                            onChange={(e) => setAdjustReason(e.target.value)}
                            placeholder="Reason for change"
                            style={{ flex: 1, padding: '8px 10px', borderRadius: '6px', background: '#1f293d', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '12px' }}
                          />
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => handleAdjustCredits(selectedUser.id, adjustAmount, adjustReason)}
                            disabled={adjustingCredits || adjustAmount === 0}
                            style={{
                              flex: 1,
                              padding: '8px 14px',
                              borderRadius: '6px',
                              background: '#f59e0b',
                              color: '#000',
                              fontWeight: 700,
                              fontSize: '12px',
                              border: 'none',
                              cursor: 'pointer',
                            }}
                          >
                            {adjustingCredits ? 'Adjusting...' : `Apply Adjustment (${adjustAmount > 0 ? '+' : ''}${adjustAmount})`}
                          </button>

                          <button
                            onClick={() => handleToggleUserStatus(selectedUser.id, selectedUser.status)}
                            style={{
                              padding: '8px 14px',
                              borderRadius: '6px',
                              background: selectedUser.status === 'ACTIVE' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                              color: selectedUser.status === 'ACTIVE' ? '#f87171' : '#4ade80',
                              border: '1px solid currentColor',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            {selectedUser.status === 'ACTIVE' ? 'Suspend Account' : 'Reactivate'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Modal Sub-Tabs */}
                  <div style={{ padding: '0 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: '16px' }}>
                    {[
                      { id: 'projects', label: `🎬 Projects (${selectedUser.projects?.length || 0})` },
                      { id: 'channels', label: `📡 Channels (${selectedUser.channels?.length || 0})` },
                      { id: 'ledger', label: `📜 Credit Ledger (${selectedUser.transactions?.length || 0})` },
                      { id: 'connections', label: `🔗 Social / YouTube (${selectedUser.connections?.length || 0})` },
                    ].map((st) => (
                      <button
                        key={st.id}
                        onClick={() => setUserDetailTab(st.id as any)}
                        style={{
                          padding: '12px 6px',
                          border: 'none',
                          borderBottom: userDetailTab === st.id ? '2px solid #38bdf8' : '2px solid transparent',
                          background: 'transparent',
                          color: userDetailTab === st.id ? '#38bdf8' : '#94a3b8',
                          fontSize: '13px',
                          fontWeight: userDetailTab === st.id ? 700 : 500,
                          cursor: 'pointer',
                        }}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>

                  {/* Modal Body Content */}
                  <div style={{ padding: '20px 24px', minHeight: '260px' }}>
                    
                    {/* Sub-tab 1: Projects */}
                    {userDetailTab === 'projects' && (
                      <div>
                        {(!selectedUser.projects || selectedUser.projects.length === 0) ? (
                          <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                            No video projects generated yet by this user.
                          </div>
                        ) : (
                          <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                              <thead>
                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', textTransform: 'uppercase' }}>
                                  <th style={{ padding: '10px 8px' }}>Project Topic</th>
                                  <th style={{ padding: '10px 8px' }}>Channel</th>
                                  <th style={{ padding: '10px 8px' }}>Status</th>
                                  <th style={{ padding: '10px 8px' }}>Stage</th>
                                  <th style={{ padding: '10px 8px' }}>Date</th>
                                </tr>
                              </thead>
                              <tbody>
                                {selectedUser.projects.map((p: any) => (
                                  <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                    <td style={{ padding: '10px 8px', color: '#fff', fontWeight: 600 }}>{p.topic}</td>
                                    <td style={{ padding: '10px 8px', color: '#94a3b8' }}>{p.channel_name || 'Standard'}</td>
                                    <td style={{ padding: '10px 8px' }}>
                                      <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 600, background: p.status === 'COMPLETED' ? 'rgba(34,197,94,0.15)' : 'rgba(234,179,8,0.15)', color: p.status === 'COMPLETED' ? '#4ade80' : '#facc15' }}>
                                        {p.status}
                                      </span>
                                    </td>
                                    <td style={{ padding: '10px 8px', color: '#38bdf8' }}>{p.current_stage}</td>
                                    <td style={{ padding: '10px 8px', color: '#94a3b8' }}>
                                      {p.created_at ? new Date(p.created_at).toLocaleDateString() : ''}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Sub-tab 2: Channels */}
                    {userDetailTab === 'channels' && (
                      <div>
                        {(!selectedUser.channels || selectedUser.channels.length === 0) ? (
                          <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                            No channels configured by this user.
                          </div>
                        ) : (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
                            {selectedUser.channels.map((c: any) => (
                              <div key={c.id} style={{ padding: '14px', borderRadius: '8px', background: '#161d2d', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <div style={{ fontWeight: 700, color: '#fff', fontSize: '14px' }}>{c.name}</div>
                                <div style={{ fontSize: '12px', color: '#38bdf8', marginTop: '2px' }}>{c.niche} • {c.language}</div>
                                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px' }}>
                                  Voice: {c.voice} | Duration: {c.target_duration_minutes}m
                                </div>
                                <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>
                                  Platform: {c.publishing_platform} | Auto-Publish: {c.auto_publish ? 'Enabled' : 'Disabled'}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Sub-tab 3: Credit Ledger */}
                    {userDetailTab === 'ledger' && (
                      <div>
                        {(!selectedUser.transactions || selectedUser.transactions.length === 0) ? (
                          <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                            No credit transaction ledger records yet.
                          </div>
                        ) : (
                          <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                              <thead>
                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', textTransform: 'uppercase' }}>
                                  <th style={{ padding: '8px' }}>Date</th>
                                  <th style={{ padding: '8px' }}>Type</th>
                                  <th style={{ padding: '8px' }}>Amount</th>
                                  <th style={{ padding: '8px' }}>Balance After</th>
                                  <th style={{ padding: '8px' }}>Description</th>
                                </tr>
                              </thead>
                              <tbody>
                                {selectedUser.transactions.map((tx: any) => (
                                  <tr key={tx.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                    <td style={{ padding: '8px', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                                      {tx.created_at ? new Date(tx.created_at).toLocaleString() : ''}
                                    </td>
                                    <td style={{ padding: '8px', color: '#fff', fontWeight: 600 }}>{tx.type}</td>
                                    <td style={{ padding: '8px', fontWeight: 700, color: tx.amount > 0 ? '#4ade80' : '#f87171', fontFamily: 'monospace' }}>
                                      {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                                    </td>
                                    <td style={{ padding: '8px', color: '#fbbf24', fontFamily: 'monospace' }}>{tx.balance_after}</td>
                                    <td style={{ padding: '8px', color: '#cbd5e1' }}>{tx.description}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Sub-tab 4: Connections */}
                    {userDetailTab === 'connections' && (
                      <div>
                        {(!selectedUser.connections || selectedUser.connections.length === 0) ? (
                          <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                            No social or YouTube OAuth channels linked by this user yet.
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {selectedUser.connections.map((conn: any) => (
                              <div key={conn.id} style={{ padding: '12px 16px', borderRadius: '8px', background: '#161d2d', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                  <div style={{ fontWeight: 700, color: '#fff' }}>{conn.platform}: {conn.channel_title || conn.account_email}</div>
                                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>Channel ID: {conn.channel_id || 'N/A'} • {conn.account_email}</div>
                                </div>
                                <span style={{ padding: '3px 8px', borderRadius: '4px', background: 'rgba(34,197,94,0.15)', color: '#4ade80', fontSize: '11px', fontWeight: 600 }}>
                                  CONNECTED
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: SYSTEM HEALTH & STATS                             */}
        {/* ======================================================== */}
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              {[
                { title: 'Video Engine', status: 'OPERATIONAL', sub: 'H.264 / AAC 1080p' },
                { title: 'FFmpeg Compositor', status: 'OPERATIONAL', sub: '30fps CFR Ultrafast' },
                { title: 'SQLite Database', status: 'OPERATIONAL', sub: 'WAL Mode Active' },
                { title: 'Neural TTS Synthesizer', status: 'OPERATIONAL', sub: 'Google / SAPI Stream' },
                { title: 'Stock Video Crawler', status: 'OPERATIONAL', sub: 'Coverr / Pexels / Pixabay' },
                { title: 'YouTube OAuth API', status: 'READY', sub: 'Resumable Chunked Upload' },
              ].map((srv, i) => (
                <div key={i} className="card" style={{ padding: '18px', borderRadius: '12px', background: '#0e131f', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#fff' }}>{srv.title}</span>
                    <span style={{ padding: '2px 8px', borderRadius: '4px', background: 'rgba(34,197,94,0.15)', color: '#4ade80', fontSize: '10px', fontWeight: 700 }}>
                      {srv.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>{srv.sub}</div>
                </div>
              ))}
            </div>

            {stats && (
              <div className="card" style={{ padding: '24px', borderRadius: '12px', background: '#0e131f', border: '1px solid rgba(255,255,255,0.08)' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#fff', marginBottom: '16px' }}>
                  Database Record Inventory & Storage Telemetry
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
                  <div style={{ padding: '14px', background: '#161b26', borderRadius: '8px' }}>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>Registered Users</div>
                    <div style={{ fontSize: '22px', fontWeight: 700, color: '#fff', fontFamily: 'monospace' }}>
                      {stats.counts?.users || stats.stats?.totalUsers || 0}
                    </div>
                  </div>
                  <div style={{ padding: '14px', background: '#161b26', borderRadius: '8px' }}>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>Total Video Projects</div>
                    <div style={{ fontSize: '22px', fontWeight: 700, color: '#fff', fontFamily: 'monospace' }}>
                      {stats.counts?.projects || stats.stats?.totalProjects || 0}
                    </div>
                  </div>
                  <div style={{ padding: '14px', background: '#161b26', borderRadius: '8px' }}>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>Channels Configured</div>
                    <div style={{ fontSize: '22px', fontWeight: 700, color: '#fff', fontFamily: 'monospace' }}>
                      {stats.counts?.channels || stats.stats?.totalChannels || 0}
                    </div>
                  </div>
                  <div style={{ padding: '14px', background: '#161b26', borderRadius: '8px' }}>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>Disk Storage Used</div>
                    <div style={{ fontSize: '22px', fontWeight: 700, color: '#38bdf8', fontFamily: 'monospace' }}>
                      {stats.counts?.storageMb || stats.stats?.storageMb || 0} MB
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: CHANNELS & PROJECTS                               */}
        {/* ======================================================== */}
        {activeTab === 'channels' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="card" style={{ padding: '20px', borderRadius: '12px', background: '#0e131f', border: '1px solid rgba(255,255,255,0.08)' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#fff', marginBottom: '14px' }}>
                All Configured Studio Channels ({stats?.channels?.length || 0})
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', textTransform: 'uppercase' }}>
                      <th style={{ padding: '10px' }}>Channel Name</th>
                      <th style={{ padding: '10px' }}>Niche</th>
                      <th style={{ padding: '10px' }}>Platform</th>
                      <th style={{ padding: '10px' }}>Duration</th>
                      <th style={{ padding: '10px' }}>Auto-Publish</th>
                      <th style={{ padding: '10px' }}>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(stats?.channels || []).map((ch: any) => (
                      <tr key={ch.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '10px', color: '#fff', fontWeight: 600 }}>{ch.name}</td>
                        <td style={{ padding: '10px', color: '#38bdf8' }}>{ch.niche}</td>
                        <td style={{ padding: '10px', color: '#cbd5e1' }}>{ch.publishing_platform}</td>
                        <td style={{ padding: '10px', color: '#94a3b8' }}>{ch.target_duration_minutes} min</td>
                        <td style={{ padding: '10px' }}>
                          <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '10px', background: ch.auto_publish ? 'rgba(34,197,94,0.15)' : 'rgba(148,163,184,0.1)', color: ch.auto_publish ? '#4ade80' : '#94a3b8' }}>
                            {ch.auto_publish ? 'ON' : 'OFF'}
                          </span>
                        </td>
                        <td style={{ padding: '10px', color: '#64748b' }}>
                          {ch.created_at ? new Date(ch.created_at).toLocaleDateString() : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card" style={{ padding: '20px', borderRadius: '12px', background: '#0e131f', border: '1px solid rgba(255,255,255,0.08)' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#fff', marginBottom: '14px' }}>
                Recent System Video Projects ({stats?.recentProjects?.length || 0})
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', textTransform: 'uppercase' }}>
                      <th style={{ padding: '10px' }}>Topic</th>
                      <th style={{ padding: '10px' }}>Channel</th>
                      <th style={{ padding: '10px' }}>Status</th>
                      <th style={{ padding: '10px' }}>Stage</th>
                      <th style={{ padding: '10px' }}>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(stats?.recentProjects || []).map((pj: any) => (
                      <tr key={pj.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '10px', color: '#fff', fontWeight: 600 }}>{pj.topic}</td>
                        <td style={{ padding: '10px', color: '#cbd5e1' }}>{pj.channel_name}</td>
                        <td style={{ padding: '10px' }}>
                          <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 600, background: pj.status === 'COMPLETED' ? 'rgba(34,197,94,0.15)' : 'rgba(234,179,8,0.15)', color: pj.status === 'COMPLETED' ? '#4ade80' : '#facc15' }}>
                            {pj.status}
                          </span>
                        </td>
                        <td style={{ padding: '10px', color: '#38bdf8' }}>{pj.current_stage}</td>
                        <td style={{ padding: '10px', color: '#64748b' }}>
                          {pj.created_at ? new Date(pj.created_at).toLocaleDateString() : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: API KEY VAULT                                     */}
        {/* ======================================================== */}
        {activeTab === 'keys' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#fff', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🧠</span> AI Language & Visual Synthesis
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  { id: 'gemini', name: 'Google Gemini AI', desc: 'Used for JSON script generation, scene planning & visual prompts' },
                  { id: 'openai', name: 'OpenAI (GPT-4o / GPT-3.5)', desc: 'Secondary AI engine for creative scripting & Copilot assistance' },
                  { id: 'cloudflare_api_token', name: 'Cloudflare Workers AI', desc: 'Flux-1-Schnell AI visual synthesis engine' },
                ].map((p) => {
                  const isConfigured = !!credentials[p.id];
                  return (
                    <div key={p.id} className="card" style={{ padding: '16px 20px', borderRadius: '12px', background: '#0e131f', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                      <div style={{ maxWidth: '440px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <strong style={{ fontSize: '13px', color: '#fff' }}>{p.name}</strong>
                          <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, background: isConfigured ? 'rgba(34,197,94,0.15)' : 'rgba(148,163,184,0.15)', color: isConfigured ? '#4ade80' : '#94a3b8' }}>
                            {isConfigured ? 'Configured' : 'Not Configured'}
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>{p.desc}</div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', width: '100%', maxWidth: '340px' }}>
                        <input
                          type="password"
                          placeholder="Enter API Key / Token"
                          defaultValue={credentials[p.id] || ''}
                          style={{ flex: 1, minWidth: '180px', fontSize: '12px', padding: '8px 12px', borderRadius: '6px', background: '#161b26', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                          onBlur={(e) => {
                            if (e.target.value && !e.target.value.includes('•••')) {
                              handleSaveKey(p.id, e.target.value.trim());
                            }
                          }}
                        />
                        <button
                          disabled={savingKey === p.id}
                          onClick={(e) => {
                            const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                            if (input && input.value && !input.value.includes('•••')) {
                              handleSaveKey(p.id, input.value.trim());
                            }
                          }}
                          style={{ padding: '8px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, background: '#1e293b', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)', cursor: 'pointer' }}
                        >
                          {savingKey === p.id ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <div style={{ marginBottom: '14px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#fff', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🎬</span> Generative AI Video Engines (Real-Time Text-to-Video)
                </h3>
                <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>
                  Autonomous Text-to-Video AI engines — 100% real-time AI generated motion video from screenplay prompts (No stock footage).
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  { id: 'veo', name: 'Google Veo 3.1 Video API', desc: 'Google DeepMind photorealistic 1080p generative video engine (Requires Pay-as-you-go Gemini key)' },
                  { id: 'fal', name: 'FAL.ai Video Engine (Wan 2.1 / Kling / LTX)', desc: 'Cloud GPU generative video models (Wan 2.1 14B, Kling 2.1, LTX-Video)' },
                  { id: 'runway', name: 'Runway Gen-3 / Gen-4 Alpha', desc: 'Hollywood-grade generative AI motion video synthesis engine' },
                  { id: 'sora', name: 'OpenAI Sora / Video Engine', desc: 'OpenAI photorealistic physics text-to-video generative AI' },
                  { id: 'luma', name: 'Luma Dream Machine (Ray 2)', desc: 'Cinematic camera motion and realistic physics text-to-video' },
                ].map((p) => {
                  const isConfigured = !!credentials[p.id];
                  return (
                    <div key={p.id} className="card" style={{ padding: '16px 20px', borderRadius: '12px', background: '#0e131f', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                      <div style={{ maxWidth: '440px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <strong style={{ fontSize: '13px', color: '#fff' }}>{p.name}</strong>
                          <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, background: isConfigured ? 'rgba(34,197,94,0.15)' : 'rgba(148,163,184,0.15)', color: isConfigured ? '#4ade80' : '#94a3b8' }}>
                            {isConfigured ? 'Configured' : 'Not Configured'}
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>{p.desc}</div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', width: '100%', maxWidth: '340px' }}>
                        <input
                          type="password"
                          placeholder="Enter API Key"
                          defaultValue={credentials[p.id] || ''}
                          style={{ flex: 1, minWidth: '180px', fontSize: '12px', padding: '8px 12px', borderRadius: '6px', background: '#161b26', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                          onBlur={(e) => {
                            if (e.target.value && !e.target.value.includes('•••')) {
                              handleSaveKey(p.id, e.target.value.trim());
                            }
                          }}
                        />
                        <button
                          disabled={savingKey === p.id}
                          onClick={(e) => {
                            const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                            if (input && input.value && !input.value.includes('•••')) {
                              handleSaveKey(p.id, input.value.trim());
                            }
                          }}
                          style={{ padding: '8px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, background: '#1e293b', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)', cursor: 'pointer' }}
                        >
                          {savingKey === p.id ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#fff', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🎙️</span> Neural Voice Synthesis
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  { id: 'elevenlabs', name: 'ElevenLabs Voice AI', desc: 'Ultra-realistic neural voice synthesis with voice cloning' },
                ].map((p) => {
                  const isConfigured = !!credentials[p.id];
                  return (
                    <div key={p.id} className="card" style={{ padding: '16px 20px', borderRadius: '12px', background: '#0e131f', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                      <div style={{ maxWidth: '440px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <strong style={{ fontSize: '13px', color: '#fff' }}>{p.name}</strong>
                          <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, background: isConfigured ? 'rgba(34,197,94,0.15)' : 'rgba(148,163,184,0.15)', color: isConfigured ? '#4ade80' : '#94a3b8' }}>
                            {isConfigured ? 'Configured' : 'Not Configured'}
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>{p.desc}</div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', width: '100%', maxWidth: '340px' }}>
                        <input
                          type="password"
                          placeholder="Enter API Key"
                          defaultValue={credentials[p.id] || ''}
                          style={{ flex: 1, minWidth: '180px', fontSize: '12px', padding: '8px 12px', borderRadius: '6px', background: '#161b26', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                          onBlur={(e) => {
                            if (e.target.value && !e.target.value.includes('•••')) {
                              handleSaveKey(p.id, e.target.value.trim());
                            }
                          }}
                        />
                        <button
                          disabled={savingKey === p.id}
                          onClick={(e) => {
                            const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                            if (input && input.value && !input.value.includes('•••')) {
                              handleSaveKey(p.id, input.value.trim());
                            }
                          }}
                          style={{ padding: '8px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, background: '#1e293b', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)', cursor: 'pointer' }}
                        >
                          {savingKey === p.id ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 5: ENGINE DIAGNOSTICS                                */}
        {/* ======================================================== */}
        {activeTab === 'diagnostics' && (
          <div className="card" style={{ padding: '24px', borderRadius: '12px', background: '#0e131f', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#fff', margin: 0 }}>Run Engine & FFmpeg Diagnostic Probe</h3>
                <p style={{ fontSize: '12px', color: '#94a3b8', margin: '4px 0 0' }}>Tests audio synthesis, stock video download, and 1080p FFmpeg pipeline integrity.</p>
              </div>

              <button
                onClick={handleRunDiagnostics}
                disabled={runningDiagnostics}
                style={{
                  padding: '9px 18px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {runningDiagnostics ? 'Probing Engine...' : 'Run Diagnostics'}
              </button>
            </div>

            {diagnosticsData && (
              <pre
                style={{
                  padding: '16px',
                  borderRadius: '8px',
                  background: '#000',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#38bdf8',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  overflowX: 'auto',
                  maxHeight: '400px',
                }}
              >
                {JSON.stringify(diagnosticsData, null, 2)}
              </pre>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
