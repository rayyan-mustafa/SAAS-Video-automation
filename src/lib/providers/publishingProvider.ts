import { youtubeProvider, YouTubeVisibility } from './youtubeProvider';
import { instagramProvider } from './instagramProvider';
import { tiktokProvider } from './tiktokProvider';
import { facebookProvider } from './facebookProvider';
import { storage } from '../storage';
import { getDb, DEFAULT_USER_ID, OAuthConnection } from '../db';

export type SupportedPlatform = 'YouTube' | 'TikTok' | 'Instagram' | 'Facebook';

export type PublishingStatus = 'NOT_CONNECTED' | 'CONNECTED' | 'SCHEDULED' | 'UPLOADING' | 'PUBLISHED' | 'FAILED';

export interface PublishParams {
  projectId: string;
  platform: SupportedPlatform;
  videoFilePath: string;
  title: string;
  description: string;
  tags?: string[];
  thumbnailFilePath?: string;
  visibility?: 'PRIVATE' | 'UNLISTED' | 'PUBLIC';
  scheduledTime?: string;
  userId?: string;
}

export interface PublishResult {
  status: PublishingStatus;
  platform: SupportedPlatform;
  platformVideoId?: string;
  platformUrl?: string;
  visibilityStatus?: string;
  actualPrivacyLevel?: string;
  errorMessage?: string;
}

export interface PublishingProvider {
  publishVideo(params: PublishParams): Promise<PublishResult>;
  uploadThumbnail(params: { platform: SupportedPlatform; videoId: string; thumbnailFilePath: string; userId?: string }): Promise<PublishResult>;
  updateMetadata(params: { platform: SupportedPlatform; videoId: string; title: string; description: string; tags?: string[]; userId?: string }): Promise<PublishResult>;
  scheduleVideo(params: PublishParams): Promise<PublishResult>;
  getPlatformStatus(platform: SupportedPlatform, userId?: string): Promise<{ status: PublishingStatus; message: string; channelTitle?: string }>;
}

class MultiPlatformPublishingProvider implements PublishingProvider {
  async getPlatformStatus(platform: SupportedPlatform, userId: string = DEFAULT_USER_ID): Promise<{ status: PublishingStatus; message: string; channelTitle?: string }> {
    if (platform === 'YouTube') {
      const ytStatus = await youtubeProvider.getConnectionStatus(userId);
      return {
        status: ytStatus.status === 'CONNECTED' ? 'CONNECTED' : 'NOT_CONNECTED',
        message: ytStatus.message,
        channelTitle: ytStatus.channel?.title,
      };
    }

    const db = getDb();
    const conn = db.prepare('SELECT * FROM oauth_connections WHERE user_id = ? AND platform = ?').get(userId, platform.toUpperCase()) as OAuthConnection | undefined;

    if (!conn) {
      return {
        status: 'NOT_CONNECTED',
        message: `${platform} publishing credentials are not configured. Direct automated API publication is currently offline.`,
      };
    }

    return {
      status: 'CONNECTED',
      message: `Connected to ${platform} account (${conn.channel_title || conn.account_email}).`,
      channelTitle: conn.channel_title || undefined,
    };
  }

  async publishVideo(params: PublishParams): Promise<PublishResult> {
    const { platform, userId = DEFAULT_USER_ID } = params;

    if (platform === 'YouTube') {
      const ytRes = await youtubeProvider.uploadVideo(
        {
          projectId: params.projectId,
          videoFilePath: params.videoFilePath,
          title: params.title,
          description: params.description,
          tags: params.tags,
          visibility: (params.visibility as YouTubeVisibility) || 'PRIVATE',
          scheduledPublishTime: params.scheduledTime,
          thumbnailFilePath: params.thumbnailFilePath,
        },
        userId
      );

      return {
        status: ytRes.status === 'PUBLISHED' ? 'PUBLISHED' : ytRes.status === 'SCHEDULED' ? 'SCHEDULED' : ytRes.status === 'NOT_CONNECTED' ? 'NOT_CONNECTED' : 'FAILED',
        platform: 'YouTube',
        platformVideoId: ytRes.videoId,
        platformUrl: ytRes.videoUrl,
        errorMessage: ytRes.errorMessage,
      };
    }

    if (platform === 'Instagram') {
      const videoKey = `videos/${params.projectId}/final.mp4`;
      const publicVideoUrl = storage.getUrl(videoKey);

      let durationSeconds: number | undefined;
      try {
        const db = getDb();
        const out = db.prepare('SELECT duration_sec FROM video_outputs WHERE project_id = ?').get(params.projectId) as { duration_sec?: number } | undefined;
        durationSeconds = out?.duration_sec;
      } catch {}

      const igRes = await instagramProvider.publishReel({
        userId,
        videoUrl: publicVideoUrl,
        caption: `${params.title}\n\n${params.description || ''}\n\n${(params.tags || []).map((t) => `#${t.replace(/\s+/g, '')}`).join(' ')}`.trim(),
        coverUrl: params.thumbnailFilePath ? storage.getUrl(`thumbnails/${params.projectId}.jpg`) : undefined,
        shareToFeed: true,
        durationSeconds,
      });

      return {
        status: igRes.success ? 'PUBLISHED' : (igRes.error?.includes('not connected') ? 'NOT_CONNECTED' : 'FAILED'),
        platform: 'Instagram',
        platformVideoId: igRes.mediaId,
        platformUrl: igRes.permalink,
        errorMessage: igRes.error,
      };
    }

    if (platform === 'TikTok') {
      const requestedPrivacy = params.visibility === 'PUBLIC' ? 'PUBLIC_TO_EVERYONE' : 'SELF_ONLY';
      const ttRes = await tiktokProvider.publishVideo({
        userId,
        videoFilePath: params.videoFilePath,
        title: params.title,
        privacyLevel: requestedPrivacy as any,
      });

      return {
        status: ttRes.success ? 'PUBLISHED' : (ttRes.error?.includes('not connected') ? 'NOT_CONNECTED' : 'FAILED'),
        platform: 'TikTok',
        platformVideoId: ttRes.publishId,
        actualPrivacyLevel: ttRes.actualPrivacyLevel,
        visibilityStatus: ttRes.visibilityStatus,
        errorMessage: ttRes.error,
      };
    }

    if (platform === 'Facebook') {
      const videoKey = `videos/${params.projectId}/final.mp4`;
      const publicVideoUrl = storage.getUrl(videoKey);

      const fbRes = await facebookProvider.publishVideo({
        userId,
        videoUrl: publicVideoUrl,
        videoFilePath: params.videoFilePath,
        title: params.title,
        description: params.description,
        tags: params.tags,
      });

      return {
        status: fbRes.success ? 'PUBLISHED' : (fbRes.error?.includes('not connected') ? 'NOT_CONNECTED' : 'FAILED'),
        platform: 'Facebook',
        platformVideoId: fbRes.videoId,
        platformUrl: fbRes.permalink,
        errorMessage: fbRes.error,
      };
    }

    return {
      status: 'NOT_CONNECTED',
      platform,
      errorMessage: `${platform} API integration is in NOT_CONNECTED state. Configure ${platform} OAuth credentials in settings to enable direct publishing.`,
    };
  }

