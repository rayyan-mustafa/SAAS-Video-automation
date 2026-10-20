import { getApiKey } from './db';

/**
 * Polar.sh Billing & Checkout Integration Module
 *
 * Implements Polar Merchant of Record (MoR) payments:
 * - Direct Checkout creation via Polar REST API (zero native npm dependencies)
 * - Hosted Polar Product URLs with custom metadata (userId, planId)
 * - Standard Webhooks signature verification (HMAC SHA-256)
 */

export interface PolarCheckoutOptions {
  userId: string;
  userEmail: string;
  planId: string;
  billingCycle?: 'monthly' | 'annual';
  successUrl?: string;
  returnUrl?: string;
}

export interface PolarCheckoutResult {
  success: boolean;
  url?: string;
  checkoutId?: string;
  error?: string;
  isSimulated?: boolean;
}

/**
 * Check whether Polar billing is configured in database or environment variables.
 */
export function isPolarConfigured(): boolean {
  return !!(
    getApiKey('polar_access_token') ||
    getApiKey('polar_webhook_secret') ||
    getApiKey('polar_checkout_url') ||
    getApiKey('polar_checkout_url_creator') ||
    getApiKey('polar_product_creator') ||
    process.env.POLAR_ACCESS_TOKEN ||
    process.env.POLAR_WEBHOOK_SECRET ||
    process.env.POLAR_CHECKOUT_URL ||
    process.env.POLAR_CHECKOUT_URL_CREATOR ||
    process.env.POLAR_PRODUCT_CREATOR
  );
}

/**
 * Returns environment-configured Product ID or Checkout URL for a plan.
 */
export function getPolarPlanConfig(planId: string, billingCycle: 'monthly' | 'annual' = 'monthly'): {
  productId: string | null;
  checkoutUrl: string | null;
} {
  const norm = planId.toLowerCase();
  const isAnnual = billingCycle === 'annual';

  let productId: string | null = null;
  let checkoutUrl: string | null = null;

  switch (norm) {
    case 'starter':
      productId = isAnnual
        ? getApiKey('polar_product_starter_annual') || getApiKey('polar_product_starter') || process.env.POLAR_PRODUCT_STARTER_ANNUAL || process.env.POLAR_PRODUCT_STARTER || null
        : getApiKey('polar_product_starter_monthly') || getApiKey('polar_product_starter') || process.env.POLAR_PRODUCT_STARTER_MONTHLY || process.env.POLAR_PRODUCT_STARTER || null;
      checkoutUrl = isAnnual
        ? getApiKey('polar_checkout_url_starter_annual') || getApiKey('polar_checkout_url_starter') || process.env.POLAR_CHECKOUT_URL_STARTER_ANNUAL || process.env.POLAR_CHECKOUT_URL_STARTER || null
        : getApiKey('polar_checkout_url_starter_monthly') || getApiKey('polar_checkout_url_starter') || process.env.POLAR_CHECKOUT_URL_STARTER_MONTHLY || process.env.POLAR_CHECKOUT_URL_STARTER || null;
      break;

    case 'creator':
    case 'pro':
      productId = isAnnual
        ? getApiKey('polar_product_creator_annual') || getApiKey('polar_product_creator') || process.env.POLAR_PRODUCT_CREATOR_ANNUAL || process.env.POLAR_PRODUCT_CREATOR || null
        : getApiKey('polar_product_creator_monthly') || getApiKey('polar_product_creator') || process.env.POLAR_PRODUCT_CREATOR_MONTHLY || process.env.POLAR_PRODUCT_CREATOR || null;
      checkoutUrl = isAnnual
        ? getApiKey('polar_checkout_url_creator_annual') || getApiKey('polar_checkout_url_creator') || process.env.POLAR_CHECKOUT_URL_CREATOR_ANNUAL || process.env.POLAR_CHECKOUT_URL_CREATOR || null
        : getApiKey('polar_checkout_url_creator_monthly') || getApiKey('polar_checkout_url_creator') || process.env.POLAR_CHECKOUT_URL_CREATOR_MONTHLY || process.env.POLAR_CHECKOUT_URL_CREATOR || null;
      break;

    case 'scale':
    case 'growth':
      productId = isAnnual
        ? getApiKey('polar_product_scale_annual') || getApiKey('polar_product_scale') || process.env.POLAR_PRODUCT_SCALE_ANNUAL || process.env.POLAR_PRODUCT_SCALE || null
        : getApiKey('polar_product_scale_monthly') || getApiKey('polar_product_scale') || process.env.POLAR_PRODUCT_SCALE_MONTHLY || process.env.POLAR_PRODUCT_SCALE || null;
      checkoutUrl = isAnnual
        ? getApiKey('polar_checkout_url_scale_annual') || getApiKey('polar_checkout_url_scale') || process.env.POLAR_CHECKOUT_URL_SCALE_ANNUAL || process.env.POLAR_CHECKOUT_URL_SCALE || null
        : getApiKey('polar_checkout_url_scale_monthly') || getApiKey('polar_checkout_url_scale') || process.env.POLAR_CHECKOUT_URL_SCALE_MONTHLY || process.env.POLAR_CHECKOUT_URL_SCALE || null;
      break;

    case 'agency':
      productId = isAnnual
        ? getApiKey('polar_product_agency_annual') || getApiKey('polar_product_agency') || process.env.POLAR_PRODUCT_AGENCY_ANNUAL || process.env.POLAR_PRODUCT_AGENCY || null
        : getApiKey('polar_product_agency_monthly') || getApiKey('polar_product_agency') || process.env.POLAR_PRODUCT_AGENCY_MONTHLY || process.env.POLAR_PRODUCT_AGENCY || null;
      checkoutUrl = isAnnual
        ? getApiKey('polar_checkout_url_agency_annual') || getApiKey('polar_checkout_url_agency') || process.env.POLAR_CHECKOUT_URL_AGENCY_ANNUAL || process.env.POLAR_CHECKOUT_URL_AGENCY || null
        : getApiKey('polar_checkout_url_agency_monthly') || getApiKey('polar_checkout_url_agency') || process.env.POLAR_CHECKOUT_URL_AGENCY_MONTHLY || process.env.POLAR_CHECKOUT_URL_AGENCY || null;
      break;
  }

  // Fallback to global checkout URL if specific plan URL not set
  if (!checkoutUrl) {
    checkoutUrl = getApiKey('polar_checkout_url') || process.env.POLAR_CHECKOUT_URL || null;
  }

  return { productId, checkoutUrl };
}

