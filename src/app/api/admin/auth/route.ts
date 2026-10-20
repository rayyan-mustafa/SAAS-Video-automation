import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import { checkRateLimit, resetRateLimit, getClientIp } from '@/lib/security/rateLimit';

export const dynamic = 'force-dynamic';

import {
  signAdminToken,
  verifyAdminToken,
  getAdminConfig,
  ADMIN_COOKIE_NAME as COOKIE_NAME,
} from '@/lib/security/adminAuth';

export async function GET() {
  try {
    const config = getAdminConfig();
    const cookieStore = cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    const isAuthenticated = !!token && verifyAdminToken(token);

    return NextResponse.json({
      authenticated: isAuthenticated,
      user: isAuthenticated && config ? config.user : null,
      configured: !!config,
    });
  } catch (err: any) {
    return NextResponse.json({ authenticated: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    const rateCheck = checkRateLimit(`admin_auth_${clientIp}`, 5, 15 * 60 * 1000);

    if (rateCheck.limited) {
      const waitMinutes = Math.max(1, Math.ceil(rateCheck.resetMs / 60000));
      return NextResponse.json(
        {
          success: false,
          error: `Too many failed admin login attempts. Account locked for this IP. Try again in ${waitMinutes} minute(s).`,
        },
        { status: 429 }
      );
    }

    const config = getAdminConfig();
    if (!config) {
      return NextResponse.json(
        {
          success: false,
          error: 'FATAL SECURITY GUARD: Admin authentication environment variables (ADMIN_USER, ADMIN_PASSWORD, ADMIN_SECRET) are not configured.',
        },
        { status: 503 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { password, username } = body;

    const providedPassword = (password || '').trim();
    const providedUser = (username || '').trim();

    const isUserMatch = !providedUser || providedUser.toLowerCase() === config.user.toLowerCase();
    const isPassMatch = providedPassword.length > 0 && providedPassword === config.pass;

    if (isUserMatch && isPassMatch) {
      // Reset rate limit on success
      resetRateLimit(`admin_auth_${clientIp}`);

      const signedToken = signAdminToken(config.user);
      const response = NextResponse.json({
        success: true,
        message: 'Admin authentication successful',
        user: config.user,
      });

      response.cookies.set(COOKIE_NAME, signedToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
      });

      return response;
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Invalid admin username or password.',
        attemptsRemaining: rateCheck.remaining,
      },
      { status: 401 }
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Login failed' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const response = NextResponse.json({ success: true, message: 'Admin logged out' });
    response.cookies.set(COOKIE_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });
    return response;
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
