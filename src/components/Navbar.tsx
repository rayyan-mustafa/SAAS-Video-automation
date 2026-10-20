'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Navbar() {
  const pathname = usePathname();

  // If on admin routes, do not render creator navbar
  if (pathname.startsWith('/admin')) {
    return null;
  }

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link href="/content" className="navbar-brand">
          <span className="brand-dot" />
          <span style={{ fontWeight: 800, letterSpacing: '0.04em' }}>AUTORA</span>
        </Link>
        <div className="navbar-links">
          <Link
            href="/channels"
            className={`nav-link ${pathname.startsWith('/channels') ? 'active' : ''}`}
          >
            Channels
          </Link>
          <Link
            href="/content"
            className={`nav-link ${pathname === '/content' || (pathname.startsWith('/content/') && pathname !== '/content/new') ? 'active' : ''}`}
          >
            Videos
          </Link>
          <Link
            href="/calendar"
            className={`nav-link ${pathname.startsWith('/calendar') ? 'active' : ''}`}
          >
            Calendar
          </Link>
          <Link
            href="/competitors"
            className={`nav-link ${pathname.startsWith('/competitors') ? 'active' : ''}`}
          >
            Competitors
          </Link>
          <Link
            href="/dashboard/personal-ai"
            className={`nav-link ${pathname.startsWith('/dashboard/personal-ai') ? 'active' : ''}`}
          >
            Personal AI
          </Link>
          <Link
            href="/settings/publishing"
            className={`nav-link ${pathname.startsWith('/settings') ? 'active' : ''}`}
          >
            YouTube Setup
          </Link>
          <Link href="/content/new" className="btn btn-primary btn-sm" style={{ marginLeft: '8px' }}>
            + Create Video
          </Link>
        </div>
      </div>
    </nav>
  );
}
