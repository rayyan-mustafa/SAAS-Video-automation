import { NextRequest, NextResponse } from 'next/server';
import { getDb, getUserCredits, deductUserCredits, ContentProject, VideoScene } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { validateNarrationModeration } from '@/lib/video/moderationGuard';
import { calculateWorstCaseQuote, SceneCostEstimate } from '@/lib/billing/priceLockEngine';
import { videoWorker } from '@/lib/queue/worker';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = params.id;
    const db = getDb();

    const project = db
      .prepare('SELECT * FROM content_projects WHERE id = ?')
      .get(projectId) as ContentProject | undefined;

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const isAdmin = user.role === 'ADMIN' || user.role === 'admin';
    if (project.user_id !== user.id && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse any storyboard edits submitted with approval
    const body = await req.json().catch(() => ({}));
    const editedScenes = body?.editedScenes as Array<{
      sceneIndex: number;
      narration?: string;
      visualTier?: string;
    }> | undefined;

    // Apply any edited scene narrations or visual tiers
    if (Array.isArray(editedScenes) && editedScenes.length > 0) {
      for (const sceneUpdate of editedScenes) {
        if (sceneUpdate.narration) {
          const modResult = validateNarrationModeration(sceneUpdate.narration);
          if (!modResult.allowed) {
            return NextResponse.json(
              {
                error: modResult.reason || 'Narration edit violated content safety policy',
                flaggedCategory: modResult.flaggedCategory,
                sceneIndex: sceneUpdate.sceneIndex,
              },
              { status: 400 }
            );
          }

          db.prepare(
            `UPDATE video_scenes 
             SET narration = ?, subtitle_text = ? 
             WHERE project_id = ? AND scene_index = ?`
          ).run(sceneUpdate.narration, sceneUpdate.narration, projectId, sceneUpdate.sceneIndex);
        }

        if (sceneUpdate.visualTier) {
          db.prepare(
            `UPDATE video_scenes 
             SET visual_tier = ? 
             WHERE project_id = ? AND scene_index = ?`
          ).run(sceneUpdate.visualTier, projectId, sceneUpdate.sceneIndex);
        }
      }
    }

    // Safety validation on all current scene narrations
    const scenes = db
      .prepare('SELECT * FROM video_scenes WHERE project_id = ? ORDER BY scene_index ASC')
      .all(projectId) as VideoScene[];

    if (scenes.length === 0) {
      return NextResponse.json(
        { error: 'No scenes found for project plan. Generate plan first.' },
        { status: 400 }
      );
    }

    for (const scene of scenes) {
      const modResult = validateNarrationModeration(scene.narration);
      if (!modResult.allowed) {
        return NextResponse.json(
          {
            error: modResult.reason || `Scene ${scene.scene_index} narration violated content safety policy`,
            flaggedCategory: modResult.flaggedCategory,
            sceneIndex: scene.scene_index,
          },
          { status: 400 }
        );
      }
    }

    // Calculate worst-case credit quote ceiling
    const sceneEstimates: SceneCostEstimate[] = scenes.map((s) => ({
      sceneIndex: s.scene_index,
      visualTier: s.visual_tier || 'motion_still',
      durationSec: s.estimated_duration_sec || 4,
    }));

    const quote = calculateWorstCaseQuote({
      targetLengthMinutes: project.target_length_minutes || 1,
      scenes: sceneEstimates,
    });

    const userCredits = getUserCredits(user.id);
    if (!userCredits || userCredits.balance < quote.totalQuotedCredits) {
      return NextResponse.json(
        {
          error: `Insufficient credits. Quoted worst-case ceiling is ${quote.totalQuotedCredits} credits, but your balance is ${userCredits?.balance || 0}.`,
          quotedCredits: quote.totalQuotedCredits,
          balance: userCredits?.balance || 0,
        },
        { status: 402 }
      );
    }

    const now = new Date().toISOString();

    // Deduct quoted credits upfront under price-lock hold
    deductUserCredits(
      user.id,
      quote.totalQuotedCredits,
      'PRICE_LOCK_APPROVAL_HOLD',
      `Price Lock Approval Hold: ${project.topic.substring(0, 30)} (ceiling ${quote.totalQuotedCredits} credits)`,
      projectId
    );

    // Update project state to approved and processing
    db.prepare(
      `UPDATE content_projects 
       SET status = 'PROCESSING', 
           current_stage = 'VOICE', 
           approved_at = ?, 
           quoted_credits = ?,
           length_band = ?,
           updated_at = ?
       WHERE id = ?`
    ).run(now, quote.totalQuotedCredits, quote.lengthBand, now, projectId);

    // Launch pipeline execution from VOICE stage onwards
    videoWorker.startProjectPipeline(projectId, 'VOICE');

    return NextResponse.json({
      success: true,
      projectId,
      status: 'PROCESSING',
      approvedAt: now,
      quotedCredits: quote.totalQuotedCredits,
      lengthBand: quote.lengthBand,
      baseCredits: quote.baseCredits,
      extraCredits: quote.extraCredits,
      userBalanceRemaining: userCredits.balance - quote.totalQuotedCredits,
    });
  } catch (err: any) {
    console.error('Project approval error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to approve project' },
      { status: 500 }
    );
  }
}