  async uploadThumbnail(params: { platform: SupportedPlatform; videoId: string; thumbnailFilePath: string; userId?: string }): Promise<PublishResult> {
    const { platform, userId = DEFAULT_USER_ID } = params;

    if (platform === 'YouTube') {
      const ytRes = await youtubeProvider.uploadThumbnail(params.videoId, params.thumbnailFilePath, userId);
      return {
        status: ytRes.success ? 'PUBLISHED' : 'FAILED',
        platform: 'YouTube',
        platformVideoId: params.videoId,
        errorMessage: ytRes.error,
      };
    }

    return {
      status: 'NOT_CONNECTED',
      platform,
      errorMessage: `${platform} API credentials not configured for thumbnail upload.`,
    };
  }

  async updateMetadata(params: { platform: SupportedPlatform; videoId: string; title: string; description: string; tags?: string[]; userId?: string }): Promise<PublishResult> {
    const { platform, userId = DEFAULT_USER_ID } = params;

    if (platform === 'YouTube') {
      const ytRes = await youtubeProvider.updateMetadata(
        {
          videoId: params.videoId,
          title: params.title,
          description: params.description,
          tags: params.tags,
        },
        userId
      );

      return {
        status: ytRes.success ? 'PUBLISHED' : 'FAILED',
        platform: 'YouTube',
        platformVideoId: params.videoId,
        errorMessage: ytRes.error,
      };
    }

    return {
      status: 'NOT_CONNECTED',
      platform,
      errorMessage: `${platform} API credentials not configured for metadata update.`,
    };
  }

  async scheduleVideo(params: PublishParams): Promise<PublishResult> {
    const { platform, userId = DEFAULT_USER_ID, scheduledTime } = params;

    if (!scheduledTime) {
      return {
        status: 'FAILED',
        platform,
        errorMessage: 'Cannot schedule video without a valid scheduledTime parameter.',
      };
    }

    // Persist scheduled time and platform into content_projects table for daemon processing
    try {
      const db = getDb();
      db.prepare(`
        UPDATE content_projects 
        SET scheduled_at = ?, publishing_status = 'SCHEDULED', platform = ?, visibility = ?, updated_at = ?
        WHERE id = ?
      `).run(
        scheduledTime,
        platform,
        params.visibility || 'PRIVATE',
        new Date().toISOString(),
        params.projectId
      );
    } catch (err: any) {
      console.warn('[PublishingProvider] Failed to persist schedule to database:', err.message);
    }

    // For YouTube, if connected, also initiate native YouTube upload with publishAt
    if (platform === 'YouTube') {
      const ytStatus = await youtubeProvider.getConnectionStatus(userId);
      if (ytStatus.status === 'CONNECTED') {
        const ytRes = await youtubeProvider.uploadVideo(
          {
            projectId: params.projectId,
            videoFilePath: params.videoFilePath,
            title: params.title,
            description: params.description,
            tags: params.tags,
            visibility: 'PRIVATE',
            scheduledPublishTime: params.scheduledTime,
            thumbnailFilePath: params.thumbnailFilePath,
          },
          userId
        );

        return {
          status: ytRes.status === 'SCHEDULED' ? 'SCHEDULED' : ytRes.status === 'NOT_CONNECTED' ? 'NOT_CONNECTED' : 'FAILED',
          platform: 'YouTube',
          platformVideoId: ytRes.videoId,
          platformUrl: ytRes.videoUrl,
          errorMessage: ytRes.errorMessage,
        };
      }
    }

    // For TikTok, Instagram, Facebook (and offline YouTube):
    // The in-app scheduler daemon processes them automatically when scheduled_at <= now
    return {
      status: 'SCHEDULED',
      platform,
      errorMessage: undefined,
    };
  }
}

export const publishingProvider: PublishingProvider = new MultiPlatformPublishingProvider();
