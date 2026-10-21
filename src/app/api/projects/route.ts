import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import {
  getDb,
  DEFAULT_USER_ID,
  ContentProject,
  Channel,
  deductUserCredits,
  getMonthlyVideoUsage,
  checkPlanGenerationRateLimit,
  checkUserEligibilityForPlan,
  recordPlanGeneration,
} from '@/lib/db';
import { resolveLengthBand } from '@/lib/video/lengthBands';
import { videoWorker } from '@/lib/queue/worker';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);
    const userId = user?.id || DEFAULT_USER_ID;

    const db = getDb();
    const monthlyUsage = getMonthlyVideoUsage(userId);
    let projects = db
      .prepare(
        `SELECT p.*, vo.storage_key as output_storage_key, vo.url as output_url, COALESCE(c.name, 'Creator Studio') as channel_name, COALESCE(c.niche, 'AI & Tech') as channel_niche 
         FROM content_projects p 
         LEFT JOIN channels c ON p.channel_id = c.id 
         LEFT JOIN video_outputs vo ON vo.project_id = p.id
         WHERE p.user_id = ? 
         ORDER BY p.created_at DESC`
      )
      .all(userId) as any[];

    if (projects.length === 0) {
      const now = new Date().toISOString();
      let userChannel = db.prepare('SELECT id FROM channels WHERE user_id = ? LIMIT 1').get(userId) as { id: string } | undefined;
      const channelId = userChannel ? userChannel.id : `chan_${userId.substring(4)}`;
      
      // Seed default channel so channel relations are always intact
      db.prepare(`
        INSERT OR IGNORE INTO channels (
          id, user_id, name, niche, language, voice, voice_speed,
          target_duration_minutes, visual_style, subtitle_style, intro_style, outro_cta,
          publishing_platform, content_rules, publishing_days, publishing_time, timezone,
          default_visibility, auto_publish, created_at, updated_at
        ) VALUES (?, ?, 'Creator Studio', 'AI & Tech', 'en', 'en-US-ChristopherNeural', '1.0x', 3, 'Cinematic High-Contrast', 'Modern Clean White', 'High-Impact Hook', 'Subscribe for more breakdowns', 'YouTube', 'Professional studio pacing', '["Monday","Wednesday","Friday"]', '14:00', 'UTC', 'PRIVATE', 0, ?, ?)
      `).run(channelId, userId, now, now);

      return NextResponse.json({ projects: [], monthlyUsage });
    }

    return NextResponse.json({ projects, monthlyUsage });
  } catch (err: any) {
    console.error('Projects GET error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch projects' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser(request);
    const userId = user?.id || DEFAULT_USER_ID;

    // WP8 Eligibility Check: User must have active account and sufficient balance
    const eligibility = checkUserEligibilityForPlan(userId);
    if (!eligibility.eligible) {
      return NextResponse.json(
        {
          error: eligibility.reason || 'User not eligible for plan generation',
          balance: eligibility.balance,
        },
        { status: 402 }
      );
    }

    // WP8 Rate Limit: Max 3 plans per rolling hour per user
    const rateLimit = checkPlanGenerationRateLimit(userId);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `Plan generation rate limit reached (max 3 plans per rolling hour). Please wait ${rateLimit.retryAfterSec}s before generating another plan.`,
          retryAfterSec: rateLimit.retryAfterSec,
          count: rateLimit.count,
        },
        { status: 429 }
      );
    }

    // Check monthly quota (30 videos/month server-side enforcement)
    const monthlyUsage = getMonthlyVideoUsage(userId);
    if (monthlyUsage.remaining <= 0) {
      return NextResponse.json(
        {
          error: `Monthly video quota reached (${monthlyUsage.used}/${monthlyUsage.limit} videos). Upgrade your subscription or wait for the next billing cycle.`,
          monthlyUsage,
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    let {
      channel_id,
      topic,
      preset = 'STANDARD',
      target_length_minutes = 5,
      language = 'en',
      platform = 'YouTube',
      visibility = 'PRIVATE',
      scheduled_at = null,
      auto_publish = 0,
      voice,
      visual_style,
    } = body;

    const db = getDb();
    const now = new Date().toISOString();

    // Auto-resolve channel_id if missing
    if (!channel_id) {
      const existing = db.prepare('SELECT id FROM channels WHERE user_id = ? LIMIT 1').get(userId) as { id: string } | undefined;
      channel_id = existing ? existing.id : `chan_${userId.substring(4)}`;
    }
    if (!topic || typeof topic !== 'string' || !topic.trim()) {
      return NextResponse.json({ error: 'Topic is required and cannot be empty' }, { status: 400 });
    }
    const cleanTopic = topic.trim().substring(0, 500);

    // Ensure user record exists
    db.prepare(`
      INSERT OR IGNORE INTO users (id, email, password_hash, salt, name, email_verified, role, status, onboarding_completed, created_at, updated_at)
      VALUES (?, ?, '', '', ?, 1, 'CUSTOMER', 'ACTIVE', 1, ?, ?)
    `).run(userId, user?.email || 'creator@autovideo.local', user?.name || 'Creator', now, now);

    // Verify or auto-provision channel in container DB
    let channel = db
      .prepare('SELECT * FROM channels WHERE id = ?')
      .get(channel_id) as Channel | undefined;

    if (!channel) {
      db.prepare(`
        INSERT OR IGNORE INTO channels (
          id, user_id, name, niche, language, voice, voice_speed,
          target_duration_minutes, visual_style, subtitle_style, intro_style, outro_cta,
          publishing_platform, content_rules, publishing_days, publishing_time, timezone,
          default_visibility, auto_publish, created_at, updated_at
        ) VALUES (?, ?, 'Creator Channel', 'AI & Technology', 'en', ?, '1.0x', 5, ?, 'Modern Clean White', 'High-Impact Dramatic Question', 'Subscribe to the channel and leave your thoughts below', 'YouTube', 'Engaging, clear, professional tone', '["Monday","Wednesday","Friday"]', '14:00', 'UTC', 'PRIVATE', 0, ?, ?)
      `).run(channel_id, userId, voice || 'en-US-ChristopherNeural', visual_style || 'Cinematic High-Contrast', now, now);
      channel = db.prepare('SELECT * FROM channels WHERE id = ?').get(channel_id) as Channel | undefined;
    } else {
      // Update channel voice or visual style if customized during creation
      if (voice && voice !== channel.voice) {
        db.prepare('UPDATE channels SET voice = ?, updated_at = ? WHERE id = ?').run(voice, now, channel_id);
        channel.voice = voice;
      }
      if (visual_style && visual_style !== channel.visual_style) {
        db.prepare('UPDATE channels SET visual_style = ?, updated_at = ? WHERE id = ?').run(visual_style, now, channel_id);
        channel.visual_style = visual_style;
      }
    }

    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    const projectId = uuidv4();
    const willAutoPublish = auto_publish || channel.auto_publish ? 1 : 0;
    const initialPublishStatus = scheduled_at ? 'SCHEDULED' : willAutoPublish ? 'SCHEDULED' : 'DRAFT';

    // WP8: Plan generation is free! Credits are deducted only upon Storyboard Approval.
    // Record rate limit consumption in persistent SQLite ledger
    recordPlanGeneration(userId);

    const numericLength = Number(target_length_minutes);
    const parsedLength = !isNaN(numericLength) && numericLength > 0 ? numericLength : 3;
    const lengthBand = resolveLengthBand(parsedLength).band;
    const resolvedAspectRatio = body.aspect_ratio || body.aspectRatio || '9:16';
    const selectedPlatforms = Array.isArray(body.platforms) && body.platforms.length > 0
      ? body.platforms
      : [platform || channel.publishing_platform || 'YouTube'];
    const projectMetadata = JSON.stringify({
      aspectRatio: resolvedAspectRatio,
      platforms: selectedPlatforms,
      voice: body.voice,
      visualStyle: body.visual_style || channel.visual_style,
    });

    db.prepare(
      `INSERT INTO content_projects (
        id, user_id, channel_id, topic, target_length_minutes, length_band, preset,
        language, platform, aspect_ratio, visibility, status, current_stage, publishing_status,
        scheduled_at, auto_publish, metadata_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      projectId,
      userId,
      channel_id,
      cleanTopic,
      parsedLength,
      lengthBand,
      preset,
      language || channel.language,
      selectedPlatforms.join(', '),
      resolvedAspectRatio,
      visibility || channel.default_visibility || 'PRIVATE',
      'PROCESSING',
      'PLAN',
      initialPublishStatus,
      scheduled_at,
      willAutoPublish,
      projectMetadata,
      now,
      now
    );

    // Launch pipeline in background (starts at PLAN stage and halts at PENDING_APPROVAL)
    videoWorker.startProjectPipeline(projectId, 'PLAN');

    return NextResponse.json(
      {
        message: 'Video plan generation initiated',
        projectId,
        status: 'PROCESSING',
        currentStage: 'PLAN',
        lengthBand,
        publishingStatus: initialPublishStatus,
        monthlyUsage: getMonthlyVideoUsage(userId),
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create project' }, { status: 500 });
  }
}
