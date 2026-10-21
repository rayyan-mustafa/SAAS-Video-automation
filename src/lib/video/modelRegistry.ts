import { EngineError } from './engineErrors';
import { calculateCreditCost } from '../billing/refundEngine';

export type ModelTier = 'economy' | 'fast' | 'flagship';

export interface ModelRegistryEntry {
  id: string;
  name: string;
  provider: 'fal' | 'cloudflare' | 'google' | 'direct';
  tier: ModelTier;
  costPerSecUsd: number;
  creditCostPer5s: number;
  verified: boolean;
  pricedAt: string | null;
  pricingUrl: string;
  maxDurationSec: number;
  nativeAudio: boolean;
  endpoint?: string;
  notes?: string;
}

/**
 * Model Registry.
 * All models initialize with verified: false and pricedAt: null until checked via scripts/verify-models.ts.
 */
export const INITIAL_MODEL_REGISTRY: ModelRegistryEntry[] = [
  {
    id: 'google/veo-3.1-lite',
    name: 'Google Veo 3.1 Lite (720p)',
    provider: 'google',
    tier: 'economy',
    costPerSecUsd: 0.05,
    creditCostPer5s: calculateCreditCost(0.05, 5), // 10 credits
    verified: false,
    pricedAt: null,
    pricingUrl: 'https://cloud.google.com/vertex-ai/generative-ai/pricing',
    maxDurationSec: 8,
    nativeAudio: true,
    endpoint: 'veo-3.1-lite@001',
    notes: 'Cheap tier with native audio generation reported ~ $0.05/s at 720p',
  },
  {
    id: 'fal-ai/wan-2.1/t2v-480p',
    name: 'Wan 2.1 (480p)',
    provider: 'fal',
    tier: 'economy',
    costPerSecUsd: 0.05,
    creditCostPer5s: calculateCreditCost(0.05, 5), // 10 credits
    verified: false,
    pricedAt: null,
    pricingUrl: 'https://fal.ai/pricing',
    maxDurationSec: 5,
    nativeAudio: false,
    endpoint: 'fal-ai/wan-2.1/t2v-480p',
    notes: 'Base economy tier video generator',
  },
  {
    id: 'kling-video/v3/standard',
    name: 'Kling Video v3 Standard',
    provider: 'fal',
    tier: 'fast',
    costPerSecUsd: 0.08,
    creditCostPer5s: calculateCreditCost(0.08, 5), // 16 credits
    verified: false,
    pricedAt: null,
    pricingUrl: 'https://fal.ai/pricing',
    maxDurationSec: 10,
    nativeAudio: false,
    endpoint: 'fal-ai/kling-video/v3/standard',
    notes: 'Fast tier video generator',
  },
  {
    id: 'seedance-v2/fast',
    name: 'Seedance 2.0 Fast',
    provider: 'fal',
    tier: 'fast',
    costPerSecUsd: 0.24, // Market rate estimate ~ $0.24/s
    creditCostPer5s: calculateCreditCost(0.24, 5), // 47 credits
    verified: false,
    pricedAt: null,
    pricingUrl: 'https://fal.ai/pricing',
    maxDurationSec: 5,
    nativeAudio: false,
    endpoint: 'fal-ai/seedance-v2/fast',
    notes: 'Fast tier alternative model, unconfirmed rate',
  },
  {
    id: 'fal-ai/minimax/video-01',
    name: 'MiniMax Hailuo Video 01',
    provider: 'fal',
    tier: 'flagship',
    costPerSecUsd: 0.20,
    creditCostPer5s: calculateCreditCost(0.20, 5), // 39 credits
    verified: false,
    pricedAt: null,
    pricingUrl: 'https://fal.ai/pricing',
    maxDurationSec: 6,
    nativeAudio: false,
    endpoint: 'fal-ai/minimax/video-01',
    notes: 'Flagship photorealistic video tier',
  },
];

// In-memory active registry
let activeRegistry: ModelRegistryEntry[] = [...INITIAL_MODEL_REGISTRY];

export function getAllModels(): ModelRegistryEntry[] {
  return [...activeRegistry];
}

export function getVerifiedModels(): ModelRegistryEntry[] {
  return activeRegistry.filter((m) => m.verified && m.pricedAt !== null);
}

export function getModelById(id: string): ModelRegistryEntry | undefined {
  return activeRegistry.find((m) => m.id === id);
}

export function updateModelVerification(
  id: string,
  verified: boolean,
  pricedAt: string | null,
  overrideCostUsd?: number
): ModelRegistryEntry {
  const idx = activeRegistry.findIndex((m) => m.id === id);
  if (idx === -1) {
    throw new EngineError('NO_MODEL_IN_TIER', `Model not found in registry: ${id}`);
  }

  const existing = activeRegistry[idx];
  const newCost = overrideCostUsd !== undefined ? overrideCostUsd : existing.costPerSecUsd;
  const updated: ModelRegistryEntry = {
    ...existing,
    costPerSecUsd: newCost,
    creditCostPer5s: calculateCreditCost(newCost, 5),
    verified,
    pricedAt,
  };

  activeRegistry[idx] = updated;
  return updated;
}

export function resetModelRegistry(): void {
  activeRegistry = [...INITIAL_MODEL_REGISTRY];
}

/**
 * Model Router.
 * Refuses unverified models in production with EngineError('MODEL_UNVERIFIED').
 * In dev, permits selection with prominent warnings.
 */
export function selectModelForTier(
  tier: ModelTier,
  options?: { allowUnverifiedInDev?: boolean; enforceProductionCheck?: boolean }
): ModelRegistryEntry {
  const isProd = options?.enforceProductionCheck ?? process.env.NODE_ENV === 'production';
  const allowUnverified = options?.allowUnverifiedInDev ?? !isProd;

  const candidates = activeRegistry.filter((m) => m.tier === tier);
  if (candidates.length === 0) {
    throw new EngineError('NO_MODEL_IN_TIER', `No models configured for tier: ${tier}`);
  }

  const verifiedCandidates = candidates.filter((m) => m.verified && m.pricedAt !== null);
  if (verifiedCandidates.length > 0) {
    return verifiedCandidates[0];
  }

  // Refuse unverified models in production
  if (isProd || !allowUnverified) {
    throw new EngineError(
      'MODEL_UNVERIFIED',
      `Production router refused unverified models in tier "${tier}". All ${candidates.length} candidate(s) have verified: false and pricedAt: null. Check official pricing (${candidates[0].pricingUrl}) and run scripts/verify-models.ts.`
    );
  }

  console.warn(
    `[ModelRouter] ⚠️ Selecting unverified model "${candidates[0].id}" in dev mode (pricedAt: ${candidates[0].pricedAt}). Official pricing: ${candidates[0].pricingUrl}`
  );
  return candidates[0];
}
