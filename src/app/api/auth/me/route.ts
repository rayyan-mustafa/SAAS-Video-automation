import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getUserCredits } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ authenticated: false, user: null, credits: null });
    }

    const credits = getUserCredits(user.id);

    return NextResponse.json({
      authenticated: true,
      user,
      credits,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to get current user' }, { status: 500 });
  }
}
