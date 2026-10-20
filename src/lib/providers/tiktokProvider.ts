import fs from 'fs';
import { getDb, OAuthConnection } from '../db';
import { decryptToken } from '../security/encryption';

export interface TikTokPublishParams {
  userId: string;
  videoFilePath: string;
  title: string;
  privacyLevel?: 'PUBLIC_TO_EVERYONE' | 'MUTUAL_FOLLOW_FRIENDS' | 'SELF_ONLY';
  disableComment?: boolean;
  disableDuet?: boolean;
  disableStitch?: boolean;
}

export interface TikTokPublishResult {
  success: boolean;
  publishId?: string;
  error?: string;
}

export class TikTokProvider {
  private async getValidToken(userId: string): Promise<string | null> {
    const db = getDb();
    const conn = db
      .prepare('SELECT * FROM oauth_connections WHERE user_id = ? AND platform = ?')
      .get(userId, 'TIKTOK') as OAuthConnection | undefined;

    if (!conn) return null;

    try {
      return decryptToken(conn.access_token) || conn.access_token;
    } catch {
      return conn.access_token;
    }
  }

  async publishVideo(params: TikTokPublishParams): Promise<TikTokPublishResult> {
    const accessToken = await this.getValidToken(params.userId);
    if (!accessToken) {
      return {
        success: false,
        error: 'TikTok account not connected. Please connect TikTok in Settings.',
      };
    }

    if (!fs.existsSync(params.videoFilePath)) {
      return {
        success: false,
        error: `Video file not found at path: ${params.videoFilePath}`,
      };
    }

    try {
      const stats = fs.statSync(params.videoFilePath);
      const fileSize = stats.size;

      // Step 1: Initialize Direct Post
      const initUrl = 'https://open.tiktokapis.com/v2/post/publish/video/init/';
      const initRes = await fetch(initUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8',
        },
        body: JSON.stringify({
          post_info: {
            title: params.title.slice(0, 150),
            privacy_level: params.privacyLevel || 'PUBLIC_TO_EVERYONE',
            disable_duet: params.disableDuet ?? false,
            disable_stitch: params.disableStitch ?? false,
            disable_comment: params.disableComment ?? false,
            video_cover_timestamp_ms: 1000,
          },
          source_info: {
            source: 'FILE_UPLOAD',
            video_size: fileSize,
            chunk_size: fileSize,
            total_chunk_count: 1,
          },
        }),
      });

      const initData = await initRes.json();
      if (!initRes.ok || initData.error?.code !== 'ok') {
        return {
          success: false,
          error: initData.error?.message || `TikTok upload initialization failed (${initRes.status})`,
        };
      }

      const uploadUrl = initData.data?.upload_url;
      const publishId = initData.data?.publish_id;

      if (!uploadUrl) {
        return {
          success: false,
          error: 'TikTok response did not contain upload_url',
        };
      }

      // Step 2: Stream Binary Video to TikTok Upload URL
      const fileBuffer = await fs.promises.readFile(params.videoFilePath);
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Range': `bytes 0-${fileSize - 1}/${fileSize}`,
          'Content-Type': 'video/mp4',
          'Content-Length': String(fileSize),
        },
        body: fileBuffer,
      });

      if (!uploadRes.ok) {
        return {
          success: false,
          error: `TikTok binary file transfer failed with status ${uploadRes.status}`,
        };
      }

      return {
        success: true,
        publishId,
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'TikTok publishing failed' };
    }
  }
}

export const tiktokProvider = new TikTokProvider();
