import { NextRequest, NextResponse } from 'next/server';
import { getDb, getUserCredits } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { CREDIT_COSTS } from '@/lib/billing';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = params.id;
    const db = getDb();

    const project = db
      .prepare('SELECT * FROM content_projects WHERE id = ? AND user_id = ?')
      .get(projectId, user.id) as any;

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const userCredits = getUserCredits(user.id);
    const creditsRequired = CREDIT_COSTS.VIDEO_GENERATION || 25;

    // Calculate real average render time from database history if available
    const avgStats = db.prepare(`
      SELECT AVG((julianday(completed_at) - julianday(started_at)) * 86400) as avg_sec
      FROM video_jobs
      WHERE status = 'COMPLETED' AND started_at IS NOT NULL AND completed_at IS NOT NULL
    `).get() as any;

    const estimatedRenderSeconds = Math.max(60, Math.round(avgStats?.avg_sec || 180));
    const targetLengthMin = project.target_length_minutes || 3;
    const resolution = userCredits.tier === 'PRO' ? '4K Ultra HD (2160p)' : '1080p Full HD';

    return NextResponse.json({
      success: true,
      projectId: project.id,
      topic: project.topic,
      creditsRequired,
      userBalance: userCredits.balance,
      sufficientCredits: userCredits.balance >= creditsRequired,
      estimatedRenderSeconds,
      estimatedRenderTimeFormatted: `${Math.round(estimatedRenderSeconds / 60)} minutes`,
      resolution,
      targetDurationMinutes: targetLengthMin,
      refundPolicy: {
        guaranteed: true,
        statement: '100% Zero-Waste Policy: If video generation encounters any failure, all credits are instantly refunded back to your balance.',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to generate cost preview' }, { status: 500 });
  }
}
