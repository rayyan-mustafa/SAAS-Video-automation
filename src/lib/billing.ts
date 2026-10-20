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
    id: 'creator',
    name: 'Creator Plan',
    price_monthly: 49,
    price_annual: 39,
    credits_monthly: 750,
    estimated_videos: 30,
    estimated_shorts: 60,
    max_channels: 1,
    max_resolution: '1080p Full HD',
    is_popular: true,
    cta_label: 'Get Creator Plan ($49/mo)',
    features: [
      '30 Full Videos / Month (1 Daily Video)',
      'Full 1080p MP4 Immediate Downloads',
      'Microsoft Edge & ElevenLabs Studio Voices',
      'Multi-Model Script Engine (Gemini + DeepSeek)',
      'Automated Captions & Subtitle Burn-In',
      'Zero-Waste Policy (Failed jobs never count)',
      'Direct YouTube Auto-Publish & Scheduling',
    ],
  },
  {
    id: 'pro',
    name: 'Pro Automation Plan',
    price_monthly: 99,
    price_annual: 79,
    credits_monthly: 2250,
    estimated_videos: 90,
    estimated_shorts: 180,
    max_channels: 5,
    max_resolution: '4K Ultra HD',
    badge: 'MAX POWER — 3 DAILY VIDEOS',
    is_popular: false,
    cta_label: 'Get Pro Plan ($99/mo)',
    features: [
      '90 Full Videos / Month (3 Daily Videos)',
      'Unlimited Connected YouTube Channels',
      'Priority Render Queue & Ultra-Fast Processing',
      'Google Veo 3.1 & FAL.ai Wan 2.1 Engine Access',
      'Custom Cloned Voice IDs + ElevenLabs Studio',
      'Advanced Content Copilot & Workflow Automation',
      '4K Ultra HD & High-Bitrate Video Exports',
      'VIP 24/7 Dedicated Support',
    ],
  },
];

export function getPlanById(id: string): Plan | null {
  const normalizedId = id.toLowerCase();
  if (normalizedId === 'pro' || normalizedId === 'scale') return PLANS.find((p) => p.id === 'pro') || PLANS[1];
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
  const plan = getPlanById(planId) || PLANS[0];

  return {
    can_generate_video: creditBalance >= 25,
    can_publish_youtube: true,
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
