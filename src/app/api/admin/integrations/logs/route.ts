import { NextResponse } from 'next/server';
import { checkAdminSession } from '@/lib/security/adminAuth';
import { IntegrationService } from '@/lib/config/integrationService';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const auth = checkAdminSession();
    if (!auth.authorized) {
      return NextResponse.json({ error: 'Unauthorized: Admin authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50', 10), 10), 200);

    const auditLogs = IntegrationService.getAuditLogs(limit);
    const testLogs = IntegrationService.getConnectionTestLogs(limit);
    const webhookEvents = IntegrationService.getWebhookEvents(limit);

    return NextResponse.json({
      success: true,
      auditLogs,
      testLogs,
      webhookEvents,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch integration logs' }, { status: 500 });
  }
}
