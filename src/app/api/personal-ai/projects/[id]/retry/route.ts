import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getPersonalCreatorProject, updatePersonalCreatorProject } from '@/lib/db';
import { personalCreatorPipeline } from '@/lib/video/personalCreatorPipeline';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = params;
    const project = getPersonalCreatorProject(id);

    if (!project) {
      return NextResponse.json({ error: 'Project does not exist' }, { status: 404 });
    }

    if (project.user_id !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'You do not have access to this project' }, { status: 403 });
    }

    // Reset status to QUEUED and restart background pipeline
    updatePersonalCreatorProject(id, user.id, {
      status: 'QUEUED',
      progress: 5,
      current_stage_label: 'Retrying pipeline...',
      error_message: null,
    });

    setTimeout(() => {
      personalCreatorPipeline.processProject(id, project.user_id).catch((e) => {
        console.error(`[Retry Error] Project ${id}:`, e);
      });
    }, 100);

    const updated = getPersonalCreatorProject(id, user.id);
    return NextResponse.json({ success: true, project: updated });
  } catch (err: any) {
    console.error('[API /api/personal-ai/projects/[id]/retry] Error:', err);
    return NextResponse.json({ error: 'Failed to retry project' }, { status: 500 });
  }
}
