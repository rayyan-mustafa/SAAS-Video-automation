import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getCurrentUser } from '@/lib/auth';
import { getDb, DEFAULT_USER_ID, Channel } from '@/lib/db';
import { videoWorker } from '@/lib/queue/worker';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface BatchTopicPayload {
  topic: string;
  scheduled_at: string;
  targetLengthMinutes?: number;
  hashtags?: string[];
  hook?: string;
  aspectRatio?: '9:16' | '16:9';
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser(request);
    const userId = user?.id || DEFAULT_USER_ID;

    const body = await request.json();
    const {
      channelId,
      topics,
      items,
      visibility = 'PRIVATE',
      language = 'en',
    }: {
      channelId?: string;
      topics?: BatchTopicPayload[];
      items?: BatchTopicPayload[];
      visibility?: 'PRIVATE' | 'UNLISTED' | 'PUBLIC';
      language?: string;
    } = body;

    const finalTopics = topics || items;
    if (!Array.isArray(finalTopics) || finalTopics.length === 0) {
      return NextResponse.json({ error: 'Topics or items array is required and must not be empty' }, { status: 400 });
    }

    const db = getDb();
    const now = new Date().toISOString();

    // Resolve channel
    let channel: Channel | undefined;
    if (channelId) {
      channel = db.prepare('SELECT * FROM channels WHERE id = ?').get(channelId) as Channel | undefined;
    }
    if (!channel) {
      channel = db.prepare('SELECT * FROM channels WHERE user_id = ? LIMIT 1').get(userId) as Channel | undefined;
    }

    const resolvedChannelId = channel ? channel.id : `chan_${userId.substring(4)}`;
    const channelName = channel ? channel.name : 'Creator Studio';
    const channelNiche = channel ? channel.niche : 'AI & Technology';

    // Ensure user record exists
    db.prepare(`
      INSERT OR IGNORE INTO users (id, email, password_hash, salt, name, email_verified, role, status, onboarding_completed, created_at, updated_at)
      VALUES (?, ?, '', '', ?, 1, 'CUSTOMER', 'ACTIVE', 1, ?, ?)
    `).run(userId, user?.email || 'creator@autovideo.local', user?.name || 'Creator', now, now);

    // Ensure channel exists
    if (!channel) {
      db.prepare(`
        INSERT OR IGNORE INTO channels (
          id, user_id, name, niche, language, voice, voice_speed,
          target_duration_minutes, visual_style, subtitle_style, intro_style, outro_cta,
          publishing_platform, content_rules, publishing_days, publishing_time, timezone,
          default_visibility, auto_publish, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 'en', 'en-US-ChristopherNeural', '1.0x', 1, 'Cinematic High-Contrast', 'Modern Clean White', 'High-Impact Hook', 'Subscribe for daily videos', 'YouTube', 'Fast-paced, engaging delivery', '["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"]', '14:00', 'UTC', 'PRIVATE', 1, ?, ?)
      `).run(resolvedChannelId, userId, channelName, channelNiche, now, now);
    }

    const scheduledProjectIds: string[] = [];

    // Begin atomic SQLite transaction to insert scheduled batch
    const insertProjectStmt = db.prepare(`
      INSERT INTO content_projects (
        id, user_id, channel_id, topic, target_length_minutes, preset,
        language, platform, visibility, status, current_stage, publishing_status,
        scheduled_at, auto_publish, metadata_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const runBatchInsert = db.transaction((items: BatchTopicPayload[]) => {
      for (const item of items) {
        const pId = uuidv4();
        const duration = Number(item.targetLengthMinutes) || (item.aspectRatio === '16:9' ? 5 : 1);
        const isShort = duration <= 1 || item.aspectRatio === '9:16';
        const cleanTopic = item.topic.trim();
        const hashtags = Array.isArray(item.hashtags) && item.hashtags.length > 0 ? item.hashtags : ['#YouTube', isShort ? '#Shorts' : '#Masterclass'];

        // Build rich metadata template
        const metadataJson = JSON.stringify({
          youtubeTitle: isShort && !cleanTopic.toLowerCase().includes('#shorts') ? `${cleanTopic.slice(0, 88)} #Shorts` : cleanTopic,
          aspectRatio: isShort ? '9:16' : '16:9',
          hashtags,
          hook: item.hook || `Discover the core principles of ${cleanTopic}.`,
          tags: [channelNiche, channelName, cleanTopic, isShort ? 'shorts' : 'video', 'viral', 'trending'].filter(Boolean),
          description: [
            `In this video from ${channelName}, we break down: ${cleanTopic}.`,
            '',
            item.hook ? `💡 Hook: ${item.hook}` : '',
            '',
            `🔔 Subscribe to ${channelName} for our automated 30-Day Content Series!`,
            '',
            hashtags.join(' ')
          ].filter(Boolean).join('\n')
        });

        insertProjectStmt.run(
          pId,
          userId,
          resolvedChannelId,
          cleanTopic,
          duration,
          'STANDARD',
          language,
          'YouTube',
          visibility,
          'PENDING',
          'SCRIPT',
          'SCHEDULED', // Automatic schedule trigger
          item.scheduled_at,
          1, // auto_publish enabled
          metadataJson,
          now,
          now
        );

        scheduledProjectIds.push(pId);
      }
    });

    runBatchInsert(finalTopics);

    // Queue first 3 projects immediately to start rendering pipeline; the concurrency queue will process the rest smoothly
    for (const pId of scheduledProjectIds) {
      videoWorker.startProjectPipeline(pId);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully scheduled ${scheduledProjectIds.length} daily videos to release automatically!`,
      scheduledCount: scheduledProjectIds.length,
      channel: { id: resolvedChannelId, name: channelName, niche: channelNiche },
      projectIds: scheduledProjectIds,
    });
  } catch (err: any) {
    console.error('batch-schedule error:', err);
    return NextResponse.json({ error: err.message || 'Failed to batch schedule content plan' }, { status: 500 });
  }
}
