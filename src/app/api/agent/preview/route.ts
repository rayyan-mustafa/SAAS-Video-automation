import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getDb, deductUserCredits, getUserCredits, DEFAULT_USER_ID } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { calculateVideoCreditCost } from '@/lib/billing';
import { AgentSession, AgentScript } from '@/lib/agent/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Missing sessionId parameter' },
        { status: 400 }
      );
    }

    const db = getDb();
    const session = db.prepare('SELECT * FROM agent_sessions WHERE id = ?').get(sessionId) as AgentSession | null;
    if (!session) {
      return NextResponse.json(
        { success: false, error: `Session not found: ${sessionId}` },
        { status: 404 }
      );
    }

    if (!session.script_json) {
      return NextResponse.json(
        { success: false, error: 'Cannot generate preview: script has not been drafted yet' },
        { status: 400 }
      );
    }

    let script: AgentScript;
    try {
      script = JSON.parse(session.script_json);
    } catch {
      return NextResponse.json({ success: false, error: 'Corrupt script JSON' }, { status: 500 });
    }

    let userId = session.user_id || DEFAULT_USER_ID;
    try {
      const user = await getCurrentUser(req);
      if (user?.id) userId = user.id;
    } catch {}

    // Calculate 50% discount preview cost
    const quote = calculateVideoCreditCost({
      scenes: script.scenes.map((s) => ({ visualTier: s.visual_tier })),
      voiceTier: script.voiceTier,
      includeThumbnail: false,
      isPreview: true,
    });

    const creditsNeeded = quote.totalCredits;
    const userCredits = getUserCredits(userId);

    if (userCredits.balance < creditsNeeded) {
      return NextResponse.json(
        {
          success: false,
          error: `Insufficient credits. Preview requires ${creditsNeeded} credits, you have ${userCredits.balance}.`,
          shortfall: creditsNeeded - userCredits.balance,
        },
        { status: 402 }
      );
    }

    // Deduct preview credits
    const projectId = session.preview_project_id || `proj_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
    const deducted = deductUserCredits(
      userId,
      creditsNeeded,
      'PREVIEW_GENERATION',
      `Video Preview (50% Rate: ${creditsNeeded} cr) for "${script.title}"`,
      projectId
    );

    if (!deducted) {
      return NextResponse.json(
        { success: false, error: 'Credit deduction failed. Please check your credit balance.' },
        { status: 402 }
      );
    }

    const now = new Date().toISOString();

    const channelRow = db.prepare('SELECT id FROM channels WHERE user_id = ? LIMIT 1').get(userId) as { id: string } | undefined;
    const channelId = channelRow?.id || 'chan__default';

    // Create or update content_project for preview
    db.prepare(`
      INSERT INTO content_projects (
        id, user_id, channel_id, topic, target_length_minutes, preset,
        status, current_stage, quoted_credits, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, 'SHORT', 'PROCESSING', 'PREVIEW', ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        status = 'COMPLETED',
        updated_at = excluded.updated_at
    `).run(
      projectId,
      userId,
      channelId,
      script.title,
      Math.ceil(script.totalEstimatedSec / 60),
      creditsNeeded,
      now,
      now
    );

    // Save scenes to video_scenes
    db.prepare('DELETE FROM video_scenes WHERE project_id = ?').run(projectId);
    for (const scene of script.scenes) {
      const sceneId = `sc_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
      db.prepare(`
        INSERT INTO video_scenes (
          id, project_id, scene_index, narration, visual_prompt,
          estimated_duration_sec, subtitle_text, visual_tier, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        sceneId,
        projectId,
        scene.sceneIndex,
        scene.narration,
        scene.visual_prompt,
        scene.estimated_duration_sec,
        scene.subtitle_text,
        scene.visual_tier,
        now
      );
    }

    // Update agent session
    db.prepare(`
      UPDATE agent_sessions
      SET preview_project_id = ?, status = 'preview_ready', updated_at = ?
      WHERE id = ?
    `).run(projectId, now, sessionId);

    // Append confirmation to chat
    const msgId = `msg_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
    db.prepare(`
      INSERT INTO agent_messages (id, session_id, role, content, metadata_json, created_at)
      VALUES (?, ?, 'agent', ?, ?, ?)
    `).run(
      msgId,
      sessionId,
      `🎥 Your video preview for "${script.title}" is ready! Consumed ${creditsNeeded} credits (50% preview discount). You can watch it, scrub through scenes, or type in chat to refine any scene.`,
      JSON.stringify({ previewReady: true, projectId, creditsDeducted: creditsNeeded }),
      now
    );

    return NextResponse.json({
      success: true,
      sessionId,
      projectId,
      previewUrl: `/api/assets/renders/${projectId}/final_preview.mp4`,
      creditsDeducted: creditsNeeded,
      remainingBalance: getUserCredits(userId).balance,
      script,
    });
  } catch (err: any) {
    console.error('[API /agent/preview] Error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to generate preview' },
      { status: 500 }
    );
  }
}
