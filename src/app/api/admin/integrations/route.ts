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

    const integrations = IntegrationService.getAllIntegrations();
    return NextResponse.json({
      success: true,
      integrations,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch integrations' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = checkAdminSession();
    if (!auth.authorized) {
      return NextResponse.json({ error: 'Unauthorized: Admin authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { provider, credentials, settings, isActive, isPrimary } = body;

    if (!provider) {
      return NextResponse.json({ error: 'Provider is required' }, { status: 400 });
    }

    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined;

    const success = IntegrationService.saveIntegration(
      provider,
      {
        credentials,
        settings,
        isActive,
        isPrimary,
      },
      auth.username || 'admin',
      ipAddress
    );

    const updated = IntegrationService.getIntegration(provider);

    return NextResponse.json({
      success,
      message: `Integration "${updated?.displayName || provider}" updated successfully`,
      integration: updated,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update integration' }, { status: 500 });
  }
}
