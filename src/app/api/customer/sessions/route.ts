import { NextResponse } from 'next/server';
import { getCurrentUser, listUserSessions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const sessions = listUserSessions(user.id);
    return NextResponse.json({
      success: true,
      sessions,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to list sessions' }, { status: 500 });
  }
}
