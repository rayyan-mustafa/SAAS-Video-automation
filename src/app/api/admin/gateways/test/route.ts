import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { checkAdminSession } from '@/lib/security/adminAuth';
import { IntegrationService } from '@/lib/config/integrationService';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const auth = checkAdminSession();
    if (!auth.authorized) {
      return NextResponse.json({ error: 'Unauthorized: Admin authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { provider } = body;

    if (!provider || (provider !== 'stripe' && provider !== 'polar')) {
      return NextResponse.json({ error: 'Valid provider (stripe or polar) is required' }, { status: 400 });
    }

    const startTime = Date.now();

    if (provider === 'stripe') {
      const activeConfig = IntegrationService.getActivePaymentConfig();
      const secretKey = activeConfig.stripe?.secretKey || process.env.STRIPE_SECRET_KEY;

      if (!secretKey || !secretKey.startsWith('sk_')) {
        throw new Error('No valid Stripe Secret Key configured (expected key starting with sk_live_ or sk_test_)');
      }

      const stripe = new Stripe(secretKey, { apiVersion: '2024-06-20' as any });
      const balance = await stripe.balance.retrieve();
      const latencyMs = Date.now() - startTime;

      IntegrationService.logConnectionTest({
        provider: 'stripe',
        status: 'SUCCESS',
        latencyMs,
        endpoint: 'https://api.stripe.com/v1/balance',
      });

      const mode = secretKey.startsWith('sk_test_') ? 'Test / Sandbox' : 'Live Production';

      return NextResponse.json({
        success: true,
        status: 'SUCCESS',
        latencyMs,
        mode,
        message: `Stripe connection verified successfully in ${latencyMs}ms (${mode} mode). Live balance query operational.`,
      });
    }

    if (provider === 'polar') {
      const activeConfig = IntegrationService.getActivePaymentConfig();
      const token = activeConfig.polar?.accessToken || process.env.POLAR_ACCESS_TOKEN;

      if (!token) {
        throw new Error('No Polar Access Token configured.');
      }

      const res = await fetch('https://api.polar.sh/v1/organizations', {
        headers: {
          Authorization: `Bearer ${token}`,
          'User-Agent': 'Autora-Engine/2.0',
        },
        signal: AbortSignal.timeout(10000),
      });

      const latencyMs = Date.now() - startTime;

      if (!res.ok) {
        const text = await res.text();
        let errMsg = `Polar API responded with HTTP ${res.status}`;
        try {
          const parsed = JSON.parse(text);
          errMsg = parsed.detail || parsed.message || errMsg;
        } catch {}

        IntegrationService.logConnectionTest({
          provider: 'polar',
          status: 'FAILED',
          latencyMs,
          endpoint: 'https://api.polar.sh/v1/organizations',
          errorSanitized: errMsg,
        });

        return NextResponse.json({
          success: false,
          status: 'FAILED',
          latencyMs,
          message: 'Polar verification failed',
          error: errMsg,
        });
      }

      IntegrationService.logConnectionTest({
        provider: 'polar',
        status: 'SUCCESS',
        latencyMs,
        endpoint: 'https://api.polar.sh/v1/organizations',
      });

      return NextResponse.json({
        success: true,
        status: 'SUCCESS',
        latencyMs,
        message: `Polar Merchant of Record handshake verified successfully in ${latencyMs}ms.`,
      });
    }

    return NextResponse.json({ error: 'Unsupported provider' }, { status: 400 });
  } catch (err: any) {
    const errorMsg = err.message || 'Payment gateway connection test failed';
    const latencyMs = 0;

    return NextResponse.json({
      success: false,
      status: 'FAILED',
      latencyMs,
      message: errorMsg,
      error: errorMsg,
    });
  }
}
