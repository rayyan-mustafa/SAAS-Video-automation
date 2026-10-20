import { getDb, DEFAULT_USER_ID, ContentProject, Channel, VideoOutput, GeneratedAsset } from '../db';
import { publishingProvider, SupportedPlatform } from '../providers/publishingProvider';
import { storage } from '../storage';

export interface SchedulerRunResult {
  processedCount: number;
  publishedCount: number;
  failedCount: number;
  details: Array<{
    projectId: string;
    topic: string;
    status: string;
    videoId?: string;
    error?: string;
  }>;
}

class BackgroundPublishingScheduler {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;

  public start(intervalMs = 30000) {
    if (this.intervalId) return;
    this.intervalId = setInterval(() => {
      this.checkAndPublishDueVideos().catch((err) => {
        console.error('Scheduler periodic check error:', err);
      });
    }, intervalMs);
  }

  public stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  public async checkAndPublishDueVideos(userId?: string): Promise<SchedulerRunResult> {
    if (this.isRunning) {
      return { processedCount: 0, publishedCount: 0, failedCount: 0, details: [] };
    }

    this.isRunning = true;
    const db = getDb();
    const nowIso = new Date().toISOString();

    const result: SchedulerRunResult = {
      processedCount: 0,
      publishedCount: 0,
      failedCount: 0,
      details: [],
    };

    try {
      // 0. Recover stranded video generation jobs (>3 mins in PENDING or PROCESSING without progress update)
      const stuckPipelineThreshold = new Date(Date.now() - 3 * 60 * 1000).toISOString();
      const stuckPipelineProjects = db.prepare(
        `SELECT id, current_stage FROM content_projects 
         WHERE status IN ('PENDING', 'PROCESSING') 
           AND id NOT LIKE 'proj_test_%' 
           AND id NOT LIKE 'proj_flex_%'
           AND updated_at < ?`
      ).all(stuckPipelineThreshold) as Array<{ id: string; current_stage: string }>;

      if (stuckPipelineProjects.length > 0) {
        try {
          const { videoWorker } = await import('../queue/worker');
          for (const proj of stuckPipelineProjects) {
            console.log(`[SchedulerSweeper] Resuming stranded pipeline for project ${proj.id} (Stage: ${proj.current_stage || 'SCRIPT'})...`);
            videoWorker.startProjectPipeline(proj.id, (proj.current_stage as any) || 'SCRIPT');
          }
        } catch (err: any) {
          console.error('[SchedulerSweeper] Failed to trigger videoWorker resume:', err.message);
        }
      }

      // 1. Recover stuck jobs (>15 mins in UPLOADING without completion)
      const stuckThresholdIso = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      db.prepare(
        `UPDATE content_projects SET 
          publishing_status = 'SCHEDULED', 
          publish_error = 'Previous upload process lease expired. Automatically recovered.' 
         WHERE publishing_status = 'UPLOADING' AND publish_started_at < ?`
      ).run(stuckThresholdIso);

      // 2. Find all completed projects that are scheduled and ready to publish
      let dueQuery = `
        SELECT p.*, c.name as channel_name, c.publishing_platform as channel_platform, c.default_visibility 
        FROM content_projects p 
        JOIN channels c ON p.channel_id = c.id 
        WHERE p.status = 'COMPLETED' 
          AND p.publishing_status = 'SCHEDULED' 
          AND p.scheduled_at IS NOT NULL 
          AND p.scheduled_at <= ? 
      `;
      const queryParams: any[] = [nowIso];

      if (userId) {
        dueQuery += ' AND p.user_id = ?';
        queryParams.push(userId);
      }

      dueQuery += ' ORDER BY p.scheduled_at ASC';

      const dueProjects = db.prepare(dueQuery).all(...queryParams) as (ContentProject & {
        channel_name: string;
        channel_platform: string;
        default_visibility: string;
      })[];

      result.processedCount = dueProjects.length;

      for (const proj of dueProjects) {
        // Prevent Duplicate Uploads: If already published with valid video ID, mark published
        if (proj.publish_video_id && proj.publishing_status === 'PUBLISHED') {
          continue;
        }

        const publishStartTime = new Date().toISOString();

        // Mark project as UPLOADING (atomic state transition)
        const updateRes = db.prepare(
          `UPDATE content_projects SET 
            publishing_status = 'UPLOADING', 
            publish_started_at = ?, 
            publish_error = NULL, 
            updated_at = ? 
           WHERE id = ? AND publishing_status = 'SCHEDULED'`
        ).run(publishStartTime, publishStartTime, proj.id);

        if (updateRes.changes === 0) {
          // Another worker claimed this job
          continue;
        }

        const output = db.prepare('SELECT * FROM video_outputs WHERE project_id = ?').get(proj.id) as VideoOutput | undefined;
        const thumbnail = db.prepare("SELECT * FROM generated_assets WHERE project_id = ? AND asset_type = 'thumbnail' ORDER BY created_at DESC LIMIT 1").get(proj.id) as GeneratedAsset | undefined;

        if (!output) {
          const errMsg = 'No output video file found for scheduled publishing.';
          db.prepare(
            `UPDATE content_projects SET publishing_status = 'FAILED', publish_error = ?, updated_at = ? WHERE id = ?`
          ).run(errMsg, new Date().toISOString(), proj.id);

          result.failedCount++;
          result.details.push({ projectId: proj.id, topic: proj.topic, status: 'FAILED', error: errMsg });
          continue;
        }

        const videoFilePath = storage.getFilePath(output.storage_key);
        const thumbnailFilePath = thumbnail ? storage.getFilePath(thumbnail.storage_key) : undefined;

        let rawMeta: any = {};
        if (proj.metadata_json) {
          try {
            rawMeta = JSON.parse(proj.metadata_json);
          } catch {}
        }

        const isShort = (rawMeta.aspectRatio === '9:16') || ((proj as any).aspect_ratio === '9:16') || proj.target_length_minutes <= 1;
        const cleanTopicWord = proj.topic.split(' ').slice(0, 3).join('').replace(/[^a-zA-Z0-9]/g, '');

        let finalTitle = rawMeta.youtubeTitle || proj.topic;
        if (isShort && !finalTitle.toLowerCase().includes('#shorts')) {
          finalTitle = `${finalTitle.slice(0, 90)} #Shorts`;
        }
        finalTitle = finalTitle.slice(0, 100);

        const defaultHashtags = [
          `#${cleanTopicWord || 'Content'}`,
          isShort ? '#Shorts' : '#Masterclass',
          '#Trending',
          '#Viral',
          '#YouTube',
        ];
        const hashtags = Array.isArray(rawMeta.hashtags) && rawMeta.hashtags.length > 0 ? rawMeta.hashtags : defaultHashtags;
        const hashtagString = hashtags.join(' ');

        let finalDescription = rawMeta.description;
        if (!finalDescription || finalDescription === proj.topic || finalDescription.length < 50) {
          finalDescription = [
            `In this video from ${proj.channel_name || 'Creator Studio'}, we break down: ${proj.topic}.`,
            '',
            `📌 Watch till the end for practical insights, visual breakdowns, and key takeaways on ${proj.topic}.`,
            '',
            `🔔 Subscribe to ${proj.channel_name || 'our channel'} for automated daily video releases!`,
            '',
            hashtagString,
          ].join('\n');
        } else if (!finalDescription.includes('#')) {
          finalDescription = `${finalDescription}\n\n${hashtagString}`;
        }

        const defaultTags = [
          proj.channel_name,
          proj.topic,
          ...proj.topic.split(' ').filter((w: string) => w.length > 3),
          isShort ? 'shorts' : 'video',
          'youtube video',
          'viral',
          'how to',
        ].filter(Boolean);
        const finalTags = Array.isArray(rawMeta.tags) && rawMeta.tags.length > 0 ? rawMeta.tags : defaultTags;

        const pubResult = await publishingProvider.publishVideo({
          projectId: proj.id,
          platform: (proj.platform as SupportedPlatform) || 'YouTube',
          videoFilePath,
          title: finalTitle,
          description: finalDescription,
          tags: finalTags,
          thumbnailFilePath,
          visibility: proj.visibility || (proj.default_visibility as any) || 'PRIVATE',
          userId: proj.user_id,
        });

        const publishEndTime = new Date().toISOString();

        if (pubResult.status === 'PUBLISHED' || pubResult.status === 'SCHEDULED') {
          db.prepare(
            `UPDATE content_projects SET 
              publishing_status = 'PUBLISHED', 
              published_at = ?, 
              publish_completed_at = ?, 
              publish_provider = ?, 
              publish_video_id = ?, 
              publish_url = ?, 
              publish_error = NULL, 
              updated_at = ? 
             WHERE id = ?`
          ).run(
            publishEndTime,
            publishEndTime,
            pubResult.platform,
            pubResult.platformVideoId || null,
            pubResult.platformUrl || null,
            publishEndTime,
            proj.id
          );

          result.publishedCount++;
          result.details.push({
            projectId: proj.id,
            topic: proj.topic,
            status: 'PUBLISHED',
            videoId: pubResult.platformVideoId,
          });
        } else {
          db.prepare(
            `UPDATE content_projects SET 
              publishing_status = 'FAILED', 
              publish_error = ?, 
              updated_at = ? 
             WHERE id = ?`
          ).run(pubResult.errorMessage || 'Publishing provider rejected upload', publishEndTime, proj.id);

          result.failedCount++;
          result.details.push({
            projectId: proj.id,
            topic: proj.topic,
            status: 'FAILED',
            error: pubResult.errorMessage,
          });
        }
      }
    } finally {
      this.isRunning = false;
    }

    return result;
  }

