import { NextResponse } from 'next/server';
import { getSessionTokenFromRequest, destroySession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const token = getSessionTokenFromRequest(req);
    if (token) {
      destroySession(token);
    }

    const res = NextResponse.json({ success: true, message: 'Signed out successfully.' });
    res.cookies.set('auth_session_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });

    return res;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Logout failed' }, { status: 500 });
  }
}
