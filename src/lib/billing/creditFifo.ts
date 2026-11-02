import { getDb, grantUserCredits, deductUserCredits, getUserCredits } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export interface CreditPurchaseRow {
  id: string;
  user_id: string;
  pack_id: string;
  credits_amount: number;
  credits_remaining: number;
  amount_paid_cents: number;
  provider: string;
  provider_payment_id?: string | null;
  status: 'active' | 'expired' | 'exhausted';
  purchased_at: string;
  expires_at: string;
  created_at: string;
}

/**
 * Sweeps and expires any credit packs whose expires_at timestamp has elapsed.
 */
export function sweepExpiredPacks(userId: string): number {
  const db = getDb();
  const now = new Date().toISOString();

  try {
    const expiredRows = db.prepare(`
      SELECT id, credits_remaining 
      FROM credit_purchases 
      WHERE user_id = ? AND status = 'active' AND expires_at < ?
    `).all(userId, now) as Array<{ id: string; credits_remaining: number }>;

    let expiredCreditsTotal = 0;
    for (const row of expiredRows) {
      if (row.credits_remaining > 0) {
        expiredCreditsTotal += row.credits_remaining;
      }
      db.prepare(`
        UPDATE credit_purchases 
        SET status = 'expired', credits_remaining = 0 
        WHERE id = ?
      `).run(row.id);
    }

    if (expiredCreditsTotal > 0) {
      // Deduct expired credits from wallet
      deductUserCredits(
        userId,
        expiredCreditsTotal,
        'CREDIT_EXPIRATION',
        `Expired pack credits (${expiredCreditsTotal} cr passed validity deadline)`
      );
    }

    return expiredCreditsTotal;
  } catch (err: any) {
    console.warn('[CreditFIFO] Error sweeping expired packs:', err.message);
    return 0;
  }
}

/**
 * Deducts credits using FIFO priority:
 * 1. Monthly recurring subscription allowance is consumed first.
 * 2. If monthly allowance is depleted, purchased packs are consumed in order of earliest expiration.
 */
export function deductCreditsFifo(
  userId: string,
  amount: number,
  type: string,
  description: string,
  projectId?: string
): boolean {
  const db = getDb();
  sweepExpiredPacks(userId);

  const credits = getUserCredits(userId);
  if (credits.balance < amount) {
    return false; // Insufficient total credits
  }

  // 1. Deduct from main balance
  const success = deductUserCredits(userId, amount, type, description, projectId);
  if (!success) {
    return false;
  }

  // 2. Decrement purchased packs FIFO if monthly credits didn't cover full amount
  try {
    let remainingToDebit = amount;

    // Active purchased packs sorted by expiration ascending (earliest expiring first)
    const activePacks = db.prepare(`
      SELECT * FROM credit_purchases 
      WHERE user_id = ? AND status = 'active' AND credits_remaining > 0
      ORDER BY expires_at ASC
    `).all(userId) as CreditPurchaseRow[];

    for (const pack of activePacks) {
      if (remainingToDebit <= 0) break;

      const toDeductFromPack = Math.min(pack.credits_remaining, remainingToDebit);
      const newRemaining = pack.credits_remaining - toDeductFromPack;
      const newStatus = newRemaining === 0 ? 'exhausted' : 'active';

      db.prepare(`
        UPDATE credit_purchases 
        SET credits_remaining = ?, status = ? 
        WHERE id = ?
      `).run(newRemaining, newStatus, pack.id);

      remainingToDebit -= toDeductFromPack;
    }
  } catch (err: any) {
    console.warn('[CreditFIFO] Error updating pack FIFO ledger:', err.message);
  }

  return true;
}

/**
 * Records a newly purchased credit pack and adds credits to user wallet.
 */
export function recordCreditPurchase(params: {
  userId: string;
  packId: string;
  creditsAmount: number;
  amountPaidCents: number;
  validityDays: number;
  provider?: string;
  paymentId?: string;
}): { purchaseId: string; newBalance: number; expiresAt: string } {
  const {
    userId,
    packId,
    creditsAmount,
    amountPaidCents,
    validityDays,
    provider = 'polar',
    paymentId,
  } = params;

  const db = getDb();
  const purchaseId = `cp_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
  const now = new Date();
  const expiresDate = new Date(now.getTime() + validityDays * 24 * 3600 * 1000);
  const nowIso = now.toISOString();
  const expiresIso = expiresDate.toISOString();

  // 1. Insert into credit_purchases ledger
  db.prepare(`
    INSERT INTO credit_purchases (
      id, user_id, pack_id, credits_amount, credits_remaining,
      amount_paid_cents, provider, provider_payment_id, status,
      purchased_at, expires_at, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)
  `).run(
    purchaseId,
    userId,
    packId,
    creditsAmount,
    creditsAmount,
    amountPaidCents,
    provider,
    paymentId || null,
    nowIso,
    expiresIso,
    nowIso
  );

  // 2. Grant credits to user's wallet
  const newBalance = grantUserCredits(
    userId,
    creditsAmount,
    'EXTRA_CREDIT_PURCHASE',
    `Purchased ${creditsAmount} extra credits (${packId})`,
    null
  );

  console.log(`[CreditFIFO] 🎉 User ${userId} purchased ${creditsAmount} credits (Pack ${packId}). New balance: ${newBalance}`);

  return {
    purchaseId,
    newBalance,
    expiresAt: expiresIso,
  };
}
