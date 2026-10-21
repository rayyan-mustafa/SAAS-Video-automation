import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import { signAdminToken, verifyAdminToken } from '@/lib/security/adminAuth';
import { checkRateLimit } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const COOKIE_NAME = 'admin_session_token';

export async function GET() {
  try {
    const configuredUser = (process.env.ADMIN_USER || '').trim();
    const cookieStore = cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    const isAuthenticated = !!token && verifyAdminToken(token);

    return NextResponse.json({
      authenticated: isAuthenticated,
      user: isAuthenticated ? (configuredUser || 'admin') : null,
    });
  } catch (err: any) {
    return NextResponse.json({ authenticated: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
    const rateLimit = checkRateLimit(`admin_login_${ip}`, 5, 5 * 60 * 1000); // 5 attempts per 5 mins
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many admin login attempts. Temporarily locked out for 5 minutes.' },
        { status: 429 }
      );
    }

    const configuredPassword = (process.env.ADMIN_PASSWORD || '').trim();
    const configuredUser = (process.env.ADMIN_USER || '').trim();

    if (!configuredPassword || !configuredUser) {
      return NextResponse.json(
        { success: false, error: 'Admin access is disabled: ADMIN_USER and ADMIN_PASSWORD must be configured in environment.' },
        { status: 503 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { password, username } = body;

    const providedPassword = (password || '').trim();
    const providedUser = (username || '').trim();

    if (!providedUser || !providedPassword) {
      return NextResponse.json(
        { success: false, error: 'Both username and password are required.' },
        { status: 400 }
      );
    }

    const isUserMatch =
      providedUser.length === configuredUser.length &&
      crypto.timingSafeEqual(
        Buffer.from(providedUser.toLowerCase()),
        Buffer.from(configuredUser.toLowerCase())
      );

    const isPassMatch =
      providedPassword.length === configuredPassword.length &&
      crypto.timingSafeEqual(Buffer.from(providedPassword), Buffer.from(configuredPassword));

    if (isUserMatch && isPassMatch) {
      const signedToken = signAdminToken(configuredUser);
      const response = NextResponse.json({
        success: true,
        message: 'Admin authentication successful',
        user: configuredUser,
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
      { success: false, error: 'Invalid admin username or password.' },
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

