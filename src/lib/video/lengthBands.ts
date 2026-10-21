export type LengthBand = 'short' | 'standard' | 'extended';

export interface LengthBandConfig {
  band: LengthBand;
  label: string;
  maxDurationSec: number;
  baseCredits: number;
  includedAiBudgetUsd: number;
  maxWords: number;
  targetGrossMargin: number;
}

export const LENGTH_BANDS: Record<LengthBand, LengthBandConfig> = {
  short: {
    band: 'short',
    label: 'Short (≤60s)',
    maxDurationSec: 60,
    baseCredits: 25,
    includedAiBudgetUsd: 0.47,
    maxWords: 130,
    targetGrossMargin: 0.601,
  },
  standard: {
    band: 'standard',
    label: 'Standard (61s–120s)',
    maxDurationSec: 120,
    baseCredits: 45,
    includedAiBudgetUsd: 0.85,
    maxWords: 260,
    targetGrossMargin: 0.601,
  },
  extended: {
    band: 'extended',
    label: 'Extended (121s–180s)',
    maxDurationSec: 180,
    baseCredits: 65,
    includedAiBudgetUsd: 1.20,
    maxWords: 390,
    targetGrossMargin: 0.603,
  },
};

/**
 * Resolves the appropriate length band from target length (in minutes or seconds).
 */
export function resolveLengthBand(target: number): LengthBandConfig {
  // If target <= 3, assume minutes, otherwise seconds
  const targetSec = target <= 3 ? target * 60 : target;

  if (targetSec <= 60) return LENGTH_BANDS.short;
  if (targetSec <= 120) return LENGTH_BANDS.standard;
  return LENGTH_BANDS.extended;
}

/**
 * Calculates extra credit charge using the Net Overage Model:
 * Extra Credits = ceil( max(0, Total AI Cost - Included AI Budget) / 0.026 )
 */
export function calculateNetOverageCredits(
  band: LengthBand | number,
  totalAiClipCostUsd: number
): {
  includedBudgetUsd: number;
  overageUsd: number;
  extraCredits: number;
} {
  const config = typeof band === 'string' ? LENGTH_BANDS[band] : resolveLengthBand(band);
  const rawOverage = Math.max(0, totalAiClipCostUsd - config.includedAiBudgetUsd);
  const overageUsd = Math.round(rawOverage * 100) / 100;
  const extraCredits = overageUsd > 0 ? Math.ceil((overageUsd / 0.026) - 1e-9) : 0;

  return {
    includedBudgetUsd: config.includedAiBudgetUsd,
    overageUsd,
    extraCredits,
  };
}

/**
 * Validates if measured audio duration is within the length band tolerance.
 * Tolerance: +0.5s for audio container padding.
 */
export function isWithinBandLimit(band: LengthBand | number, measuredDurationSec: number): boolean {
  const config = typeof band === 'string' ? LENGTH_BANDS[band] : resolveLengthBand(band);
  return measuredDurationSec <= config.maxDurationSec + 0.5;
}
