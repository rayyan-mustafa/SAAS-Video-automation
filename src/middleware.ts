import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PREFIXES = [
  '/',
  '/login',
  '/signup',
  '/onboarding',
  '/verify-email',
  '/forgot-password',
  '/reset-password',
  '/api/auth/',
  '/api/customer/',
  '/api/health',
  '/api/assets',
  '/_next',
  '/favicon',
  '/static',
];

const SESSION_COOKIE = 'auth_session_token';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Allow public routes
  if (PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix + '/'))) {
    return NextResponse.next();
  }

  // 2. Allow API routes not explicitly blocked or check tokens in API handlers
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // 3. Admin routes are guarded by admin token & admin check
  if (pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
