import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAllApiCredentials, saveApiKey, DEFAULT_USER_ID } from '@/lib/db';
import { verifyAdminToken } from '@/lib/security/adminAuth';
import { IntegrationService } from '@/lib/config/integrationService';

export const dynamic = 'force-dynamic';

function checkAdminAuth(): boolean {
  const cookieStore = cookies();
  const token = cookieStore.get('admin_session_token')?.value;
  return !!token && verifyAdminToken(token);
}

export async function GET() {
  try {
    if (!checkAdminAuth()) {
      return NextResponse.json({ error: 'Unauthorized: Admin authentication required.' }, { status: 401 });
    }

    const keys = getAllApiCredentials(DEFAULT_USER_ID);
    return NextResponse.json({ success: true, credentials: keys });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch API credentials' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!checkAdminAuth()) {
      return NextResponse.json({ error: 'Unauthorized: Admin authentication required.' }, { status: 401 });
    }

    const body = await request.json();
    const {
      provider,
      key,
      geminiKey,
      openAiKey,
      cloudflareAccountId,
      cloudflareApiToken,
      pexelsKey,
      pixabayKey,
      elevenLabsKey,
      runwayKey,
      replicateToken,
      falKey,
    } = body;

    const updates: Array<{ provider: string; key: string }> = [];
    if (provider && key !== undefined) updates.push({ provider, key });
    if (geminiKey !== undefined) updates.push({ provider: 'gemini', key: geminiKey });
    if (openAiKey !== undefined) updates.push({ provider: 'openai', key: openAiKey });
    if (cloudflareAccountId !== undefined) updates.push({ provider: 'cloudflare_account_id', key: cloudflareAccountId });
    if (cloudflareApiToken !== undefined) updates.push({ provider: 'cloudflare_api_token', key: cloudflareApiToken });
    if (pexelsKey !== undefined) updates.push({ provider: 'pexels', key: pexelsKey });
    if (pixabayKey !== undefined) updates.push({ provider: 'pixabay', key: pixabayKey });
    if (elevenLabsKey !== undefined) updates.push({ provider: 'elevenlabs', key: elevenLabsKey });
    if (runwayKey !== undefined) updates.push({ provider: 'runway', key: runwayKey });
    if (replicateToken !== undefined) updates.push({ provider: 'replicate', key: replicateToken });
    if (falKey !== undefined) updates.push({ provider: 'fal', key: falKey });

    const results: Record<string, boolean> = {};
    for (const update of updates) {
      if (!update.key.includes('****') && !update.key.includes('••••')) {
        const success = saveApiKey(update.provider, update.key, DEFAULT_USER_ID);
        results[update.provider] = success;

        // Also sync to IntegrationService for central AES-256-GCM encrypted persistence
        try {
          if (update.provider === 'cloudflare_api_token') {
            IntegrationService.saveIntegration('cloudflare', { credentials: { apiToken: update.key } }, 'admin');
          } else if (update.provider === 'cloudflare_account_id') {
            IntegrationService.saveIntegration('cloudflare', { credentials: { accountId: update.key } }, 'admin');
          } else {
            IntegrationService.saveIntegration(update.provider, { credentials: { apiKey: update.key } }, 'admin');
          }
        } catch {}
      }
    }

    const updatedCredentials = getAllApiCredentials(DEFAULT_USER_ID);
    return NextResponse.json({
      success: true,
      message: 'API credentials updated successfully',
      results,
      credentials: updatedCredentials,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to save API credentials' }, { status: 500 });
  }
}
