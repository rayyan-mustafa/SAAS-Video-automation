/**
 * Public pricing data for marketing pages (landing, /pricing, use-case pages).
 *
 * Keep in sync with PLANS in src/lib/billing.ts (the billing source of truth).
 * This file is plain data with no server imports so it is safe in client components.
 */

export interface PublicPlan {
  id: 'starter' | 'creator' | 'pro';
  name: string;
  monthly: number;
  annual: number; // per month, billed annually
  credits: number;
  blurb: string;
  popular?: boolean;
  features: string[];
}

export const PUBLIC_PLANS: PublicPlan[] = [
  {
    id: 'starter',
    name: 'Starter',
    monthly: 29,
    annual: 24,
    credits: 500,
    blurb: 'For solo creators posting a few times a week.',
    features: [
      '500 credits per month',
      '1080p MP4 exports, no watermark',
      'Neural narration voices (US, UK, AU, IN English)',
      'Stock footage and AI motion-still visuals',
      'Word-by-word captions',
      '1 connected publishing channel',
      'Automatic credit refund on failed renders',
    ],
  },
  {
    id: 'creator',
    name: 'Creator',
    monthly: 49,
    annual: 39,
    credits: 1200,
    blurb: 'For channels posting a video every day.',
    popular: true,
    features: [
      '1,200 credits per month',
      'Everything in Starter',
      'ElevenLabs narrator voices',
      'AI video clips (Veo-class models)',
      '2 connected publishing channels',
      'Competitor Outlier Spy',
      'Scene-by-scene refinement studio',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    monthly: 99,
    annual: 79,
    credits: 3000,
    blurb: 'For multi-platform publishing at volume.',
    features: [
      '3,000 credits per month',
      'Everything in Creator',
      'Publish to YouTube, TikTok, Instagram and Facebook',
      'Voice cloning (your own voice, with consent)',
      'Higher-resolution masters and priority queue',
      '5 connected publishing channels',
      'Premium AI video models',
    ],
  },
];

export const TOP_UP_PACKS = [
  { credits: 200, price: 9.99 },
  { credits: 500, price: 19.99 },
  { credits: 1500, price: 49.99 },
  { credits: 5000, price: 129.99 },
];

export const FREE_TRIAL_SUMMARY =
  'Create an account and generate a free trial video. No credit card required. Trial exports carry a Tillercast watermark.';
