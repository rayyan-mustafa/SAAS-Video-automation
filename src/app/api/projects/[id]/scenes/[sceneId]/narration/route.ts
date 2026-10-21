import { NextRequest, NextResponse } from 'next/server';
import {
  getDb,
  ContentProject,
  VideoScene,
  Channel,
  saveSceneHistory,
  checkAndConsumeFreeEdit,
  getUserCredits,
} from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { validateNarrationModeration } from '@/lib/video/moderationGuard';
import { voiceProvider } from '@/lib/providers/voiceProvider';
import { storage } from '@/lib/storage';
import { ffmpegCompositor } from '@/lib/providers/ffmpegCompositor';
import { subtitleProvider } from '@/lib/providers/subtitleProvider';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; sceneId: string } }
) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId, sceneId } = params;
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

    const scene = db
      .prepare('SELECT * FROM video_scenes WHERE project_id = ? AND (id = ? OR scene_index = ?)')
      .get(projectId, sceneId, Number(sceneId)) as VideoScene | undefined;

    if (!scene) {
      return NextResponse.json({ error: 'Scene not found' }, { status: 404 });
    }

    const body = await req.json();
    const { narration } = body;

    if (!narration || typeof narration !== 'string' || !narration.trim()) {
      return NextResponse.json({ error: 'Valid narration text is required' }, { status: 400 });
    }

    const cleanNarration = narration.trim();

    // 1. Content Moderation Guard
    const modResult = validateNarrationModeration(cleanNarration);
    if (!modResult.allowed) {
      return NextResponse.json(
        {
          error: modResult.reason || 'Narration edit violated content safety policy',
          flaggedCategory: modResult.flaggedCategory,
        },
        { status: 400 }
      );
    }

    // 2. Save history snapshot for 1-click undo
    saveSceneHistory(scene.id);

    // 3. Resolve voice & synthesize audio for this single scene
    const channel = db.prepare('SELECT * FROM channels WHERE id = ?').get(project.channel_id) as Channel | undefined;
    const voiceName = channel?.voice || 'en-US-ChristopherNeural';
    const voiceSpeed = channel?.voice_speed || '1.0x';

    const voiceRes = await voiceProvider.generateVoiceover({
      text: cleanNarration,
      voiceName,
      voiceSpeed,
      language: project.language || channel?.language || 'en',
      projectId,
    });

    if (!voiceRes.audioBuffer || voiceRes.audioBuffer.length < 500) {
      return NextResponse.json({ error: 'Voiceover synthesis returned empty audio' }, { status: 500 });
    }

    const sceneAudioKey = `audio/${projectId}/scene_${scene.scene_index}.${voiceRes.format}`;
    await storage.putObject(sceneAudioKey, voiceRes.audioBuffer, `audio/${voiceRes.format}`);

    const newDurationSec = voiceRes.durationSec > 0 ? voiceRes.durationSec : 4;

    // 4. Update scene narration and duration
    db.prepare(`
      UPDATE video_scenes 
      SET narration = ?, subtitle_text = ?, audio_storage_key = ?, audio_duration_sec = ?, estimated_duration_sec = ?
      WHERE id = ?
    `).run(cleanNarration, cleanNarration, sceneAudioKey, newDurationSec, newDurationSec, scene.id);

    // 5. Consume free edit quota (up to 5 free per project) or charge 2 credits for re-voice overage
    const editQuota = checkAndConsumeFreeEdit(projectId, user.id, 2);

    return NextResponse.json({
      success: true,
      sceneId: scene.id,
      sceneIndex: scene.scene_index,
      narration: cleanNarration,
      durationSec: newDurationSec,
      isFree: editQuota.isFree,
      creditsDeducted: editQuota.creditsDeducted,
      remainingFreeEdits: editQuota.remainingFreeEdits,
      message: `Scene ${scene.scene_index} re-voiced successfully (${newDurationSec}s)`,
    });
  } catch (err: any) {
    console.error('[RevoiceNarration] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to re-voice scene' }, { status: 500 });
  }
}
