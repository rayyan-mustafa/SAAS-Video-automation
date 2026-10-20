import { NextRequest, NextResponse } from 'next/server';
import { publishingProvider, SupportedPlatform, PublishResult } from '@/lib/providers/publishingProvider';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import path from 'path';
import fs from 'fs';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    const userId = user?.id;

    const platforms: SupportedPlatform[] = ['YouTube', 'TikTok', 'Instagram'];
    const statusList = await Promise.all(
      platforms.map(async (platform) => {
        const stat = await publishingProvider.getPlatformStatus(platform, userId);
        return {
          platform,
          ...stat,
        };
      })
    );

    return NextResponse.json({ success: true, platforms: statusList });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch platform status' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: authentication required to publish videos' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const {
      projectId,
      platform,
      platforms: requestedPlatforms,
      videoFilePath,
      title,
      description,
      tags,
    } = body;

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    const db = getDb();
    const project = db.prepare('SELECT * FROM content_projects WHERE id = ?').get(projectId) as any;
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Determine target platforms
    let targetPlatforms: SupportedPlatform[] = [];
    if (Array.isArray(requestedPlatforms) && requestedPlatforms.length > 0) {
      targetPlatforms = requestedPlatforms as SupportedPlatform[];
    } else if (platform === 'ALL') {
      targetPlatforms = ['YouTube', 'TikTok', 'Instagram', 'Facebook'];
    } else if (platform) {
      targetPlatforms = [platform as SupportedPlatform];
    } else {
      // Check project metadata
      let metaPlatforms: SupportedPlatform[] = [];
      try {
        if (project.metadata_json) {
          const meta = JSON.parse(project.metadata_json);
          if (Array.isArray(meta.platforms)) metaPlatforms = meta.platforms;
        }
      } catch {}
      targetPlatforms = metaPlatforms.length > 0 ? metaPlatforms : ['YouTube'];
    }

    // Resolve video file path
    let resolvedVideoPath = videoFilePath;
    if (!resolvedVideoPath || !fs.existsSync(resolvedVideoPath)) {
      const asset = db.prepare(
        "SELECT storage_key FROM generated_assets WHERE project_id = ? AND asset_type = 'final_video' ORDER BY created_at DESC LIMIT 1"
      ).get(projectId) as any;

      if (asset?.storage_key && fs.existsSync(asset.storage_key)) {
        resolvedVideoPath = asset.storage_key;
      } else {
        const candidate = path.join(process.cwd(), 'data', 'projects', projectId, 'final.mp4');
        if (fs.existsSync(candidate)) {
          resolvedVideoPath = candidate;
        }
      }
    }

    const finalTitle = title || project.topic || 'New Video';
    const finalDescription = description || `${project.topic}\n\nAutomated via AUTORA AI`;

    const results: PublishResult[] = [];
    let anySuccess = false;

    for (const targetPlatform of targetPlatforms) {
      try {
        const res = await publishingProvider.publishVideo({
          projectId,
          platform: targetPlatform,
          videoFilePath: resolvedVideoPath || '',
          title: finalTitle,
          description: finalDescription,
          tags: tags || [project.niche || 'Shorts'],
          userId: user.id,
        });
        results.push(res);
        if (res.status === 'PUBLISHED' || res.status === 'SCHEDULED') {
          anySuccess = true;
        }
      } catch (pubErr: any) {
        results.push({
          status: 'FAILED',
          platform: targetPlatform,
          errorMessage: pubErr.message,
        });
      }
    }

    // Update project publishing status in database
    const finalPublishStatus = anySuccess ? 'PUBLISHED' : 'FAILED';
    const primaryUrl = results.find((r) => r.platformUrl)?.platformUrl || null;
    const nowIso = new Date().toISOString();

    db.prepare(`
      UPDATE content_projects
      SET publishing_status = ?,
          publish_url = COALESCE(?, publish_url),
          published_at = CASE WHEN ? = 'PUBLISHED' THEN ? ELSE published_at END,
          updated_at = ?
      WHERE id = ?
    `).run(finalPublishStatus, primaryUrl, finalPublishStatus, nowIso, nowIso, projectId);

    return NextResponse.json({
      success: true,
      projectId,
      publishingStatus: finalPublishStatus,
      targetPlatforms,
      results,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Publishing request failed' }, { status: 500 });
  }
}
