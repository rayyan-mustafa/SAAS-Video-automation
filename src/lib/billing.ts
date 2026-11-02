/**
 * Billing Architecture & Calculated SaaS Packages
 *
 * Provides normalized pricing, calculated video outputs, credit allotments,
 * and multi-tier monetization packages.
 */

// ============================================================
// INTERFACES
// ============================================================

export interface Plan {
  id: string;
  name: string;
  price_monthly: number;
  price_annual: number;
  credits_monthly: number;
  estimated_videos: number;
  estimated_shorts: number;
  max_channels: number;
  max_resolution: string;
  badge?: string;
  features: string[];
  is_popular: boolean;
  cta_label: string;
}

export interface Subscription {
  id: string;
  customer_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  provider: PaymentProvider;
  provider_subscription_id?: string | null;
  created_at: string;
  updated_at: string;
}

export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete';

export interface Credits {
  customer_id: string;
  balance: number;
  monthly_allowance: number;
  renews_at: string;
}

export interface CreditTransaction {
  id: string;
  customer_id: string;
  amount: number;
  balance_after: number;
  type: TransactionType;
  description: string;
  project_id?: string | null;
  created_at: string;
}

export type TransactionType =
  | 'MONTHLY_GRANT'
  | 'PLAN_UPGRADE'
  | 'VIDEO_GENERATION'
  | 'THUMBNAIL_GENERATION'
  | 'MANUAL_CREDIT'
  | 'REFUND';

export interface Entitlements {
  can_generate_video: boolean;
  can_publish_youtube: boolean;
  can_use_copilot: boolean;
  max_channels: number;
  max_resolution: string;
  monthly_credits: number;
  remaining_credits: number;
  plan_name: string;
}

export type PaymentProvider = 'polar' | 'stripe' | 'paddle' | 'none';

// ============================================================
// CALCULATED PRODUCTION SAAS PACKAGES (2026 EDITION)
// ============================================================

export const PLANS: Plan[] = [
  {
    id: 'starter',
    name: 'Starter Plan',
    price_monthly: 29,
    price_annual: 24,
    credits_monthly: 500,
    estimated_videos: 62,
    estimated_shorts: 62,
    max_channels: 1,
    max_resolution: '1080p Full HD',
    is_popular: false,
    cta_label: 'Get Starter Plan ($29/mo)',
        features: [
      '15 Full AI Videos / month â€” Post every other day (~30 Shorts)',
      '1080p Full HD MP4 Downloads â€” 100% watermark-free with full commercial monetization',
      'Deepgram Aura-2 High-Speed Voices â€” Natural, human-like voice narration',
      'Curated Stock B-Roll & FLUX.1 Visuals â€” HD stock video sequences & cinematic stills',
      'Word-by-Word Kinetic Subtitles â€” Platform safe-zone compliance (no UI cutoff)',
      '3-Stage Viral Scriptwriting Engine â€” Hook, retention body & CTA optimized for engagement',
      '1 Connected Social Channel â€” Autopilot publishing for YouTube Shorts or TikTok',
      'Zero-Waste Guarantee â€” Unhandled render failures auto-refund 100% of credits instantly',
    ],
  },
  {
    id: 'creator',
    name: 'Creator Plan',
    price_monthly: 49,
    price_annual: 39,
    credits_monthly: 1200,
    estimated_videos: 150,
    estimated_shorts: 150,
    max_channels: 2,
    max_resolution: '1080p Full HD',
    badge: 'MOST POPULAR â€” 1 DAILY VIDEO',
    is_popular: true,
    cta_label: 'Get Creator Plan ($49/mo)',
        features: [
      '30 Full AI Videos / month â€” Post 1 video every single day (~60 Shorts)',
      '100% Ultra-Realistic ElevenLabs Voices â€” Industry-best studio narration (Adam, Brian, Rachel)',
      'Cinema AI Video Access â€” Google Veo 3.1 & Seedance generative clips for viral hooks',
      'Curated 1080p Stock & 8K FLUX.1 Stills â€” Dynamic Ken Burns motion & camera zooms',
      'Glassmorphic Stat Cards & Sound FX â€” Auto sound effects & curated background music',
      '2 Connected Social Channels â€” Dual autopilot for YouTube Shorts + TikTok',
      'Scene Editor-Lite Studio â€” 1-click scene re-voicing, tier swapping & undo history',
      'Zero-Waste Guarantee â€” Unhandled render failures auto-refund 100% of credits instantly',
    ],
  },
  {
    id: 'pro',
    name: 'Pro Automation Plan',
    price_monthly: 99,
    price_annual: 79,
    credits_monthly: 3000,
    estimated_videos: 375,
    estimated_shorts: 375,
    max_channels: 5,
    max_resolution: '4K Ultra HD',
    badge: 'MAX POWER â€” 2 DAILY VIDEOS',
    is_popular: false,
    cta_label: 'Get Pro Plan ($99/mo)',
        features: [
      '60 Full AI Videos / month â€” Post 2 videos every single day (~120 Shorts)',
      'All 4 Social Publishing Platforms â€” YouTube Shorts, TikTok, Instagram Reels & FB Reels',
      'Full Generative AI Video Engine â€” Google Veo 3.1, Seedance 2.0 & Kling Pro',
      'Custom Voice Cloning Studio â€” Clone your personal voice + 50+ ElevenLabs voices',
      'Competitor Outlier Spy & Winner-Bias â€” Detect viral outlier topics & winning hook formulas',
      'VIP Priority Turbo Render Queue â€” <90s Cloudflare GPU processing & instant exports',
      '4K Ultra HD Master Exports â€” High-bitrate studio quality MP4 downloads',
      'VIP 24/7 Priority Support â€” Dedicated pipeline support & channel growth onboarding',
    ],
  },
];

