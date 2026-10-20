import { NextResponse } from 'next/server';
import { youtubeProvider } from '@/lib/providers/youtubeProvider';
import { getCurrentUser } from '@/lib/auth';
import { verifyOAuthState } from '@/lib/security/oauth-state';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect(new URL(`/settings/publishing?error=${encodeURIComponent(error)}`, request.url));
    }

    if (!code) {
      return NextResponse.redirect(new URL('/settings/publishing?error=Missing+authorization+code', request.url));
    }

    if (!state) {
      return NextResponse.redirect(new URL('/settings/publishing?error=Missing+OAuth+state+token', request.url));
    }

    const currentUser = await getCurrentUser(request);

    // Cryptographically verify state, freshness, signature, and user binding
    const stateVerification = verifyOAuthState(state, currentUser?.id);
    if (!stateVerification.valid || !stateVerification.userId) {
      console.warn('[YouTube Callback] Invalid OAuth state rejected:', stateVerification.error);
      return NextResponse.redirect(
        new URL(`/settings/publishing?error=${encodeURIComponent(stateVerification.error || 'Invalid or expired state')}`, request.url)
      );
    }

    const targetUserId = stateVerification.userId;
    const result = await youtubeProvider.handleOAuthCallback(code, targetUserId);

    if (!result.success) {
      return NextResponse.redirect(new URL(`/settings/publishing?error=${encodeURIComponent(result.error || 'Authentication failed')}`, request.url));
    }

    return NextResponse.redirect(new URL('/settings/publishing?connected=true', request.url));
  } catch (err: any) {
    return NextResponse.redirect(new URL(`/settings/publishing?error=${encodeURIComponent(err.message || 'OAuth error')}`, request.url));
  }
}
