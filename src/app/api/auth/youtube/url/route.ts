import { NextResponse } from 'next/server';
import { youtubeProvider } from '@/lib/providers/youtubeProvider';
import { getCurrentUser } from '@/lib/auth';
import { generateOAuthState } from '@/lib/security/oauth-state';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const stateToken = generateOAuthState(user.id);
    const authUrl = youtubeProvider.getAuthUrl(stateToken);
    return NextResponse.json({ authUrl, configured: !!authUrl });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to generate auth URL' }, { status: 500 });
  }
}

