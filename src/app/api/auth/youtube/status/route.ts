import { NextResponse } from 'next/server';
import { youtubeProvider } from '@/lib/providers/youtubeProvider';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const status = await youtubeProvider.getConnectionStatus(user.id);
    return NextResponse.json(status);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to get connection status' }, { status: 500 });
  }
}

