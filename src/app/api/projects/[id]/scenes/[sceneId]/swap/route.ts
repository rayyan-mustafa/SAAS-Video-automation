import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import {
  getDb,
  ContentProject,
  VideoScene,
  GeneratedAsset,
  saveSceneHistory,
  checkAndConsumeFreeEdit,
} from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { videoProvider } from '@/lib/providers/videoProvider';
import { storage } from '@/lib/storage';
import { sceneQualityChecker } from '@/lib/video/qualityControl';
import { resolveGlobalVisualStyle } from '@/lib/video/visualStyles';

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
    const { targetTier, visualPrompt, statLabel, statValue } = body;

    const allowedTiers = ['motion_still', 'graphic', 'ai_clip'];
    if (!targetTier || !allowedTiers.includes(targetTier)) {
      return NextResponse.json(
        { error: `Invalid target tier. Allowed: ${allowedTiers.join(', ')}` },
        { status: 400 }
      );
    }

    // 1. Save history for 1-click undo
    saveSceneHistory(scene.id);

    // 2. Determine credit price if beyond 5 free edits
    const operationCost = targetTier === 'ai_clip' ? 10 : 1;
    const editQuota = checkAndConsumeFreeEdit(projectId, user.id, operationCost);

    const prompt = visualPrompt || scene.visual_prompt;
    const durationSec = scene.audio_duration_sec || scene.estimated_duration_sec || 5;

    const clips = await videoProvider.generateVideoClipsForScene({
      projectId,
      sceneId: scene.id,
      sceneIndex: scene.scene_index,
      visualPrompt: prompt,
      durationSec,
      niche: 'AI & Tech',
      visualStyle: 'Cinematic High-Contrast',
      aspectRatio: '9:16',
      visualMediaMode: targetTier as any,
      visualTier: targetTier as any,
    } as any);

    const generatedClip = clips[0];
    const clipKey = generatedClip?.storageKey || `clips/${projectId}/scene_${scene.scene_index}_clip_1.mp4`;
    const clipUrl = generatedClip?.url || storage.getUrl(clipKey);
    const now = new Date().toISOString();

    // 4. Update scene visual tier and prompt
    db.prepare('UPDATE video_scenes SET visual_tier = ?, visual_prompt = ? WHERE id = ?').run(
      targetTier,
      prompt,
      scene.id
    );

    // 5. Update or insert generated asset
    const existingAsset = db
      .prepare("SELECT id FROM generated_assets WHERE project_id = ? AND scene_id = ? AND asset_type = 'clip'")
      .get(projectId, scene.id) as { id: string } | undefined;

    if (existingAsset) {
      db.prepare('UPDATE generated_assets SET storage_key = ?, url = ?, duration_sec = ?, created_at = ? WHERE id = ?')
        .run(clipKey, clipUrl, durationSec, now, existingAsset.id);
    } else {
      db.prepare(
        `INSERT INTO generated_assets (id, project_id, scene_id, asset_type, storage_key, url, duration_sec, created_at)
         VALUES (?, ?, ?, 'clip', ?, ?, ?, ?)`
      ).run(uuidv4(), projectId, scene.id, clipKey, clipUrl, durationSec, now);
    }

    return NextResponse.json({
      success: true,
      sceneId: scene.id,
      sceneIndex: scene.scene_index,
      visualTier: targetTier,
      clipUrl,
      isFree: editQuota.isFree,
      creditsDeducted: editQuota.creditsDeducted,
      remainingFreeEdits: editQuota.remainingFreeEdits,
      message: `Scene ${scene.scene_index} swapped to [${targetTier.toUpperCase()}] successfully`,
    });
  } catch (err: any) {
    console.error('[SwapSceneTier] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to swap scene tier' }, { status: 500 });
  }
}
