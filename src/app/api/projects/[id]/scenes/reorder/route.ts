import { NextRequest, NextResponse } from 'next/server';
import { getDb, ContentProject, VideoScene } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

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

    const body = await req.json();
    const { sceneIds } = body;

    if (!Array.isArray(sceneIds) || sceneIds.length === 0) {
      return NextResponse.json({ error: 'sceneIds must be a non-empty array of scene IDs' }, { status: 400 });
    }

    // Update scene_index sequentially within transaction
    const updateStmt = db.prepare('UPDATE video_scenes SET scene_index = ? WHERE id = ? AND project_id = ?');
    const updateTransaction = db.transaction((ids: string[]) => {
      ids.forEach((id, idx) => {
        updateStmt.run(idx + 1, id, projectId);
      });
    });

    updateTransaction(sceneIds);

    const reorderedScenes = db
      .prepare('SELECT id, scene_index, narration, visual_tier FROM video_scenes WHERE project_id = ? ORDER BY scene_index ASC')
      .all(projectId) as VideoScene[];

    return NextResponse.json({
      success: true,
      scenes: reorderedScenes,
      message: 'Scenes reordered successfully',
    });
  } catch (err: any) {
    console.error('[ReorderScenes] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to reorder scenes' }, { status: 500 });
  }
}