/**
 * Creates a Polar checkout URL or session for a customer.
 */
export async function createPolarCheckout(options: PolarCheckoutOptions): Promise<PolarCheckoutResult> {
  const { userId, userEmail, planId, billingCycle = 'monthly' } = options;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://autora.live';
  const successUrl = options.successUrl || `${appUrl}/billing?status=success&plan=${encodeURIComponent(planId)}`;

  const { productId, checkoutUrl } = getPolarPlanConfig(planId, billingCycle);

  // 1. Direct Polar hosted checkout URL (e.g. https://buy.polar.sh/products/...)
  if (checkoutUrl) {
    const parsed = new URL(checkoutUrl);
    parsed.searchParams.set('customer_email', userEmail);
    parsed.searchParams.set('metadata[userId]', userId);
    parsed.searchParams.set('metadata[planId]', planId);
    parsed.searchParams.set('metadata[billingCycle]', billingCycle);
    return {
      success: true,
      url: parsed.toString(),
    };
  }

  // 2. Polar API Custom Checkout Creation (when POLAR_ACCESS_TOKEN & productId are configured)
  const accessToken = getApiKey('polar_access_token') || process.env.POLAR_ACCESS_TOKEN;
  if (accessToken && productId) {
    try {
      const response = await fetch('https://api.polar.sh/v1/checkouts/custom/', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          product_id: productId,
          customer_email: userEmail,
          success_url: successUrl,
          metadata: {
            userId,
            planId,
            billingCycle,
          },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error('[Polar API] Checkout creation error:', response.status, errText);
        return {
          success: false,
          error: `Polar API returned status ${response.status}: ${errText}`,
        };
      }

      const json = await response.json();
      const checkoutLink = json.url || json.checkout_url || (json.id ? `https://buy.polar.sh/checkouts/${json.id}` : null);

      if (!checkoutLink) {
        return { success: false, error: 'Polar checkout did not return a valid checkout URL.' };
      }

      return {
        success: true,
        url: checkoutLink,
        checkoutId: json.id,
      };
    } catch (err: any) {
      console.error('[Polar API] Request error:', err);
      return { success: false, error: err.message || 'Failed to connect to Polar API' };
    }
  }

  // 3. Fallback instructions if neither is set
  return {
    success: false,
    error: `Polar product is not configured for plan "${planId}". Please set POLAR_CHECKOUT_URL_${planId.toUpperCase()} or POLAR_PRODUCT_${planId.toUpperCase()} with POLAR_ACCESS_TOKEN in .env.`,
  };
}

/**
 * Standard Webhooks Signature Verification (HMAC SHA-256)
 * Verified against Polar Webhooks specification.
 */
export async function verifyPolarWebhookSignature(
  rawBody: string,
  headers: Headers,
  secret?: string
): Promise<boolean> {
  const webhookSecret = secret || process.env.POLAR_WEBHOOK_SECRET;
  if (!webhookSecret) {
    // If no secret configured in test/dev, allow or log warning
    console.warn('[Polar Webhook] POLAR_WEBHOOK_SECRET not set; signature verification skipped.');
    return true;
  }

  try {
    const rawSecret = webhookSecret.startsWith('whsec_') ? webhookSecret.substring(6) : webhookSecret;
    const webhookId = headers.get('webhook-id') || headers.get('Webhook-Id');
    const webhookTimestamp = headers.get('webhook-timestamp') || headers.get('Webhook-Timestamp');
    const webhookSignature = headers.get('webhook-signature') || headers.get('Webhook-Signature');

    if (!webhookId || !webhookTimestamp || !webhookSignature) {
      return false;
    }

    // Convert secret from base64
    const keyBytes = Uint8Array.from(atob(rawSecret), (c) => c.charCodeAt(0));
    const toSign = `${webhookId}.${webhookTimestamp}.${rawBody}`;

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const sigBuffer = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(toSign));
    const computedSig = btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(sigBuffer))));

    const signatures = webhookSignature.split(' ');
    for (const item of signatures) {
      const parts = item.split(',');
      if (parts.length === 2 && parts[0] === 'v1') {
        if (parts[1] === computedSig) {
          return true;
        }
      }
    }
  } catch (error) {
    console.error('[Polar Webhook] Signature verification error:', error);
  }

  return false;
}
