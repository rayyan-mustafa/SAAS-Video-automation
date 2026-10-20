import { NextResponse } from 'next/server';
import { getSessionTokenFromRequest, destroySession, clearSessionCookie } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const token = getSessionTokenFromRequest(req);
    if (token) {
      destroySession(token);
    }
    const res = NextResponse.json({ success: true, message: 'Signed out successfully.' });
    clearSessionCookie(res);
    return res;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Logout failed' }, { status: 500 });
  }
}
