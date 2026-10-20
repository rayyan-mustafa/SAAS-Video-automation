import { NextResponse } from 'next/server';
import { youtubeProvider } from '@/lib/providers/youtubeProvider';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    await youtubeProvider.disconnect(user.id);
    return NextResponse.json({ success: true, message: 'YouTube account disconnected.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to disconnect' }, { status: 500 });
  }
}

