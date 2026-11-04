import { NextRequest, NextResponse } from 'next/server';
import { generateOAuthState } from '@/lib/security/oauth-state';

export const dynamic = 'force-dynamic';

function getAppUrl(req: NextRequest): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, '');
  }
  const host = req.headers.get('host') || 'localhost:3000';
  const proto = req.headers.get('x-forwarded-proto') || 'http';
  return `${proto}://${host}`;
}

function sanitizeRedirect(from: string | null): string {
  if (!from) return '/dashboard';
  if (from.startsWith('/') && !from.startsWith('//') && !from.startsWith('/\\')) {
    return from;
  }
  return '/dashboard';
}

export async function GET(req: NextRequest) {
  const from = sanitizeRedirect(req.nextUrl.searchParams.get('from'));
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.YOUTUBE_CLIENT_ID;

  if (!clientId) {
    // Helpful developer message when keys are not configured yet
    const errorUrl = new URL('/login', req.url);
    errorUrl.searchParams.set('error', 'Google OAuth is not configured. Please add GOOGLE_CLIENT_ID to your .env file.');
    return NextResponse.redirect(errorUrl);
  }

  const appUrl = getAppUrl(req);
  const redirectUri = `${appUrl}/api/auth/google/callback`;
  const stateToken = generateOAuthState('guest', { from });

  const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  googleAuthUrl.searchParams.set('client_id', clientId);
  googleAuthUrl.searchParams.set('redirect_uri', redirectUri);
  googleAuthUrl.searchParams.set('response_type', 'code');
  googleAuthUrl.searchParams.set('scope', 'openid email profile');
  googleAuthUrl.searchParams.set('state', stateToken);
  googleAuthUrl.searchParams.set('prompt', 'select_account');
  googleAuthUrl.searchParams.set('access_type', 'online');

  return NextResponse.redirect(googleAuthUrl.toString());
}
