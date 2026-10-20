import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import {
  getPersonalCreatorProject,
  getPersonalCreatorScenes,
  updatePersonalCreatorProject,
  deletePersonalCreatorProject,
} from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
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

    // Tenant authorization check
    if (project.user_id !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'You do not have access to this project' }, { status: 403 });
    }

    const scenes = getPersonalCreatorScenes(id);

    return NextResponse.json({
      project,
      scenes,
    });
  } catch (err: any) {
    console.error('[API /api/personal-ai/projects/[id] GET] Error:', err);
    return NextResponse.json({ error: 'Failed to fetch project' }, { status: 500 });
  }
}

export async function DELETE(
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

    deletePersonalCreatorProject(id, user.role === 'ADMIN' ? project.user_id : user.id);

    return NextResponse.json({ success: true, message: 'Project deleted successfully' });
  } catch (err: any) {
    console.error('[API /api/personal-ai/projects/[id] DELETE] Error:', err);
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
  }
}

export async function PATCH(
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

    const body = await req.json().catch(() => ({}));
    updatePersonalCreatorProject(id, user.id, body);

    const updated = getPersonalCreatorProject(id, user.id);
    return NextResponse.json({ project: updated });
  } catch (err: any) {
    console.error('[API /api/personal-ai/projects/[id] PATCH] Error:', err);
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
  }
}
