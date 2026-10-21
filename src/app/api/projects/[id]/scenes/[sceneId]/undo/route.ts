import { NextRequest, NextResponse } from 'next/server';
import { getDb, ContentProject, VideoScene, revertSceneFromHistory } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

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

    const result = revertSceneFromHistory(scene.id);
    if (!result.reverted) {
      return NextResponse.json(
        { error: 'No previous history snapshot found to revert to' },
        { status: 400 }
      );
    }

    const restoredScene = db.prepare('SELECT * FROM video_scenes WHERE id = ?').get(scene.id) as VideoScene;

    return NextResponse.json({
      success: true,
      sceneId: scene.id,
      sceneIndex: scene.scene_index,
      restoredState: result.previousState,
      currentScene: restoredScene,
      message: `Scene ${scene.scene_index} reverted to previous version successfully`,
    });
  } catch (err: any) {
    console.error('[UndoScene] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to undo scene edit' }, { status: 500 });
  }
}
