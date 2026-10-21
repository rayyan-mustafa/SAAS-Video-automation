import { NextResponse } from 'next/server';
import { checkAdminSession } from '@/lib/security/adminAuth';
import { IntegrationService } from '@/lib/config/integrationService';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const auth = checkAdminSession();
    if (!auth.authorized) {
      return NextResponse.json({ error: 'Unauthorized: Admin authentication required' }, { status: 401 });
    }

    const gateways = IntegrationService.getAllPaymentGateways();
    return NextResponse.json({
      success: true,
      gateways,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch payment gateways' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = checkAdminSession();
    if (!auth.authorized) {
      return NextResponse.json({ error: 'Unauthorized: Admin authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { provider, mode, isEnabled, isDefault, credentials, settings, webhookSecret, makeDefault } = body;

    if (!provider || (provider !== 'stripe' && provider !== 'polar')) {
      return NextResponse.json({ error: 'Valid provider (stripe or polar) is required' }, { status: 400 });
    }

    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined;

    if (makeDefault === true) {
      IntegrationService.setDefaultPaymentGateway(provider, auth.username || 'admin', ipAddress);
      return NextResponse.json({
        success: true,
        message: `${provider.toUpperCase()} set as default payment gateway`,
        gateways: IntegrationService.getAllPaymentGateways(),
      });
    }

    const success = IntegrationService.savePaymentGateway(
      provider,
      {
        mode,
        isEnabled,
        isDefault,
        credentials,
        settings,
        webhookSecret,
      },
      auth.username || 'admin',
      ipAddress
    );

    const updated = IntegrationService.getPaymentGateway(provider);

    return NextResponse.json({
      success,
      message: `${updated?.displayName || provider} gateway configuration updated successfully`,
      gateway: updated,
      gateways: IntegrationService.getAllPaymentGateways(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update payment gateway' }, { status: 500 });
  }
}