export const AGENCY_PLAN: Plan = {
  id: 'agency',
  name: 'Agency Scale Plan',
  price_monthly: 199,
  price_annual: 159,
  credits_monthly: 7000,
  estimated_videos: 875,
  estimated_shorts: 875,
  max_channels: 15,
  max_resolution: '4K Ultra HD',
  badge: 'AGENCY & ENTERPRISE SCALE',
  is_popular: false,
  cta_label: 'Get Agency Plan ($199/mo)',
  features: [
    '120 Full AI Videos / month â€” 4 videos every single day (~240 Shorts)',
    '15 Connected Social Channels â€” Full multi-client agency automation suite',
    'Full Generative AI Video Engine â€” Google Veo 3.1, Seedance 2.0 & Kling Pro',
    'Unlimited Voice Cloning & Studio Voice Library (ElevenLabs + Aura-2)',
    'Agency Team Collaboration & Dedicated White-Label Workflows',
    'Zero-Waste Guarantee â€” Instant 100% credit auto-refund on failed renders',
    'Dedicated Turbo Rendering Cluster & 24/7 SLA Priority Support',
  ],
};

export const DEMO_PLAN: Plan = {
  id: 'free',
  name: 'Free Trial',
  price_monthly: 0,
  price_annual: 0,
  credits_monthly: 300,
  estimated_videos: 35,
  estimated_shorts: 35,
  max_channels: 1,
  max_resolution: '1080p Preview',
  is_popular: false,
  cta_label: 'Free Demo Account',
    features: [
    '1 Free Demo Video Allowance â€” Complete end-to-end generation preview',
    'Deepgram Aura-2 High-Speed Voice â€” Natural, human-like English narration',
    'Curated Stock B-Roll & Visuals â€” Stock footage sequences & FLUX.1 motion stills',
    'Word-by-Word Kinetic Subtitles â€” Platform safe-zone compliance (no UI cutoff)',
    'Watermarked Preview Export â€” Upgrade to Starter or Creator to remove watermark & auto-publish',
  ],
};

export function getPlanById(id: string): Plan | null {
  const normalizedId = id.toLowerCase();
  if (normalizedId === 'free' || normalizedId === 'demo') return DEMO_PLAN;
  if (normalizedId === 'agency') return AGENCY_PLAN;
  if (normalizedId === 'pro' || normalizedId === 'scale') return PLANS.find((p) => p.id === 'pro') || PLANS[2];
  if (normalizedId === 'creator') return PLANS.find((p) => p.id === 'creator') || PLANS[1];
  if (normalizedId === 'starter') return PLANS.find((p) => p.id === 'starter') || PLANS[0];
  return PLANS.find((p) => p.id.toLowerCase() === normalizedId) || null;
}

// ============================================================
// PAYMENT PROVIDER STATUS & ENTITLEMENTS
// ============================================================

export type BillingConfigStatus =
  | { configured: true; provider: PaymentProvider }
  | { configured: false; reason: string };

import { isPolarConfigured } from './polar';

