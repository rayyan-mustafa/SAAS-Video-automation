import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getDb, DEFAULT_USER_ID, ContentProject, Channel } from '@/lib/db';
import { thumbnailProvider } from '@/lib/providers/thumbnailProvider';

import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const db = getDb();

    const project = db
      .prepare(
        `SELECT p.*, c.name as channel_name, c.niche as channel_niche, c.visual_style as channel_visual_style 
         FROM content_projects p 
         JOIN channels c ON p.channel_id = c.id 
         WHERE p.id = ? AND p.user_id = ?`
      )
      .get(id, user.id) as (ContentProject & { channel_name: string; channel_niche: string; channel_visual_style: string }) | undefined;

    if (!project) {
      return NextResponse.json({ error: 'Project not found or access denied.' }, { status: 404 });
    }

    const thumbRes = await thumbnailProvider.generateThumbnail({
      projectId: project.id,
      channelName: project.channel_name,
      niche: project.channel_niche,
      title: project.topic,
      visualStyle: project.channel_visual_style,
    });

    const now = new Date().toISOString();

    db.prepare("DELETE FROM generated_assets WHERE project_id = ? AND asset_type = 'thumbnail'").run(project.id);
    db.prepare(
      `INSERT INTO generated_assets (id, project_id, asset_type, storage_key, url, metadata_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      uuidv4(),
      project.id,
      'thumbnail',
      thumbRes.storageKey,
      thumbRes.url,
      JSON.stringify({ width: thumbRes.width, height: thumbRes.height, filesizeBytes: thumbRes.filesizeBytes }),
      now
    );

    return NextResponse.json({
      message: 'Thumbnail generated successfully',
      thumbnail: {
        url: thumbRes.url,
        storageKey: thumbRes.storageKey,
        width: thumbRes.width,
        height: thumbRes.height,
        filesizeBytes: thumbRes.filesizeBytes,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to generate thumbnail' }, { status: 500 });
  }
}
