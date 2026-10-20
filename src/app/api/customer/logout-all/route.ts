import { NextResponse } from 'next/server';
import { getCurrentUser, destroyAllUserSessions, clearSessionCookie } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    destroyAllUserSessions(user.id);
    const res = NextResponse.json({ success: true, message: 'All sessions logged out successfully.' });
    clearSessionCookie(res);
    return res;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Logout all failed' }, { status: 500 });
  }
}