export function getPaymentProviderStatus(): BillingConfigStatus {
  if (isPolarConfigured()) {
    return { configured: true, provider: 'polar' };
  }
  if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY.startsWith('sk_')) {
    return { configured: true, provider: 'stripe' };
  }
  if (process.env.PADDLE_API_KEY) {
    return { configured: true, provider: 'paddle' };
  }
  return {
    configured: false,
    reason: 'Payment provider not configured in environment. Set POLAR_ACCESS_TOKEN or POLAR_CHECKOUT_URL_* in .env for live checkout.',
  };
}

export function calculateEntitlements(
  planId: string,
  creditBalance: number,
): Entitlements {
  const isDemo = planId.toLowerCase() === 'free' || planId.toLowerCase() === 'demo';
  const plan = getPlanById(planId) || (isDemo ? DEMO_PLAN : PLANS[0]);

  return {
    can_generate_video: creditBalance >= 25,
    can_publish_youtube: !isDemo,
    can_use_copilot: true,
    max_channels: plan.max_channels,
    max_resolution: plan.max_resolution,
    monthly_credits: plan.credits_monthly,
    remaining_credits: creditBalance,
    plan_name: plan.name,
  };
}

// ============================================================
// CREDIT COST CONSTANTS — VARIABLE CREDIT CONSUMPTION (v3.0)
// ============================================================

/**
 * Variable Credit Consumption by Visual Tier (Per Scene)
 * Aligns COGS with credit cost to maintain ≥60% gross margins.
 */
export type VisualTierName =
  | 'stock'
  | 'flash_motion'
  | 'cinema_ai_lite'
  | 'cinema_ai_fast'
  | 'hollywood_director';

export interface VisualTierConfig {
  id: VisualTierName;
  label: string;
  creditsPerScene: number;
  cogsPerScene: number;
  provider: string;
  model: string;
  requiredPlan: string;
  description: string;
}

export const VISUAL_TIERS: Record<VisualTierName, VisualTierConfig> = {
  stock: {
    id: 'stock',
    label: 'Curated Stock B-Roll',
    creditsPerScene: 1,
    cogsPerScene: 0.00,
    provider: 'Pexels / Pixabay',
    model: 'stock_api',
    requiredPlan: 'free',
    description: 'Free curated stock video clips from Pexels & Pixabay',
  },
  flash_motion: {
    id: 'flash_motion',
    label: 'Flash Motion (Ken Burns Still)',
    creditsPerScene: 1,
    cogsPerScene: 0.003,
    provider: 'Replicate',
    model: 'flux_1_schnell',
    requiredPlan: 'free',
    description: 'FLUX.1 Schnell AI-generated still with dynamic Ken Burns pan/zoom',
  },
  cinema_ai_lite: {
    id: 'cinema_ai_lite',
    label: 'Cinema AI Lite',
    creditsPerScene: 5,
    cogsPerScene: 0.30,
    provider: 'Google',
    model: 'veo_3_1_lite',
    requiredPlan: 'creator',
    description: 'Veo 3.1 Lite AI video clips at 720p — cinematic quality',
  },
  cinema_ai_fast: {
    id: 'cinema_ai_fast',
    label: 'Cinema AI Fast',
    creditsPerScene: 8,
    cogsPerScene: 0.72,
    provider: 'Google',
    model: 'veo_3_1_fast',
    requiredPlan: 'pro',
    description: 'Veo 3.1 Fast AI video clips at 1080p — viral visual quality',
  },
  hollywood_director: {
    id: 'hollywood_director',
    label: 'Hollywood Director',
    creditsPerScene: 15,
    cogsPerScene: 2.40,
    provider: 'Google / Kling',
    model: 'veo_3_1_standard',
    requiredPlan: 'pro',
    description: 'Veo Standard / Kling Pro — premium cinematic AI video',
  },
};

/**
 * Additional per-video credit costs
 */
export const ADDON_CREDIT_COSTS = {
  /** ElevenLabs Pro voice narration — 2 credits per video (Creator+ only) */
  ELEVENLABS_VOICE: 2,
  /** Thumbnail generation — 1 credit per video */
  THUMBNAIL: 1,
  /** Script generation — 0 credits (always free, COGS absorbed) */
  SCRIPT_GENERATION: 0,
  /** Google Neural2 voice — 0 credits (included in all tiers) */
  GOOGLE_NEURAL2_VOICE: 0,
  /** Preview generation — 50% of scene credit rate */
  PREVIEW_DISCOUNT_RATE: 0.5,
} as const;

/**
 * Extra Credit Purchase Packs
 */
