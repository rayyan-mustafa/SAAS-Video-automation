import { getDb, grantUserCredits } from '../db';

export type VisualTier = 'flagship' | 'fast' | 'economy' | 'motion_still' | 'graphic' | 'stock';

export const TIER_DEFAULT_CREDITS: Record<VisualTier, number> = {
  flagship: 50,
  fast: 15,
  economy: 8,
  motion_still: 0,
  graphic: 0,
  stock: 0,
};

/**
 * Calculates extra credit cost using the formula:
 * Extra Credits = ceil( (usdPerSec * durationSec) / ((1 - 0.60) * 0.065) )
 *               = ceil( (usdPerSec * durationSec) / 0.026 )
 */
export function calculateCreditCost(usdPerSec: number, durationSec: number): number {
  if (usdPerSec <= 0 || durationSec <= 0) return 0;
  return Math.ceil((usdPerSec * durationSec) / 0.026);
}

/**
 * Calculates retail credit delta when a scene downgrades to a lower tier:
 * Refund Credits = Credits(Planned Tier) - Credits(Delivered Tier)
 */
export function calculatePriceDeltaRefund(
  plannedTier: VisualTier | string,
  deliveredTier: VisualTier | string,
  plannedCostCredits?: number,
  deliveredCostCredits?: number
): number {
  const planned = typeof plannedCostCredits === 'number'
    ? plannedCostCredits
    : (TIER_DEFAULT_CREDITS[plannedTier as VisualTier] ?? 0);

  const delivered = typeof deliveredCostCredits === 'number'
    ? deliveredCostCredits
    : (TIER_DEFAULT_CREDITS[deliveredTier as VisualTier] ?? 0);

  return Math.max(0, planned - delivered);
}

export interface IssuePriceDeltaRefundParams {
  userId: string;
  projectId: string;
  sceneIndex: number;
  plannedTier: VisualTier | string;
  deliveredTier: VisualTier | string;
  refundCredits?: number;
  reason?: string;
}

/**
 * Issues an itemized retail price-delta refund to user's credit ledger.
 */
export function issuePriceDeltaRefund(params: IssuePriceDeltaRefundParams): {
  refundCredits: number;
  newBalance: number;
  description: string;
} {
  const { userId, projectId, sceneIndex, plannedTier, deliveredTier, reason } = params;
  const refundCredits = typeof params.refundCredits === 'number'
    ? params.refundCredits
    : calculatePriceDeltaRefund(plannedTier, deliveredTier);

  if (refundCredits <= 0) {
    const { getUserCredits } = require('../db');
    return {
      refundCredits: 0,
      newBalance: getUserCredits(userId).balance,
      description: 'No refund required: delivered tier value meets or exceeds planned tier',
    };
  }

  const description = reason || 
    `Price-Delta Refund: Scene ${sceneIndex} downgraded from ${plannedTier.toUpperCase()} to ${deliveredTier.toUpperCase()} (+${refundCredits} credits)`;

  const newBalance = grantUserCredits(
    userId,
    refundCredits,
    'REFUND',
    description,
    projectId
  );

  console.log(`[RefundEngine] 💸 Refunded ${refundCredits} credits to user ${userId} for project ${projectId} (Scene ${sceneIndex}: ${plannedTier} -> ${deliveredTier})`);

  return {
    refundCredits,
    newBalance,
    description,
  };
}

/**
 * Checks if downgrade refund rate exceeds the 5% margin guardrail threshold.
 */
export function getQcDowngradeRefundRate(windowDays: number = 7): {
  totalBilled: number;
  totalRefunded: number;
  refundRate: number;
  alert: boolean;
} {
  const db = getDb();
  try {
    const row = db.prepare(`
      SELECT 
        COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0) as total_billed,
        COALESCE(SUM(CASE WHEN amount > 0 AND type = 'REFUND' THEN amount ELSE 0 END), 0) as total_refunded
      FROM credit_transactions
      WHERE created_at >= datetime('now', '-' || ? || ' days')
    `).get(windowDays) as { total_billed: number; total_refunded: number } | undefined;

    const totalBilled = row?.total_billed ?? 0;
    const totalRefunded = row?.total_refunded ?? 0;
    const refundRate = totalBilled > 0 ? (totalRefunded / totalBilled) : 0;
    const alert = refundRate > 0.05;

    return {
      totalBilled,
      totalRefunded,
      refundRate,
      alert,
    };
  } catch (err: any) {
    console.warn('[RefundEngine] Error calculating QC downgrade refund rate:', err.message);
    return { totalBilled: 0, totalRefunded: 0, refundRate: 0, alert: false };
  }
}
