import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getDb, ContentProject, GeneratedAsset } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { ffmpegCompositor } from '@/lib/providers/ffmpegCompositor';
import { storage } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Retrieve all scene clips in scene_index order
    const scenes = db
      .prepare('SELECT id, scene_index FROM video_scenes WHERE project_id = ? ORDER BY scene_index ASC')
      .all(projectId) as Array<{ id: string; scene_index: number }>;

    if (scenes.length === 0) {
      return NextResponse.json({ error: 'No scenes found for project' }, { status: 400 });
    }

    const clipPaths: string[] = [];
    let totalDuration = 0;

    for (const s of scenes) {
      const asset = db
        .prepare("SELECT * FROM generated_assets WHERE project_id = ? AND scene_id = ? AND asset_type = 'clip'")
        .get(projectId, s.id) as GeneratedAsset | undefined;

      if (!asset) {
        // Fallback: check by scene index key
        const key = `clips/${projectId}/scene_${s.scene_index}_clip_1.mp4`;
        const pathOnDisk = storage.getFilePath(key);
        clipPaths.push(pathOnDisk);
        totalDuration += 5;
      } else {
        clipPaths.push(storage.getFilePath(asset.storage_key));
        totalDuration += asset.duration_sec || 5;
      }
    }

    const audioAsset = db
      .prepare("SELECT * FROM generated_assets WHERE project_id = ? AND asset_type = 'audio' ORDER BY created_at DESC LIMIT 1")
      .get(projectId) as GeneratedAsset | undefined;

    const audioPath = audioAsset ? storage.getFilePath(audioAsset.storage_key) : '';

    const composition = await ffmpegCompositor.composeVideo({
      projectId,
      clipFilePaths: clipPaths,
      audioFilePath: audioPath,
      totalDurationSec: totalDuration,
      aspectRatio: ((project as any).aspect_ratio as any) || '9:16',
    });

    const now = new Date().toISOString();

    db.prepare('DELETE FROM video_outputs WHERE project_id = ?').run(projectId);
    db.prepare(
      `INSERT INTO video_outputs (id, project_id, storage_key, url, duration_sec, resolution, filesize_bytes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      uuidv4(),
      projectId,
      composition.storageKey,
      composition.url,
      composition.durationSec,
      composition.resolution,
      composition.filesizeBytes,
      now
    );

    return NextResponse.json({
      success: true,
      finalVideoUrl: composition.url,
      durationSec: composition.durationSec,
      resolution: composition.resolution,
      filesizeBytes: composition.filesizeBytes,
      message: 'Video re-composition completed successfully',
    });
  } catch (err: any) {
    console.error('[RecomposeVideo] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to recompose video' }, { status: 500 });
  }
}
