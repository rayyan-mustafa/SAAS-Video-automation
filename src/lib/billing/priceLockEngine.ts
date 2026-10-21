/**
 * True Price Lock Engine (WP8)
 *
 * Enforces the upfront worst-case quote ceiling and automatically refunds the
 * price-delta once exact audio durations and visual tiers are delivered.
 *
 * Final charge will NEVER exceed the approved quote!
 */

import { getDb, grantUserCredits, deductUserCredits } from '../db';
import { resolveLengthBand, calculateNetOverageCredits, LengthBand } from '../video/lengthBands';
import { EngineError } from '../video/engineErrors';

export interface SceneCostEstimate {
  sceneIndex: number;
  visualTier: string;
  durationSec: number;
  modelUsdPerSec?: number;
}

export interface PriceLockQuote {
  lengthBand: LengthBand;
  baseCredits: number;
  includedAiBudgetUsd: number;
  estimatedAiCostUsd: number;
  overageUsd: number;
  extraCredits: number;
  totalQuotedCredits: number;
}

/**
 * Calculates the worst-case price-lock credit quote for a project before approval.
 */
export function calculateWorstCaseQuote(params: {
  targetLengthMinutes: number;
  scenes: SceneCostEstimate[];
}): PriceLockQuote {
  const { targetLengthMinutes, scenes } = params;
  const band = resolveLengthBand(targetLengthMinutes);

  let totalAiCostUsd = 0;
  for (const scene of scenes) {
    if (scene.visualTier === 'ai_clip' || scene.visualTier === 'flagship' || scene.visualTier === 'fast' || scene.visualTier === 'economy') {
      const rate = scene.modelUsdPerSec || 0.05; // Default Veo 3.1 Lite rate ($0.05/s)
      totalAiCostUsd += rate * scene.durationSec;
    }
  }

  totalAiCostUsd = Math.round(totalAiCostUsd * 100) / 100;
  const overage = calculateNetOverageCredits(band.band, totalAiCostUsd);

  return {
    lengthBand: band.band,
    baseCredits: band.baseCredits,
    includedAiBudgetUsd: band.includedAiBudgetUsd,
    estimatedAiCostUsd: totalAiCostUsd,
    overageUsd: overage.overageUsd,
    extraCredits: overage.extraCredits,
    totalQuotedCredits: band.baseCredits + overage.extraCredits,
  };
}

/**
 * Calculates actual delivered credit cost based on measured audio durations.
 */
export function calculateActualCreditCost(params: {
  targetLengthMinutes: number;
  scenes: SceneCostEstimate[];
}): { actualCredits: number; actualAiCostUsd: number } {
  const { targetLengthMinutes, scenes } = params;
  const band = resolveLengthBand(targetLengthMinutes);

  let totalAiCostUsd = 0;
  for (const scene of scenes) {
    if (scene.visualTier === 'ai_clip' || scene.visualTier === 'flagship' || scene.visualTier === 'fast' || scene.visualTier === 'economy') {
      const rate = scene.modelUsdPerSec || 0.05;
      totalAiCostUsd += rate * scene.durationSec;
    }
  }

  totalAiCostUsd = Math.round(totalAiCostUsd * 100) / 100;
  const overage = calculateNetOverageCredits(band.band, totalAiCostUsd);
  const actualCredits = band.baseCredits + overage.extraCredits;

  return {
    actualCredits,
    actualAiCostUsd: totalAiCostUsd,
  };
}

/**
 * Reconciles the Price Lock quote against actual delivered durations.
 * If actual cost is less than quoted, automatically issues a delta refund!
 */
export function reconcilePriceLockRefund(params: {
  projectId: string;
  userId: string;
  targetLengthMinutes: number;
}): {
  quotedCredits: number;
  actualCredits: number;
  deltaRefundCredits: number;
} {
  const { projectId, userId, targetLengthMinutes } = params;
  const db = getDb();

  const project = db.prepare('SELECT quoted_credits FROM content_projects WHERE id = ?').get(projectId) as any;
  const quotedCredits = project?.quoted_credits || 25;

  const scenes = db.prepare('SELECT scene_index, visual_tier, audio_duration_sec, estimated_duration_sec FROM video_scenes WHERE project_id = ? ORDER BY scene_index ASC').all(projectId) as any[];

  const sceneEstimates: SceneCostEstimate[] = scenes.map((s) => ({
    sceneIndex: s.scene_index,
    visualTier: s.visual_tier || 'motion_still',
    durationSec: s.audio_duration_sec > 0 ? s.audio_duration_sec : (s.estimated_duration_sec || 4),
  }));

  const { actualCredits } = calculateActualCreditCost({
    targetLengthMinutes,
    scenes: sceneEstimates,
  });

  const deltaRefundCredits = Math.max(0, quotedCredits - actualCredits);

  if (deltaRefundCredits > 0) {
    grantUserCredits(
      userId,
      deltaRefundCredits,
      'PRICE_LOCK_DELTA_REFUND',
      `Price Lock Guarantee: actual duration shorter than quoted ceiling (${actualCredits} vs ${quotedCredits} credits)`,
      projectId
    );
  }

  return {
    quotedCredits,
    actualCredits,
    deltaRefundCredits,
  };
}
