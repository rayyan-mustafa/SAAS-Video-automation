import { NextResponse } from 'next/server';
import { getDb, DEFAULT_USER_ID, ContentProject, Channel, VideoOutput, GeneratedAsset } from '@/lib/db';
import { publishingProvider, SupportedPlatform, PublishResult } from '@/lib/providers/publishingProvider';
import { storage } from '@/lib/storage';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: Request, { params }: { params: any }) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const id = resolvedParams?.id;
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { visibility = 'PRIVATE', scheduleTime = null, platform = 'YouTube' } = body;

    const db = getDb();
    const isAdmin = user.role === 'ADMIN' || user.role === 'admin';
    const project = db
      .prepare(
        `SELECT p.*, c.name as channel_name, c.publishing_platform as channel_platform 
         FROM content_projects p 
         JOIN channels c ON p.channel_id = c.id 
         WHERE p.id = ?`
      )
      .get(id) as (ContentProject & { channel_name: string; channel_platform: string }) | undefined;

    if (!project) {
      return NextResponse.json({ error: 'Project does not exist' }, { status: 404 });
    }

    if (project.user_id && project.user_id !== user.id && !isAdmin) {
      return NextResponse.json({ error: 'You do not have access to this project' }, { status: 403 });
    }

    if (project.status !== 'COMPLETED') {
      return NextResponse.json({ error: 'Video generation is not complete yet.' }, { status: 400 });
    }

    const output = db.prepare('SELECT * FROM video_outputs WHERE project_id = ?').get(id) as VideoOutput | undefined;
    if (!output) {
      return NextResponse.json({ error: 'No final video output file available to publish.' }, { status: 400 });
    }

    const thumbnail = db.prepare("SELECT * FROM generated_assets WHERE project_id = ? AND asset_type = 'thumbnail' ORDER BY created_at DESC LIMIT 1").get(id) as GeneratedAsset | undefined;
    const videoFilePath = storage.getFilePath(output.storage_key);
    const thumbnailFilePath = thumbnail ? storage.getFilePath(thumbnail.storage_key) : undefined;

    let parsedMeta = { youtubeTitle: project.topic, description: project.topic, tags: [] as string[] };
    if (project.metadata_json) {
      try {
        parsedMeta = JSON.parse(project.metadata_json);
      } catch {}
    }

    const rawPlatforms: string[] = Array.isArray(body.platforms) && body.platforms.length > 0
      ? body.platforms
      : [body.platform || project.platform || 'YouTube'];

    // Map platforms to SupportedPlatform
    const targetPlatforms: SupportedPlatform[] = rawPlatforms.map((p) => {
      const lower = p.toLowerCase();
      if (lower.includes('tik')) return 'TikTok';
      if (lower.includes('insta') || lower.includes('reel')) return 'Instagram';
      if (lower.includes('face') || lower.includes('fb')) return 'Facebook';
      return 'YouTube';
    });

    // If scheduling for a future time
    if (scheduleTime && new Date(scheduleTime).getTime() > Date.now()) {
      const scheduledIso = new Date(scheduleTime).toISOString();
      db.prepare(
        `UPDATE content_projects SET 
          publishing_status = 'SCHEDULED', 
          scheduled_at = ?, 
          visibility = ?, 
          platform = ?, 
          updated_at = ? 
         WHERE id = ?`
      ).run(scheduledIso, visibility, targetPlatforms.join(', '), new Date().toISOString(), id);

      return NextResponse.json({
        message: `Video scheduled for ${scheduledIso} on ${targetPlatforms.join(', ')}`,
        publishingStatus: 'SCHEDULED',
        scheduledAt: scheduledIso,
        platforms: targetPlatforms,
      });
    }

    // Direct Instant Publishing across selected platforms
    const publishStartTime = new Date().toISOString();
    db.prepare(
      `UPDATE content_projects SET 
        publishing_status = 'UPLOADING', 
        publish_started_at = ?, 
        visibility = ?, 
        publish_error = NULL, 
        updated_at = ? 
       WHERE id = ?`
    ).run(publishStartTime, visibility, publishStartTime, id);

    const results: PublishResult[] = [];
    let anySuccess = false;
    let anyFailed = false;

    for (const plat of targetPlatforms) {
      try {
        const pubResult = await publishingProvider.publishVideo({
          projectId: project.id,
          platform: plat,
          videoFilePath,
          title: parsedMeta.youtubeTitle || project.topic,
          description: parsedMeta.description || project.topic,
          tags: parsedMeta.tags || [],
          thumbnailFilePath,
          visibility: visibility as any,
          userId: user.id,
        });

        results.push(pubResult);
        if (pubResult.status === 'PUBLISHED' || pubResult.status === 'SCHEDULED') {
          anySuccess = true;
        } else {
          anyFailed = true;
        }
      } catch (platErr: any) {
        results.push({
          status: 'FAILED',
          platform: plat,
          errorMessage: platErr.message || 'Execution error',
          platformUrl: undefined,
          platformVideoId: undefined,
        });
        anyFailed = true;
      }
    }

    const publishEndTime = new Date().toISOString();
    const primaryResult = results[0];
    const finalStatus = anySuccess ? 'PUBLISHED' : (results.some((r) => r.status === 'NOT_CONNECTED') ? 'NOT_CONNECTED' : 'FAILED');
    const successfulUrls = results.filter((r) => r.platformUrl).map((r) => `${r.platform}: ${r.platformUrl}`).join(' | ');

    db.prepare(
      `UPDATE content_projects SET 
        publishing_status = ?, 
        published_at = ?, 
        publish_completed_at = ?, 
        publish_provider = ?, 
        publish_video_id = ?, 
        publish_url = ?, 
        publish_error = ?, 
        updated_at = ? 
       WHERE id = ?`
    ).run(
      finalStatus,
      anySuccess ? publishEndTime : null,
      publishEndTime,
      targetPlatforms.join(', '),
      primaryResult?.platformVideoId || null,
      successfulUrls || primaryResult?.platformUrl || null,
      anyFailed ? results.filter((r) => r.errorMessage).map((r) => `${r.platform}: ${r.errorMessage}`).join('; ') : null,
      publishEndTime,
      id
    );

    return NextResponse.json({
      message: anySuccess
        ? `Video published successfully to ${targetPlatforms.join(', ')}`
        : `Publishing encountered issues across target platforms`,
      publishingStatus: finalStatus,
      platforms: targetPlatforms,
      results,
      videoUrl: successfulUrls || primaryResult?.platformUrl,
    }, { status: anySuccess ? 200 : 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Publishing request failed' }, { status: 500 });
  }
}
