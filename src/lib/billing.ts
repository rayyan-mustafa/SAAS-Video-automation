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
    credits_monthly: 375,
    estimated_videos: 15,
    estimated_shorts: 30,
    max_channels: 1,
    max_resolution: '1080p Full HD',
    is_popular: false,
    cta_label: 'Get Starter Plan ($29/mo)',
    features: [
      '15 Full Videos / Month (Post Every Other Day)',
      '1080p Full HD MP4 Downloads & Zero Watermark',
      'Curated 1080p Stock Footage & FLUX.1 Motion Stills',
      'Cloudflare Deepgram Aura-2 High-Speed Voices',
      '3-Stage Split-Brain Viral Scripting Engine',
      'Word-Level Synced Captions & Safe Zones',
      'Single Channel Auto-Publish & Scheduling',
      'Zero-Waste Policy (Failed jobs never count)',
    ],
  },
  {
    id: 'creator',
    name: 'Creator Plan',
    price_monthly: 49,
    price_annual: 39,
    credits_monthly: 750,
    estimated_videos: 30,
    estimated_shorts: 60,
    max_channels: 2,
    max_resolution: '1080p Full HD',
    badge: 'MOST POPULAR — 1 DAILY VIDEO',
    is_popular: true,
    cta_label: 'Get Creator Plan ($49/mo)',
    features: [
      '30 Full Videos / Month (1 Post Every Single Day)',
      '100% ElevenLabs Turbo v2.5 Ultra-Realistic Voices',
      'Cinema AI Video Access (3x Credit Multiplier for Hook Scenes)',
      'Curated 1080p Stock Video + 8K FLUX.1 Motion Stills',
      'Glassmorphic Stat Cards & Sound Effects',
      '2 Connected Channels (YouTube Shorts + TikTok)',
      'Direct Multi-Platform Auto-Publish & Daily Scheduling',
      'Zero-Waste Policy (Failed jobs never count)',
    ],
  },
  {
    id: 'pro',
    name: 'Pro Automation Plan',
    price_monthly: 99,
    price_annual: 79,
    credits_monthly: 1500,
    estimated_videos: 60,
    estimated_shorts: 120,
    max_channels: 5,
    max_resolution: '4K Ultra HD',
    badge: 'MAX POWER — 2 DAILY VIDEOS',
    is_popular: false,
    cta_label: 'Get Pro Plan ($99/mo)',
    features: [
      '60 Full Videos / Month (2 Daily Videos)',
      'Unlimited Connected Channels (YouTube, TikTok, IG & FB)',
      'Google Veo 3.1 & FAL.ai Wan 2.1 Engine Access',
      'Custom Voice Cloning Studio + ElevenLabs Studio',
      'Competitor Intelligence & Viral Outliers Engine',
      'Priority Render Queue (<90s Cloudflare Processing)',
      '4K Ultra HD & High-Bitrate Video Exports',
      'VIP 24/7 Dedicated Support',
    ],
  },
];

export const DEMO_PLAN: Plan = {
  id: 'free',
  name: 'Free Demo',
  price_monthly: 0,
  price_annual: 0,
  credits_monthly: 0,
  estimated_videos: 1,
  estimated_shorts: 1,
  max_channels: 1,
  max_resolution: '1080p Preview',
  is_popular: false,
  cta_label: 'Free Demo Account',
  features: [
    '1 Free Demo Video Allowance',
    'Cloudflare Deepgram Aura-2 High-Speed Voices',
    'Curated 1080p Stock & Motion Stills',
    'Watermarked Preview Export',
    'Upgrade to Starter or Creator to unlock Auto-Publish',
  ],
};

export function getPlanById(id: string): Plan | null {
  const normalizedId = id.toLowerCase();
  if (normalizedId === 'free' || normalizedId === 'demo') return DEMO_PLAN;
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
// CREDIT COST CONSTANTS
// ============================================================

export const CREDIT_COSTS = {
  VIDEO_GENERATION: 25,
  THUMBNAIL_GENERATION: 5,
  COPILOT_REQUEST: 1,
} as const;
