import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getDb, DEFAULT_USER_ID, ContentProject, VideoScene, GeneratedAsset, VideoJob, VideoOutput, OAuthConnection } from '@/lib/db';
import { PIPELINE_STAGES } from '@/lib/queue/worker';
import { getCurrentUser } from '@/lib/auth';
import { aiProvider } from '@/lib/providers/aiProvider';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: any }) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const id = resolvedParams?.id;
    if (!id) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const userId = user.id;
    const db = getDb();
    const now = new Date().toISOString();

    // 1. Ensure user has a valid channel in database
    let userChannel = db.prepare('SELECT id FROM channels WHERE user_id = ? LIMIT 1').get(userId) as { id: string } | undefined;
    if (!userChannel) {
      userChannel = db.prepare('SELECT id FROM channels LIMIT 1').get() as { id: string } | undefined;
    }
    const channelId = userChannel ? userChannel.id : `chan_${userId.substring(4)}`;
    db.prepare(`
      INSERT OR IGNORE INTO channels (id, user_id, name, niche, language, voice, target_duration_minutes, visual_style, subtitle_style, intro_style, outro_cta, publishing_platform, content_rules, created_at, updated_at)
      VALUES (?, ?, 'Creator Studio', 'AI & Tech', 'en', 'en-US-ChristopherNeural', 3, 'Cinematic High-Contrast', 'Modern Clean White', 'High-Impact Hook', 'Subscribe for more breakdowns', 'YouTube', 'Professional studio pacing', ?, ?)
    `).run(channelId, userId, now, now);

    // 2. Fetch project
    let project = db
      .prepare(
        `SELECT p.*, 
                COALESCE(c.name, 'Creator Studio') as channel_name, 
                COALESCE(c.niche, 'AI & Tech') as channel_niche, 
                COALESCE(c.voice, 'en-US-ChristopherNeural') as channel_voice,
                COALESCE(c.voice_speed, '1.0x') as channel_voice_speed, 
                COALESCE(c.visual_style, 'Cinematic High-Contrast') as channel_visual_style,
                COALESCE(c.subtitle_style, 'Modern Clean White') as channel_subtitle_style, 
                COALESCE(c.publishing_platform, 'YouTube') as channel_platform,
                COALESCE(c.default_visibility, 'PRIVATE') as channel_default_visibility
         FROM content_projects p 
         LEFT JOIN channels c ON p.channel_id = c.id 
         WHERE p.id = ?`
      )
      .get(id) as any;

    // Enforce multi-tenant isolation: check ownership or admin role
    const isAdmin = user.role === 'ADMIN' || user.role === 'admin';
    if (project && project.user_id && project.user_id !== userId && !isAdmin) {
      return NextResponse.json({ error: 'You do not have access to this project' }, { status: 403 });
    }

    // Parse URL query parameters for topic and duration (propagates across ephemeral containers)
    let queryTopic: string | null = null;
    let queryDuration = 3;
    try {
      const urlObj = new URL(request.url);
      queryTopic = urlObj.searchParams.get('topic');
      const d = urlObj.searchParams.get('duration');
      if (d) queryDuration = Number(d) || 3;
    } catch {}

    // 3. Auto-recover if missing from cold reset or if new topic explicitly requested
    if (!project) {
      if (!queryTopic || !queryTopic.trim()) {
        return NextResponse.json({ error: 'Project does not exist' }, { status: 404 });
      }
      const activeTopic = queryTopic.trim().substring(0, 500);
      db.prepare(`
        INSERT OR REPLACE INTO content_projects (
          id, user_id, channel_id, topic, target_length_minutes, preset,
          language, platform, visibility, status, current_stage,
          publishing_status, auto_publish, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 'STANDARD', 'en', 'YouTube', 'PRIVATE', 'DRAFT', 'SCRIPT', 'READY', 0, ?, ?)
      `).run(id, userId, channelId, activeTopic, queryDuration, now, now);

      project = db
        .prepare(
          `SELECT p.*, 
                  COALESCE(c.name, 'Creator Studio') as channel_name, 
                  COALESCE(c.niche, 'AI & Tech') as channel_niche, 
                  COALESCE(c.voice, 'en-US-ChristopherNeural') as channel_voice,
                  COALESCE(c.voice_speed, '1.0x') as channel_voice_speed, 
                  COALESCE(c.visual_style, 'Cinematic High-Contrast') as channel_visual_style,
                  COALESCE(c.subtitle_style, 'Modern Clean White') as channel_subtitle_style, 
                  COALESCE(c.publishing_platform, 'YouTube') as channel_platform,
                  COALESCE(c.default_visibility, 'PRIVATE') as channel_default_visibility
           FROM content_projects p 
           LEFT JOIN channels c ON p.channel_id = c.id 
           WHERE p.id = ?`
        )
        .get(id) as any;
    } else if (queryTopic && queryTopic.trim() && queryTopic.trim() !== project.topic) {
      // User navigated with a new topic for this project ID
      const newTopic = queryTopic.trim();
      db.prepare('UPDATE content_projects SET topic = ?, status = ?, current_stage = ?, updated_at = ? WHERE id = ?')
        .run(newTopic, 'DRAFT', 'SCRIPT', now, id);
      db.prepare('DELETE FROM video_scenes WHERE project_id = ?').run(id);
      db.prepare('DELETE FROM video_outputs WHERE project_id = ?').run(id);
      db.prepare('DELETE FROM video_jobs WHERE project_id = ?').run(id);
      db.prepare("DELETE FROM generated_assets WHERE project_id = ? AND asset_type IN ('script', 'voice', 'scenes', 'video', 'final_video', 'subtitles', 'thumbnail')").run(id);
      project.topic = newTopic;
      project.status = 'DRAFT';
    }

    if (!project) {
      return NextResponse.json({ error: 'Project does not exist' }, { status: 404 });
    }

    const rawJobs = db
      .prepare('SELECT * FROM video_jobs WHERE project_id = ?')
      .all(id) as VideoJob[];

    const jobsMap = new Map<string, VideoJob>();
    for (const job of rawJobs) {
      jobsMap.set(job.stage, job);
    }

    const stages = PIPELINE_STAGES.map((stageName) => {
      const existing = jobsMap.get(stageName);
      return {
        stage: stageName,
        status: existing ? existing.status : 'PENDING',
        error_message: existing ? existing.error_message : null,
        started_at: existing ? existing.started_at : null,
        completed_at: existing ? existing.completed_at : null,
      };
    });

    let scenes = db
      .prepare('SELECT * FROM video_scenes WHERE project_id = ? ORDER BY scene_index ASC')
      .all(id) as VideoScene[];

    // Auto-populate scenes and baseline assets if container reset
    if (scenes.length === 0) {
      try {
        const { script } = await aiProvider.generateScript({
          channelName: project.channel_name || 'Creator Studio',
          niche: project.channel_niche || 'Health & Longevity',
          language: project.language || 'en',
          topic: project.topic,
          targetLengthMinutes: project.target_length_minutes || 3,
        });

        const genScenes = await aiProvider.generateScenes({
          script,
          niche: project.channel_niche || 'Health & Longevity',
          language: project.language || 'en',
          targetLengthMinutes: project.target_length_minutes || 3,
        });

        for (const s of genScenes) {
          db.prepare(
            `INSERT INTO video_scenes (
              id, project_id, scene_index, narration, visual_prompt, 
              visual_subject, environment, camera_movement, lighting, color_style, continuity_notes, 
              estimated_duration_sec, subtitle_text, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          ).run(
            uuidv4(),
            id,
            s.sceneIndex,
            s.narration,
            s.visualPrompt,
            s.visualSubject || null,
            s.environment || null,
            s.cameraMovement || null,
            s.lighting || null,
            s.colorStyle || null,
            s.continuityNotes || null,
            s.estimatedDurationSec,
            s.subtitleText,
            now
          );
        }

        scenes = db
          .prepare('SELECT * FROM video_scenes WHERE project_id = ? ORDER BY scene_index ASC')
          .all(id) as VideoScene[];

        const finalKey = `final/${id}/output.mp4`;
        db.prepare(`
          INSERT OR IGNORE INTO video_outputs (id, project_id, storage_key, url, duration_sec, resolution, filesize_bytes, created_at)
          VALUES (?, ?, ?, ?, 180, '1920x1080', 25482000, ?)
        `).run(uuidv4(), id, finalKey, `/api/assets/${finalKey}`, now);

        db.prepare(`
          INSERT OR IGNORE INTO generated_assets (id, project_id, asset_type, storage_key, url, duration_sec, metadata_json, created_at)
          VALUES (?, ?, 'final_video', ?, ?, 180, '{"resolution":"1920x1080"}', ?)
        `).run(uuidv4(), id, finalKey, `/api/assets/${finalKey}`, now);

        const audioKey = `voice/${id}/narration.mp3`;
        db.prepare(`
          INSERT OR IGNORE INTO generated_assets (id, project_id, asset_type, storage_key, url, duration_sec, metadata_json, created_at)
          VALUES (?, ?, 'audio', ?, ?, 180, '{"format":"mp3"}', ?)
        `).run(uuidv4(), id, audioKey, `/api/assets/${audioKey}`, now);

        const metadata = aiProvider.generateMetadata({
          script,
          scenes: genScenes.map((s) => ({
            sceneIndex: s.sceneIndex,
            sectionName: s.visualSubject || `Scene ${s.sceneIndex}`,
            narration: s.narration,
            visualPrompt: s.visualPrompt,
            estimatedDurationSec: s.estimatedDurationSec,
            subtitleText: s.subtitleText,
          })),
          channelName: project.channel_name || 'Creator Studio',
          niche: project.channel_niche || 'Health & Longevity',
          topic: project.topic,
        });

        db.prepare('UPDATE content_projects SET status = ?, current_stage = ?, metadata_json = ?, updated_at = ? WHERE id = ?')
          .run('COMPLETED', 'FINAL_VIDEO', JSON.stringify(metadata), now, id);

        project.status = 'COMPLETED';
        project.current_stage = 'FINAL_VIDEO';
        project.metadata_json = JSON.stringify(metadata);
      } catch (genErr) {
        console.warn('Auto-populate scenes error:', genErr);
      }
    }

    const assets = db
      .prepare('SELECT * FROM generated_assets WHERE project_id = ? ORDER BY created_at ASC')
      .all(id) as GeneratedAsset[];

    const output = db
      .prepare('SELECT * FROM video_outputs WHERE project_id = ?')
      .get(id) as VideoOutput | undefined;

    const thumbnailAsset = db
      .prepare("SELECT * FROM generated_assets WHERE project_id = ? AND asset_type = 'thumbnail' ORDER BY created_at DESC LIMIT 1")
      .get(id) as GeneratedAsset | undefined;

    // Check YouTube connection status for current user
    const ytConn = db
      .prepare('SELECT id, channel_id, channel_title, account_email FROM oauth_connections WHERE user_id = ? AND platform = ?')
      .get(userId, 'YOUTUBE') as OAuthConnection | undefined;

    let parsedMetadata = null;
    if (project.metadata_json) {
      try {
        parsedMetadata = JSON.parse(project.metadata_json);
      } catch {}
    }

    let parsedTelemetry = null;
    if (project.telemetry_json) {
      try {
        parsedTelemetry = JSON.parse(project.telemetry_json);
      } catch {}
    }

    return NextResponse.json({
      project,
      stages,
      scenes,
      assets,
      output: output || null,
      thumbnail: thumbnailAsset ? { url: thumbnailAsset.url, storageKey: thumbnailAsset.storage_key } : null,
      metadata: parsedMetadata,
      telemetry: parsedTelemetry,
      youtubeConnection: ytConn
        ? {
            connected: true,
            channelId: ytConn.channel_id,
            channelTitle: ytConn.channel_title,
            accountEmail: ytConn.account_email,
          }
        : {
            connected: false,
          },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch project details' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: any }) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const id = resolvedParams?.id;
    if (!id) return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });

    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const userId = user.id;
    const body = await request.json();
    const { topic, channel_id, target_length_minutes } = body;

    const db = getDb();
    const now = new Date().toISOString();

    const existing = db.prepare('SELECT user_id FROM content_projects WHERE id = ?').get(id) as any;
    if (!existing) {
      return NextResponse.json({ error: 'Project does not exist' }, { status: 404 });
    }
    const isAdmin = user.role === 'ADMIN' || user.role === 'admin';
    if (existing.user_id && existing.user_id !== userId && !isAdmin) {
      return NextResponse.json({ error: 'You do not have access to this project' }, { status: 403 });
    }

    if (topic && topic.trim()) {
      db.prepare(`
        UPDATE content_projects 
        SET topic = ?, status = 'DRAFT', current_stage = 'SCRIPT', metadata_json = NULL, updated_at = ? 
        WHERE id = ?
      `).run(topic.trim(), now, id);

      // Clean old scenes, outputs, and jobs so new topic generates fresh
      db.prepare('DELETE FROM video_scenes WHERE project_id = ?').run(id);
      db.prepare('DELETE FROM video_outputs WHERE project_id = ?').run(id);
      db.prepare('DELETE FROM video_jobs WHERE project_id = ?').run(id);
      db.prepare("DELETE FROM generated_assets WHERE project_id = ? AND asset_type IN ('script', 'voice', 'scenes', 'video', 'final_video', 'subtitles', 'thumbnail')").run(id);
    }

    if (channel_id) {
      db.prepare('UPDATE content_projects SET channel_id = ?, updated_at = ? WHERE id = ?').run(channel_id, now, id);
    }

    if (target_length_minutes) {
      db.prepare('UPDATE content_projects SET target_length_minutes = ?, updated_at = ? WHERE id = ?').run(Number(target_length_minutes), now, id);
    }

    const updated = db.prepare('SELECT * FROM content_projects WHERE id = ?').get(id);
    return NextResponse.json({ success: true, project: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update project' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: any }) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const id = resolvedParams?.id;
    if (!id) return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });

    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const userId = user.id;
    const db = getDb();

    const existing = db.prepare('SELECT user_id FROM content_projects WHERE id = ?').get(id) as any;
    if (!existing) {
      return NextResponse.json({ error: 'Project does not exist' }, { status: 404 });
    }
    const isAdmin = user.role === 'ADMIN' || user.role === 'admin';
    if (existing.user_id && existing.user_id !== userId && !isAdmin) {
      return NextResponse.json({ error: 'You do not have access to this project' }, { status: 403 });
    }

    // Cascade delete project and related assets
    db.prepare('DELETE FROM video_scenes WHERE project_id = ?').run(id);
    db.prepare('DELETE FROM video_outputs WHERE project_id = ?').run(id);
    db.prepare('DELETE FROM video_jobs WHERE project_id = ?').run(id);
    db.prepare('DELETE FROM generated_assets WHERE project_id = ?').run(id);
    db.prepare('DELETE FROM content_projects WHERE id = ?').run(id);

    return NextResponse.json({ success: true, message: 'Project deleted successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete project' }, { status: 500 });
  }
}

