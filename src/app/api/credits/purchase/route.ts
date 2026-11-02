import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getUserCredits, DEFAULT_USER_ID } from '@/lib/db';
import { CREDIT_PACKS } from '@/lib/billing';
import { recordCreditPurchase } from '@/lib/billing/creditFifo';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { packId, provider = 'polar' } = body;

    if (!packId) {
      return NextResponse.json(
        { success: false, error: 'Missing packId parameter' },
        { status: 400 }
      );
    }

    const pack = CREDIT_PACKS.find((p) => p.id === packId);
    if (!pack) {
      return NextResponse.json(
        { success: false, error: `Invalid packId. Available: ${CREDIT_PACKS.map((p) => p.id).join(', ')}` },
        { status: 400 }
      );
    }

    // Authenticate user
    let userId = DEFAULT_USER_ID;
    try {
      const user = await getCurrentUser(req);
      if (user?.id) userId = user.id;
    } catch {}

    const userCredits = getUserCredits(userId);
    const tier = (userCredits?.tier || 'FREE').toUpperCase();

    // Rule: Extra credit purchases available to paid subscribers (Starter+)
    // In dev / demo mode, we allow testing with demo user
    const isPaidSubscriber = ['STARTER', 'CREATOR', 'PRO', 'SCALE', 'AGENCY', 'ADMIN'].includes(tier);
    if (!isPaidSubscriber && userId !== DEFAULT_USER_ID) {
      return NextResponse.json(
        {
          success: false,
          error: 'Extra credit packs are available exclusively to active subscribers (Starter, Creator, Pro). Please upgrade to a paid plan first.',
        },
        { status: 403 }
      );
    }

    // Record purchase and credit user balance
    const result = recordCreditPurchase({
      userId,
      packId: pack.id,
      creditsAmount: pack.credits,
      amountPaidCents: pack.priceCents,
      validityDays: pack.validityDays,
      provider,
    });

    return NextResponse.json({
      success: true,
      message: `Successfully purchased ${pack.credits} credits!`,
      pack: {
        id: pack.id,
        label: pack.label,
        credits: pack.credits,
        priceUsd: pack.priceUsd,
      },
      purchaseId: result.purchaseId,
      newBalance: result.newBalance,
      expiresAt: result.expiresAt,
    });
  } catch (err: any) {
    console.error('[API /credits/purchase] Error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to process credit purchase' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    packs: CREDIT_PACKS,
  });
}