  public calculateNextReleaseSlot(channel: Channel): string {
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    let targetDays: string[] = ['Monday', 'Wednesday', 'Friday'];

    try {
      if (channel.publishing_days) {
        targetDays = JSON.parse(channel.publishing_days);
      }
    } catch {}

    const [pubHour, pubMinute] = (channel.publishing_time || '14:00').split(':').map(Number);

    const now = new Date();
    for (let dayOffset = 0; dayOffset <= 14; dayOffset++) {
      const candidate = new Date(now.getTime() + dayOffset * 24 * 60 * 60 * 1000);
      candidate.setUTCHours(pubHour || 14, pubMinute || 0, 0, 0);

      const dayName = daysOfWeek[candidate.getUTCDay()];
      if (targetDays.includes(dayName) && candidate.getTime() > now.getTime() + 5 * 60 * 1000) {
        return candidate.toISOString();
      }
    }

    // Default 24 hours from now
    return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  }

  /**
   * Sequential Daily Release Scheduler:
   * Finds the latest scheduled project and automatically assigns the next sequential calendar day.
   * e.g., Day 1 -> Video 1, Day 2 -> Video 2, ... Day 30 -> Video 30.
   */
  public calculateNextAvailableDailySlot(channel: Channel, userId: string = DEFAULT_USER_ID): string {
    const db = getDb();
    const [pubHour, pubMinute] = (channel.publishing_time || '14:00').split(':').map(Number);
    const now = new Date();

    const latestScheduled = db.prepare(`
      SELECT scheduled_at FROM content_projects
      WHERE user_id = ? AND channel_id = ? AND scheduled_at IS NOT NULL AND status != 'FAILED'
      ORDER BY scheduled_at DESC LIMIT 1
    `).get(userId, channel.id) as { scheduled_at: string } | undefined;

    let targetDate: Date;
    if (latestScheduled && latestScheduled.scheduled_at) {
      const prevDate = new Date(latestScheduled.scheduled_at);
      if (prevDate.getTime() > now.getTime()) {
        targetDate = new Date(prevDate.getTime() + 24 * 60 * 60 * 1000);
      } else {
        targetDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      }
    } else {
      targetDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }

    targetDate.setUTCHours(pubHour || 14, pubMinute || 0, 0, 0);
    return targetDate.toISOString();
  }
}

export const publishingScheduler = new BackgroundPublishingScheduler();
