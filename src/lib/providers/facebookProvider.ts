import { getDb, OAuthConnection } from '../db';
import { decryptToken } from '../security/encryption';
import fs from 'fs';

export interface FacebookPublishParams {
  userId: string;
  videoUrl?: string; // Public HTTPS URL or signed R2/S3 URL
  videoFilePath?: string; // Local MP4 file path
  title: string;
  description: string;
  aspectRatio?: '9:16' | '16:9';
  isReel?: boolean; // If true, explicitly target Facebook Reels endpoint
  tags?: string[];
}

export interface FacebookPublishResult {
  success: boolean;
  videoId?: string;
  permalink?: string;
  platformVideoId?: string;
  error?: string;
}

export class FacebookProvider {
  /**
   * Fetch authenticated Facebook Page credentials for user
   */
  private async getValidToken(userId: string): Promise<{ accessToken: string; pageId: string } | null> {
    const db = getDb();
    const conn = db
      .prepare('SELECT * FROM oauth_connections WHERE user_id = ? AND platform = ?')
      .get(userId, 'FACEBOOK') as OAuthConnection | undefined;

    if (!conn) return null;

    let accessToken = '';
    try {
      accessToken = decryptToken(conn.access_token) || conn.access_token;
    } catch {
      accessToken = conn.access_token;
    }

    return { accessToken, pageId: conn.channel_id || '' };
  }

  /**
   * Publish video to Facebook Page (supports 9:16 Vertical Reels & 16:9 Horizontal Feed/Watch)
   */
  async publishVideo(params: FacebookPublishParams): Promise<FacebookPublishResult> {
    const auth = await this.getValidToken(params.userId);
    if (!auth || !auth.pageId || !auth.accessToken) {
      return {
        success: false,
        error: 'Facebook Page account not connected. Please connect your Facebook Page in Settings.',
      };
    }

    // Verify video source exists
    if (!params.videoUrl && (!params.videoFilePath || !fs.existsSync(params.videoFilePath))) {
      return {
        success: false,
        error: 'Video source file or public URL was not found for Facebook publication.',
      };
    }

    const isVertical = params.aspectRatio === '9:16' || params.isReel;
    const formattedDescription = `${params.title}\n\n${params.description || ''}\n\n${(params.tags || []).map((t) => `#${t.replace(/\s+/g, '')}`).join(' ')}`.trim();

    try {
      // 1. If Vertical 9:16 and flagged as Reel -> Publish via Facebook Reels API
      if (isVertical && params.isReel) {
        return await this.publishReel({
          ...params,
          userId: params.userId,
        });
      }

      // 2. Standard Facebook Page Video (Feed, Watch, and Vertical Video Post)
      const postUrl = `https://graph.facebook.com/v20.0/${auth.pageId}/videos`;
      const bodyParams = new URLSearchParams({
        title: params.title,
        description: formattedDescription,
        access_token: auth.accessToken,
      });

      if (params.videoUrl) {
        bodyParams.append('file_url', params.videoUrl);
      }

      const res = await fetch(postUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: bodyParams,
      });

      const data = await res.json();
      if (!res.ok || !data.id) {
        return {
          success: false,
          error: data.error?.message || `Failed to publish video to Facebook Page (${res.status})`,
        };
      }

      const videoId = data.id;
      const permalink = `https://www.facebook.com/${auth.pageId}/videos/${videoId}`;

      return {
        success: true,
        videoId,
        platformVideoId: videoId,
        permalink,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Network exception while publishing to Facebook API',
      };
    }
  }

  /**
   * Publish specifically to Facebook Reels (9:16 Vertical)
   */
  async publishReel(params: FacebookPublishParams): Promise<FacebookPublishResult> {
    const auth = await this.getValidToken(params.userId);
    if (!auth || !auth.pageId || !auth.accessToken) {
      return {
        success: false,
        error: 'Facebook Page account not connected. Please connect Facebook in Settings.',
      };
    }

    try {
      // Step 1: Initialize upload session for Facebook Reels
      const initUrl = `https://graph.facebook.com/v20.0/${auth.pageId}/video_reels`;
      const initRes = await fetch(initUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          upload_phase: 'start',
          access_token: auth.accessToken,
        }),
      });

      const initData = await initRes.json();
      if (!initRes.ok || !initData.video_id) {
        return {
          success: false,
          error: initData.error?.message || 'Failed to initialize Facebook Reels upload session',
        };
      }

      const videoId = initData.video_id;

      // Step 2: Finalize and Publish Reel
      const finishRes = await fetch(initUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          upload_phase: 'finish',
          video_id: videoId,
          video_state: 'PUBLISHED',
          description: `${params.title}\n\n${params.description || ''}`.trim(),
          access_token: auth.accessToken,
        }),
      });

      const finishData = await finishRes.json();
      if (!finishRes.ok || !finishData.success) {
        return {
          success: false,
          error: finishData.error?.message || 'Failed to finalize Facebook Reel publication',
        };
      }

      const permalink = `https://www.facebook.com/reel/${videoId}`;
      return {
        success: true,
        videoId,
        platformVideoId: videoId,
        permalink,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Facebook Reels API execution error',
      };
    }
  }
}

export const facebookProvider = new FacebookProvider();
