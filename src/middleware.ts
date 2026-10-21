import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_EXACT = ['/', '/landing'];
const PUBLIC_PREFIXES = [
  '/login',
  '/signup',
  '/onboarding',
  '/verify-email',
  '/forgot-password',
  '/reset-password',
  '/blog',
  '/api/auth',
  '/api/customer',
  '/api/health',
  '/api/assets',
  '/_next',
  '/favicon',
  '/static',
];

const SESSION_COOKIE = 'auth_session_token';
const ADMIN_SESSION_COOKIE = 'admin_session_token';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Allow public exact roots & prefixes
  if (PUBLIC_EXACT.includes(pathname)) {
    return NextResponse.next();
  }

  if (PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix + '/'))) {
    return NextResponse.next();
  }

  // 2. Allow API routes not explicitly handled by middleware (API routes self-authenticate)
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // 3. Admin routes are guarded by admin token
  if (pathname.startsWith('/admin')) {
    if (pathname === '/admin/login' || pathname.startsWith('/admin/auth')) {
      return NextResponse.next();
    }
    const adminToken = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    if (!adminToken) {
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // 4. All other app routes (/dashboard, /content, /channels, /analytics, /settings, etc.) require customer session
  const sessionToken = request.cookies.get(SESSION_COOKIE)?.value;
  if (!sessionToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
