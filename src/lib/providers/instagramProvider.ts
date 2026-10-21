import { getDb, OAuthConnection } from '../db';
import { decryptToken } from '../security/encryption';

export const MAX_INSTAGRAM_REELS_DURATION_SEC = 90;

export interface InstagramPublishParams {
  userId: string;
  videoUrl: string; // Must be publicly accessible HTTPS URL or R2 signed URL
  caption: string;
  coverUrl?: string;
  shareToFeed?: boolean;
  durationSeconds?: number;
}

export interface InstagramPublishResult {
  success: boolean;
  mediaId?: string;
  permalink?: string;
  error?: string;
}

export class InstagramProvider {
  public async getValidToken(userId: string): Promise<{ accessToken: string; igUserId: string } | null> {
    const db = getDb();
    const conn = db
      .prepare('SELECT * FROM oauth_connections WHERE user_id = ? AND platform = ?')
      .get(userId, 'INSTAGRAM') as OAuthConnection | undefined;

    if (!conn) return null;

    let accessToken = '';
    try {
      accessToken = decryptToken(conn.access_token) || conn.access_token;
    } catch {
      accessToken = conn.access_token;
    }

    return { accessToken, igUserId: conn.channel_id || '' };
  }

  async publishReel(params: InstagramPublishParams): Promise<InstagramPublishResult> {
    // 1. Validate public HTTPS URL (Meta Graph API requires public HTTPS URL; rejects local file paths)
    if (!params.videoUrl || typeof params.videoUrl !== 'string') {
      return {
        success: false,
        error: 'Invalid Instagram video URL: URL must be provided as a string.',
      };
    }

    if (!params.videoUrl.startsWith('https://')) {
      return {
        success: false,
        error: `Invalid Instagram video URL: URL must be a publicly accessible HTTPS URL. Local file paths and insecure HTTP URLs are rejected by the Meta Graph API. Provided: ${params.videoUrl}`,
      };
    }

    // 2. Enforce Instagram Reels duration ceiling (maximum 90 seconds per Meta API docs)
    if (params.durationSeconds !== undefined && params.durationSeconds > MAX_INSTAGRAM_REELS_DURATION_SEC) {
      return {
        success: false,
        error: `Instagram Reels duration cannot exceed ${MAX_INSTAGRAM_REELS_DURATION_SEC} seconds (attempted: ${params.durationSeconds}s).`,
      };
    }

    if (params.coverUrl && !params.coverUrl.startsWith('https://')) {
      return {
        success: false,
        error: `Invalid Instagram cover URL: URL must be a publicly accessible HTTPS URL. Provided: ${params.coverUrl}`,
      };
    }

    const auth = await this.getValidToken(params.userId);
    if (!auth || !auth.igUserId || !auth.accessToken) {
      return {
        success: false,
        error: 'Instagram Professional account not connected. Please connect Instagram in Settings.',
      };
    }

    try {
      // Step 1: Create Media Container
      const containerUrl = `https://graph.facebook.com/v20.0/${auth.igUserId}/media`;
      const containerBody = new URLSearchParams({
        media_type: 'REELS',
        video_url: params.videoUrl,
        caption: params.caption,
        share_to_feed: params.shareToFeed !== false ? 'true' : 'false',
        access_token: auth.accessToken,
      });

      if (params.coverUrl) {
        containerBody.append('cover_url', params.coverUrl);
      }

      const initRes = await fetch(containerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: containerBody,
      });

      const initData = await initRes.json();
      if (!initRes.ok || !initData.id) {
        return {
          success: false,
          error: initData.error?.message || `Failed to create Instagram Reels container (${initRes.status})`,
        };
      }

      const containerId = initData.id;

      // Step 2: Poll Container Status until READY (maximum 3 minutes)
      let isReady = false;
      const startTime = Date.now();
      while (!isReady && Date.now() - startTime < 180000) {
        await new Promise((r) => setTimeout(r, 4000));
        const statusRes = await fetch(
          `https://graph.facebook.com/v20.0/${containerId}?fields=status_code,status&access_token=${auth.accessToken}`
        );
        const statusData = await statusRes.json();

        if (statusData.status_code === 'FINISHED') {
          isReady = true;
        } else if (statusData.status_code === 'ERROR') {
          return {
            success: false,
            error: `Instagram media processing failed: ${statusData.status || 'Internal error'}`,
          };
        }
      }

      if (!isReady) {
        return {
          success: false,
          error: 'Instagram media upload processing timed out waiting for FINISHED status.',
        };
      }

      // Step 3: Publish Media Container
      const publishUrl = `https://graph.facebook.com/v20.0/${auth.igUserId}/media_publish`;
      const publishRes = await fetch(publishUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          creation_id: containerId,
          access_token: auth.accessToken,
        }),
      });

      const publishData = await publishRes.json();
      if (!publishRes.ok || !publishData.id) {
        return {
          success: false,
          error: publishData.error?.message || 'Failed to publish Instagram Reel container',
        };
      }

      return {
        success: true,
        mediaId: publishData.id,
        permalink: `https://www.instagram.com/reel/${publishData.id}`,
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Instagram publishing failed' };
    }
  }
}

export const instagramProvider = new InstagramProvider();
