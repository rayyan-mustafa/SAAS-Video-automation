import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { createSession, setSessionCookie, getUserIdFromEmail, getEmailSalt } from '@/lib/auth';
import { verifyOAuthState } from '@/lib/security/oauth-state';

export const dynamic = 'force-dynamic';

function getAppUrl(req: NextRequest): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, '');
  }
  const host = req.headers.get('host') || 'localhost:3000';
  const proto = req.headers.get('x-forwarded-proto') || 'http';
  return `${proto}://${host}`;
}

function sanitizeRedirect(from: string | undefined | null): string {
  if (!from) return '/dashboard';
  if (from.startsWith('/') && !from.startsWith('//') && !from.startsWith('/\\')) {
    return from;
  }
  return '/dashboard';
}

export async function GET(req: NextRequest) {
  const appUrl = getAppUrl(req);
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const errorParam = searchParams.get('error');

  if (errorParam) {
    const loginUrl = new URL('/login', appUrl);
    loginUrl.searchParams.set('error', 'Google sign-in was canceled or denied.');
    return NextResponse.redirect(loginUrl);
  }

  if (!code || !state) {
    const loginUrl = new URL('/login', appUrl);
    loginUrl.searchParams.set('error', 'Missing authorization code or state token.');
    return NextResponse.redirect(loginUrl);
  }

  // 1. Verify cryptographic OAuth state token
  const stateResult = verifyOAuthState(state);
  if (!stateResult.valid) {
    const loginUrl = new URL('/login', appUrl);
    loginUrl.searchParams.set('error', stateResult.error || 'Invalid or expired state. Please try again.');
    return NextResponse.redirect(loginUrl);
  }

  const destination = sanitizeRedirect(stateResult.metadata?.from);
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.YOUTUBE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    const loginUrl = new URL('/login', appUrl);
    loginUrl.searchParams.set('error', 'Google OAuth credentials not configured on server.');
    return NextResponse.redirect(loginUrl);
  }

  const redirectUri = `${appUrl}/api/auth/google/callback`;

  try {
    // 2. Exchange code for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errBody = await tokenResponse.text();
      console.error('Google token exchange error:', errBody);
      const loginUrl = new URL('/login', appUrl);
      loginUrl.searchParams.set('error', 'Failed to authenticate with Google. Please try again.');
      return NextResponse.redirect(loginUrl);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // 3. Fetch Google user profile
    const userinfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userinfoResponse.ok) {
      const loginUrl = new URL('/login', appUrl);
      loginUrl.searchParams.set('error', 'Failed to fetch user profile from Google.');
      return NextResponse.redirect(loginUrl);
    }

    const profile = await userinfoResponse.json();
    const email = profile.email ? profile.email.toLowerCase().trim() : null;
    const name = profile.name || 'Creator';
    const avatar = profile.picture || null;

    if (!email) {
      const loginUrl = new URL('/login', appUrl);
      loginUrl.searchParams.set('error', 'Google account does not have a verified email address.');
      return NextResponse.redirect(loginUrl);
    }

    const db = getDb();
    const now = new Date().toISOString();

    // 4. Find or Create User
    let user = db.prepare('SELECT id, email, name, avatar FROM users WHERE email = ?').get(email) as any;
    let userId: string;

    if (user) {
      userId = user.id;
      // Update avatar/name and ensure verified
      db.prepare(`
        UPDATE users
        SET avatar = COALESCE(?, avatar),
            name = COALESCE(name, ?),
            email_verified = 1,
            updated_at = ?
        WHERE id = ?
      `).run(avatar, name, now, userId);
    } else {
      userId = getUserIdFromEmail(email);
      const salt = getEmailSalt(email);
      // Create user record
      db.prepare(`
        INSERT OR REPLACE INTO users (
          id, email, password_hash, salt, name, avatar,
          email_verified, role, status, onboarding_completed, created_at, updated_at
        ) VALUES (?, ?, '', ?, ?, ?, 1, 'CUSTOMER', 'ACTIVE', 1, ?, ?)
      `).run(userId, email, salt, name, avatar, now, now);

      // Initialize credits (25 starter credits for 1 free video)
      db.prepare(`
        INSERT OR REPLACE INTO user_credits (
          user_id, balance, tier, subscription_status, monthly_allowance, renews_at, updated_at
        ) VALUES (?, 25, 'FREE', 'DEMO', 0, ?, ?)
      `).run(userId, new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(), now);
    }

    // 5. Create secure session
    const userAgent = req.headers.get('user-agent') || undefined;
    const ip = req.headers.get('x-forwarded-for') || undefined;
    const { sessionToken, expiresAt } = createSession(userId, userAgent, ip);

    // 6. Redirect to destination with session cookie
    const targetUrl = new URL(destination, appUrl);
    const response = NextResponse.redirect(targetUrl);
    setSessionCookie(response, sessionToken, expiresAt);
    return response;
  } catch (err: any) {
    console.error('Google OAuth callback unexpected error:', err);
    const loginUrl = new URL('/login', appUrl);
    loginUrl.searchParams.set('error', 'An unexpected error occurred during Google sign-in.');
    return NextResponse.redirect(loginUrl);
  }
}
