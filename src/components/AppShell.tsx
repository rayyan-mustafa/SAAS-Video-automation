'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [credits, setCredits] = useState<any>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showTopbarUserMenu, setShowTopbarUserMenu] = useState(false);

  // Check if current route is an unauthenticated auth page, dedicated admin portal, or public landing page
  const isStandalonePage = ['/landing', '/login', '/signup', '/forgot-password', '/reset-password', '/verify-email', '/onboarding', '/admin'].some(
    (p) => pathname === p || pathname?.startsWith(p + '/')
  ) || (pathname === '/' && !currentUser);

  // Close menus on route change
  useEffect(() => {
    setMobileOpen(false);
    setShowUserMenu(false);
    setShowTopbarUserMenu(false);
    setShowNotifications(false);
  }, [pathname]);

  const [channels, setChannels] = useState<any[]>([]);

  // Fetch current user, credits & channels
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const [userRes, chanRes] = await Promise.all([
          fetch('/api/auth/me'),
          fetch('/api/channels'),
        ]);
        if (userRes.ok) {
          const data = await userRes.json();
          if (data.authenticated && data.user) {
            setCurrentUser(data.user);
            setCredits(data.credits);
          }
        }
        if (chanRes.ok) {
          const chanData = await chanRes.json();
          setChannels(chanData.channels || []);
        }
      } catch {}
    };
    fetchUserData();
  }, [pathname]);

  if (isStandalonePage) {
    return <>{children}</>;
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const mainNavItems = [
    {
      label: 'Dashboard',
      href: '/',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
        </svg>
      ),
    },
    {
      label: 'Content Library',
      href: '/content',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <polygon points="10 8 16 12 10 16 10 8" />
        </svg>
      ),
    },
    {
      label: 'Generators',
      href: '/content/new',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 4V2m0 16v-2m8-7h-2M4 11H2m15.5 6.5l-1.5-1.5M6 6L4.5 4.5m13 0l-1.5 1.5M6 16.5l-1.5 1.5" />
          <polygon points="12 2 15 8 21 9 17 14 18 20 12 17 6 20 7 14 3 9 9 8 12 2" />
        </svg>
      ),
    },
    {
      label: 'Personal AI',
      href: '/dashboard/personal-ai',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="7" r="4" />
          <path d="M5.5 21v-2a6.5 6.5 0 0 1 13 0v2" />
        </svg>
      ),
    },
    {
      label: 'Workflow Engine',
      href: '/workflow',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
      ),
    },
    {
      label: 'Analytics',
      href: '/analytics',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      ),
    },
    {
      label: 'Schedule',
      href: '/calendar',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      ),
    },
    {
      label: 'Competitors',
      href: '/competitors',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
        </svg>
      ),
    },
    {
      label: 'SEO Blog',
      href: '/blog',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
      ),
    },
  ];


  const accountNavItems = [
    {
      label: 'Settings',
      href: '/settings',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      ),
    },
  ];

  const isStudioPage = Boolean(
    (pathname?.startsWith('/content/') && pathname !== '/content' && pathname !== '/content/new') ||
    pathname === '/workflow'
  );

  return (
    <div className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            zIndex: 35,
            backdropFilter: 'blur(4px)',
          }}
        />
      )}

      {/* ─────────────────────────────────────────────────────────────
          SIDEBAR NAVIGATION
      ───────────────────────────────────────────────────────────── */}
      {/* ─────────────────────────────────────────────────────────────
          SIDEBAR NAVIGATION (AUTORA)
      ───────────────────────────────────────────────────────────── */}
      <aside className={`sidebar ${collapsed ? 'collapsed sidebar-collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`} style={{ backgroundColor: '#090a0d', borderRight: '1px solid rgba(255, 255, 255, 0.07)' }}>
        <div className="sidebar-header" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <Link href="/" className="sidebar-brand brand-logo" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <div className="logo-icon" style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              background: 'linear-gradient(135deg, #7928CA, #00F0FF)',
              color: '#ffffff',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0, 240, 255, 0.2)',
              flexShrink: 0
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                <polygon points="10 8 16 12 10 16 10 8" fill="currentColor"></polygon>
              </svg>
            </div>
            {!collapsed && (
              <span className="logo-text" style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.5px' }}>
                Auto<span className="highlight" style={{ color: '#00F0FF' }}>RA</span>
              </span>
            )}
          </Link>

          <button
            onClick={() => {
              if (window.innerWidth <= 1024) {
                setMobileOpen(false);
              } else {
                setCollapsed(!collapsed);
              }
            }}
            className="btn btn-ghost btn-icon"
            style={{ width: '28px', height: '28px', color: 'var(--text-muted)' }}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {mobileOpen ? (
                <path d="M18 6L6 18M6 6l12 12" />
              ) : collapsed ? (
                <polyline points="9 18 15 12 9 6" />
              ) : (
                <polyline points="15 18 9 12 15 6" />
              )}
            </svg>
          </button>
        </div>

        <div className="sidebar-nav" style={{ padding: '16px 10px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
          {/* MAIN NAV (flat list matching reference) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {mainNavItems.map((item, idx) => {
              const isActive = item.href === '/'
                ? pathname === '/'
                : pathname === item.href || pathname?.startsWith(item.href + '/') || pathname?.startsWith(item.href);
              return (
                <Link
                  key={idx}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? '#ffffff' : '#9ca3af',
                    background: isActive ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                    border: isActive ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid transparent',
                    transition: 'all 0.15s ease',
                    textDecoration: 'none'
                  }}
                  title={collapsed && !mobileOpen ? item.label : undefined}
                >
                  <span style={{ color: isActive ? '#ffffff' : '#71717a' }}>{item.icon}</span>
                  {(!collapsed || mobileOpen) && <span>{item.label}</span>}
                </Link>
              );
            })}
          </div>

          {/* 3. WORKFLOWS SECTION */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {(!collapsed || mobileOpen) && (
              <div style={{
                fontSize: '10px',
                fontWeight: 800,
                color: '#52525b',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                padding: '4px 12px 6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <span>WORKFLOWS</span>
                <Link href="/workflow" style={{ color: '#60a5fa', textDecoration: 'none', fontSize: '11px', fontWeight: 600 }}>
                  + New
                </Link>
              </div>
            )}
            {channels.length > 0 ? (
              channels.map((chan, idx) => (
                <Link
                  key={chan.id || idx}
                  href="/workflow"
                  onClick={() => setMobileOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    color: '#9ca3af',
                    textDecoration: 'none',
                    transition: 'background 0.15s ease'
                  }}
                  title={collapsed && !mobileOpen ? chan.name : undefined}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                    <span style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: '#22c55e',
                      boxShadow: '0 0 6px #22c55e',
                      flexShrink: 0,
                    }} />
                    {(!collapsed || mobileOpen) && (
                      <span style={{ color: '#d1d5db', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {chan.name}
                      </span>
                    )}
                  </div>
                  {(!collapsed || mobileOpen) && (
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 600,
                      color: '#22c55e',
                      background: 'rgba(34, 197, 94, 0.1)',
                      border: '1px solid rgba(34, 197, 94, 0.2)',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      flexShrink: 0,
                    }}>
                      Active
                    </span>
                  )}
                </Link>
              ))
            ) : (!collapsed || mobileOpen) ? (
              <div style={{ padding: '6px 12px', fontSize: '12px', color: '#71717a' }}>
                No active workflows yet.
              </div>
            ) : null}

            {/* Quick Templates Link */}
            <Link
              href="/templates"
              onClick={() => setMobileOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderRadius: '8px',
                fontSize: '13px',
                color: '#9ca3af',
                textDecoration: 'none',
                transition: 'background 0.15s ease'
              }}
              title={collapsed && !mobileOpen ? 'Starter Templates' : undefined}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: '#a855f7',
                  boxShadow: '0 0 6px rgba(168, 85, 247, 0.6)',
                  flexShrink: 0,
                }} />
                {(!collapsed || mobileOpen) && <span style={{ color: '#c084fc' }}>Starter Templates</span>}
              </div>
              {(!collapsed || mobileOpen) && (
                <span style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  color: '#c084fc',
                  background: 'rgba(168, 85, 247, 0.1)',
                  border: '1px solid rgba(168, 85, 247, 0.2)',
                  padding: '2px 8px',
                  borderRadius: '4px'
                }}>
                  Browse
                </span>
              )}
            </Link>
          </div>

          {/* 4. ACCOUNT SECTION */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {(!collapsed || mobileOpen) && (
              <div style={{
                fontSize: '10px',
                fontWeight: 800,
                color: '#52525b',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                padding: '4px 12px 6px',
              }}>
                ACCOUNT
              </div>
            )}
            {accountNavItems.map((item, idx) => {
              const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));
              return (
                <Link
                  key={idx}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? '#ffffff' : '#9ca3af',
                    background: isActive ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                    border: isActive ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid transparent',
                    transition: 'all 0.15s ease',
                    textDecoration: 'none'
                  }}
                  title={collapsed && !mobileOpen ? item.label : undefined}
                >
                  <span style={{ color: isActive ? '#ffffff' : '#71717a' }}>{item.icon}</span>
                  {(!collapsed || mobileOpen) && <span>{item.label}</span>}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="sidebar-footer" style={{ position: 'relative', borderTop: '1px solid rgba(255, 255, 255, 0.06)', padding: '12px' }}>
          {/* User popup menu when clicked */}
          {showUserMenu && (
            <div
              style={{
                position: 'absolute',
                bottom: 'calc(100% + 8px)',
                left: '10px',
                right: '10px',
                background: '#111215',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '10px',
                padding: '10px',
                boxShadow: '0 -8px 24px rgba(0,0,0,0.6)',
                zIndex: 60,
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <div style={{ padding: '6px 8px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>{currentUser?.name || 'Creator'}</div>
                <div style={{ fontSize: '11px', color: '#71717a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {currentUser?.email || ''}
                </div>
              </div>
              <Link
                href="/settings"
                onClick={() => setShowUserMenu(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '7px 8px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: '#d1d5db',
                  textDecoration: 'none',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
                <span>Settings</span>
              </Link>
              <button
                type="button"
                onClick={() => { setShowUserMenu(false); handleLogout(); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '7px 8px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: '#ef4444',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                <span style={{ fontWeight: 600 }}>Sign Out</span>
              </button>
            </div>
          )}

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '6px 4px',
            borderRadius: '8px',
          }}>
            <div
              onClick={() => setShowUserMenu(!showUserMenu)}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, cursor: 'pointer', flex: 1 }}
              title={currentUser?.email || currentUser?.name || 'Account'}
            >
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: '#27272a',
                color: '#e4e4e7',
                fontSize: '12px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                flexShrink: 0,
              }}>
                {currentUser?.name ? currentUser.name.split(' ').filter(Boolean).map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : 'CR'}
              </div>
              {(!collapsed || mobileOpen) && (
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {currentUser?.name || 'Creator'}
                  </span>
                  <span style={{ fontSize: '11px', color: '#71717a' }}>
                    {credits?.tier ? `${credits.tier.charAt(0).toUpperCase() + credits.tier.slice(1).toLowerCase()} Plan` : 'Creator Plan'}
                  </span>
                </div>
              )}
            </div>

            {(!collapsed || mobileOpen) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Link
                  href="/settings"
                  style={{
                    color: '#71717a',
                    padding: '6px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'color 0.15s ease'
                  }}
                  title="Settings"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09A1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                </Link>

                <button
                  onClick={handleLogout}
                  title="Sign out"
                  style={{
                    color: '#71717a',
                    padding: '6px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'color 0.15s ease',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#71717a')}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                </button>
              </div>
            )}

            {/* Collapsed sidebar: show logout icon only */}
            {collapsed && !mobileOpen && (
              <button
                onClick={handleLogout}
                title="Sign out"
                style={{
                  color: '#71717a',
                  padding: '6px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'color 0.15s ease',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                onMouseLeave={e => (e.currentTarget.style.color = '#71717a')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* ─────────────────────────────────────────────────────────────
          MAIN WRAPPER & TOPBAR (AUTORA)
      ───────────────────────────────────────────────────────────── */}
      <div className="main-wrapper">
        <header className="topbar" style={{ backgroundColor: 'rgba(9, 10, 13, 0.85)', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="btn btn-ghost btn-icon mobile-menu-btn"
              title="Open mobile menu"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>

            {/* Breadcrumbs matching AUTORA */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
              <span style={{ color: '#71717a' }}>Dashboard</span>
              <span style={{ color: '#3f3f46' }}>›</span>
              <span style={{ color: '#ffffff', fontWeight: 600 }}>
                {pathname === '/' ? 'Overview'
                  : pathname === '/workflow' ? 'Workflow'
                  : pathname === '/content' ? 'Content Library'
                  : pathname === '/content/new' ? 'Generator'
                  : pathname === '/analytics' ? 'Analytics'
                  : pathname === '/calendar' ? 'Schedule'
                  : pathname === '/settings' ? 'Settings'
                  : pathname?.startsWith('/dashboard/personal-ai') ? 'Personal AI'
                  : pathname?.replace('/', '').charAt(0).toUpperCase() + (pathname?.slice(2) || '')}
              </span>
            </div>
          </div>

          <div className="topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="btn btn-ghost btn-icon"
                style={{ position: 'relative', color: '#a1a1aa' }}
                title="Notifications"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
              </button>

              {showNotifications && (
                <div
                  className="card"
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 'calc(100% + 8px)',
                    width: '320px',
                    maxWidth: 'calc(100vw - 32px)',
                    maxHeight: '80vh',
                    overflowY: 'auto',
                    padding: '16px',
                    background: '#111215',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
                    zIndex: 50,
                    borderRadius: '12px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>Notifications</span>
                    <span style={{ fontSize: '11px', color: '#818cf8', fontWeight: 600, cursor: 'pointer' }} onClick={() => setShowNotifications(false)}>Mark all read</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ padding: '10px 12px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px', fontSize: '12px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <p style={{ fontWeight: 600, color: '#fff', marginBottom: '2px' }}>AI Video Engine Online</p>
                      <p style={{ color: '#71717a' }}>1080p FFmpeg Compositor & Neural TTS ready.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Create Button */}
            <button
              type="button"
              onClick={() => {
                if (pathname === '/') {
                  const inputEl = document.getElementById('creator-topic-input');
                  if (inputEl) {
                    inputEl.focus();
                    inputEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }
                } else {
                  router.push('/?create=1');
                }
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: '#ffffff',
                color: '#09090b',
                padding: '7px 16px',
                borderRadius: '9999px',
                fontSize: '13px',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: '0 1px 4px rgba(0,0,0,0.4)'
              }}
              aria-label="Create a new video"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Create Short</span>
            </button>

            {/* Topbar User Profile Button & Dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setShowTopbarUserMenu(!showTopbarUserMenu)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: '#27272a',
                  color: '#e4e4e7',
                  fontSize: '12px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                title={currentUser?.name || 'Account'}
              >
                {currentUser?.name ? currentUser.name.split(' ').filter(Boolean).map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : 'CR'}
              </button>

              {showTopbarUserMenu && (
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 'calc(100% + 8px)',
                    width: '220px',
                    maxWidth: 'calc(100vw - 32px)',
                    maxHeight: '80vh',
                    overflowY: 'auto',
                    padding: '12px',
                    background: '#111215',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
                    zIndex: 50,
                    borderRadius: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  <div style={{ padding: '4px 6px 8px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>{currentUser?.name || 'Creator'}</div>
                    <div style={{ fontSize: '11px', color: '#71717a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {currentUser?.email || ''}
                    </div>
                  </div>
                  <Link
                    href="/settings"
                    onClick={() => setShowTopbarUserMenu(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      color: '#d1d5db',
                      textDecoration: 'none',
                      marginTop: '4px',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                    </svg>
                    <span>Settings</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => { setShowTopbarUserMenu(false); handleLogout(); }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      color: '#ef4444',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      width: '100%',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    <span style={{ fontWeight: 600 }}>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main 
          className={`content-container ${isStudioPage ? 'studio-main-container' : ''}`}
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 20px) + 20px)' }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
