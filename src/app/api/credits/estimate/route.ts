import { NextRequest, NextResponse } from 'next/server';
import {
  calculateVideoCreditCost,
  VISUAL_TIERS,
  VisualTierName,
  ADDON_CREDIT_COSTS,
} from '@/lib/billing';
import { getUserCredits } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      scenes: rawScenes,
      sceneCount = 7,
      visualTier = 'stock',
      voiceTier = 'google_neural2',
      includeThumbnail = true,
      isPreview = false,
    } = body;

    // Build scene array
    let scenes: Array<{ visualTier: VisualTierName }> = [];
    if (Array.isArray(rawScenes) && rawScenes.length > 0) {
      scenes = rawScenes.map((s) => ({
        visualTier: (s.visualTier in VISUAL_TIERS ? s.visualTier : 'stock') as VisualTierName,
      }));
    } else {
      const tierKey = (visualTier in VISUAL_TIERS ? visualTier : 'stock') as VisualTierName;
      const count = Math.max(1, Math.min(60, Number(sceneCount) || 7));
      scenes = Array(count).fill(null).map(() => ({ visualTier: tierKey }));
    }

    const normalizedVoiceTier = ['google_neural2', 'elevenlabs', 'elevenlabs_clone'].includes(voiceTier)
      ? voiceTier
      : 'google_neural2';

    const calculation = calculateVideoCreditCost({
      scenes,
      voiceTier: normalizedVoiceTier as 'google_neural2' | 'elevenlabs' | 'elevenlabs_clone',
      includeThumbnail: Boolean(includeThumbnail),
      isPreview: Boolean(isPreview),
    });

    // Check user balance if authenticated
    let userBalance: number | null = null;
    let userTier = 'FREE';
    try {
      const user = await getCurrentUser(req);
      if (user?.id) {
        const credits = getUserCredits(user.id);
        userBalance = credits.balance;
        userTier = credits.tier;
      }
    } catch {
      // Unauthenticated callers still get calculation
    }

    const hasSufficientCredits = userBalance !== null ? userBalance >= calculation.totalCredits : true;
    const creditShortfall = userBalance !== null ? Math.max(0, calculation.totalCredits - userBalance) : 0;

    return NextResponse.json({
      success: true,
      estimate: {
        totalCredits: calculation.totalCredits,
        sceneCreditTotal: calculation.sceneCreditTotal,
        voiceCredits: calculation.voiceCredits,
        thumbnailCredits: calculation.thumbnailCredits,
        sceneCount: scenes.length,
        isPreview: Boolean(isPreview),
        breakdown: calculation.breakdown,
      },
      user: {
        balance: userBalance,
        tier: userTier,
        hasSufficientCredits,
        creditShortfall,
      },
      tierCatalog: VISUAL_TIERS,
      addons: ADDON_CREDIT_COSTS,
    });
  } catch (error: any) {
    console.error('[API /credits/estimate] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to estimate credits' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    visualTiers: VISUAL_TIERS,
    addons: ADDON_CREDIT_COSTS,
    message: 'Send a POST request with { scenes, voiceTier, isPreview, includeThumbnail } for dynamic quote',
  });
}