export interface CreditPackConfig {
  id: string;
  label: string;
  credits: number;
  priceUsd: number;
  priceCents: number;
  perCreditCost: number;
  savingsPercent: number;
  validityDays: number;
}

export const CREDIT_PACKS: CreditPackConfig[] = [
  {
    id: 'boost_200',
    label: 'Boost 200',
    credits: 200,
    priceUsd: 9.99,
    priceCents: 999,
    perCreditCost: 0.050,
    savingsPercent: 0,
    validityDays: 90,
  },
  {
    id: 'power_500',
    label: 'Power 500',
    credits: 500,
    priceUsd: 19.99,
    priceCents: 1999,
    perCreditCost: 0.040,
    savingsPercent: 20,
    validityDays: 180,
  },
  {
    id: 'mega_1500',
    label: 'Mega 1,500',
    credits: 1500,
    priceUsd: 49.99,
    priceCents: 4999,
    perCreditCost: 0.033,
    savingsPercent: 34,
    validityDays: 365,
  },
  {
    id: 'ultra_5000',
    label: 'Ultra 5,000',
    credits: 5000,
    priceUsd: 129.99,
    priceCents: 12999,
    perCreditCost: 0.026,
    savingsPercent: 48,
    validityDays: 365,
  },
];

/**
 * Free Trial configuration
 */
export const FREE_TRIAL = {
  CREDITS: 300,
  DURATION_DAYS: 15,
  FREE_PUBLISHES: 1,
} as const;

/**
 * Calculates the total credit cost for a video based on scene visual tiers.
 * Matches Pictory's variable credit model.
 */
export function calculateVideoCreditCost(params: {
  scenes: Array<{ visualTier: VisualTierName }>;
  voiceTier: 'google_neural2' | 'elevenlabs' | 'elevenlabs_clone';
  includeThumbnail?: boolean;
  isPreview?: boolean;
}): {
  sceneCreditTotal: number;
  voiceCredits: number;
  thumbnailCredits: number;
  totalCredits: number;
  breakdown: Array<{ sceneIndex: number; tier: VisualTierName; credits: number }>;
} {
  const { scenes, voiceTier, includeThumbnail = true, isPreview = false } = params;
  const discountRate = isPreview ? ADDON_CREDIT_COSTS.PREVIEW_DISCOUNT_RATE : 1;

  let sceneCreditTotal = 0;
  const breakdown: Array<{ sceneIndex: number; tier: VisualTierName; credits: number }> = [];

  for (let i = 0; i < scenes.length; i++) {
    const tier = VISUAL_TIERS[scenes[i].visualTier] || VISUAL_TIERS.stock;
    const credits = Math.ceil(tier.creditsPerScene * discountRate);
    sceneCreditTotal += credits;
    breakdown.push({ sceneIndex: i, tier: scenes[i].visualTier, credits });
  }

  const voiceCredits = voiceTier === 'elevenlabs' || voiceTier === 'elevenlabs_clone'
    ? ADDON_CREDIT_COSTS.ELEVENLABS_VOICE
    : ADDON_CREDIT_COSTS.GOOGLE_NEURAL2_VOICE;

  const thumbnailCredits = includeThumbnail ? ADDON_CREDIT_COSTS.THUMBNAIL : 0;

  const totalCredits = sceneCreditTotal + voiceCredits + thumbnailCredits;

  return {
    sceneCreditTotal,
    voiceCredits,
    thumbnailCredits,
    totalCredits,
    breakdown,
  };
}

/**
 * Checks if a user's plan allows access to a specific visual tier.
 */
export function canAccessVisualTier(planId: string, tier: VisualTierName): boolean {
  const planHierarchy: Record<string, number> = {
    free: 0,
    demo: 0,
    starter: 1,
    creator: 2,
    pro: 3,
    scale: 3,
    agency: 4,
  };

  const requiredLevel = planHierarchy[VISUAL_TIERS[tier].requiredPlan] ?? 0;
  const userLevel = planHierarchy[planId.toLowerCase()] ?? 0;

  return userLevel >= requiredLevel;
}

/**
 * Legacy flat credit costs — DEPRECATED, kept for backward compatibility.
 * The new variable credit system in VISUAL_TIERS supersedes these.
 * @deprecated Use calculateVideoCreditCost() and VISUAL_TIERS instead.
 */
export const CREDIT_COSTS = {
  VIDEO_GENERATION: 25,
  THUMBNAIL_GENERATION: 5,
  COPILOT_REQUEST: 1,
} as const;
