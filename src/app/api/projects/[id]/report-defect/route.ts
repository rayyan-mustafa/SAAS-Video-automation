import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { reportBrokenVideoRefund } from '@/lib/billing/refundEngine';
import { DEFAULT_USER_ID } from '@/lib/db';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const body = await req.json().catch(() => ({}));
    const { reason = 'Corrupted frames or audio desync' } = body;

    let userId = DEFAULT_USER_ID;
    try {
      const user = await getCurrentUser(req);
      if (user?.id) userId = user.id;
    } catch {}

    const result = reportBrokenVideoRefund({
      userId,
      projectId,
      reason,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[API report-defect] Error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to report defect' },
      { status: 500 }
    );
  }
}
