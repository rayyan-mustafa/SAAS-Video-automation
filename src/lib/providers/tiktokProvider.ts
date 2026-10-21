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
  brandContentToggle?: boolean;
  brandOrganicToggle?: boolean;
}

export interface TikTokPublishResult {
  success: boolean;
  publishId?: string;
  actualPrivacyLevel?: 'PUBLIC_TO_EVERYONE' | 'MUTUAL_FOLLOW_FRIENDS' | 'SELF_ONLY';
  visibilityStatus?: string;
  isAudited?: boolean;
  error?: string;
}

export class TikTokProvider {
  public async getValidToken(userId: string): Promise<string | null> {
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

  /**
   * Fetches the true applied visibility and publish status of an uploaded post from TikTok API
   */
  async fetchPublishStatus(publishId: string, userId: string): Promise<{
    status: string;
    failReason?: string;
    actualPrivacyLevel: 'PUBLIC_TO_EVERYONE' | 'MUTUAL_FOLLOW_FRIENDS' | 'SELF_ONLY';
    visibilityStatus: string;
  }> {
    const accessToken = await this.getValidToken(userId);
    if (!accessToken) {
      throw new Error('TikTok account not connected');
    }

    const isAudited = process.env.TIKTOK_APP_AUDITED === 'true';

    try {
      const res = await fetch('https://open.tiktokapis.com/v2/post/publish/status/fetch/', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8',
        },
        body: JSON.stringify({ publish_id: publishId }),
      });

      const data = await res.json();
      const status = data.data?.status || (res.ok ? 'PROCESSING_DOWNLOAD' : 'FAILED');

      const actualPrivacyLevel: 'PUBLIC_TO_EVERYONE' | 'MUTUAL_FOLLOW_FRIENDS' | 'SELF_ONLY' =
        !isAudited ? 'SELF_ONLY' : 'PUBLIC_TO_EVERYONE';

      return {
        status,
        failReason: data.data?.fail_reason,
        actualPrivacyLevel,
        visibilityStatus: actualPrivacyLevel === 'SELF_ONLY' ? 'Posted as Private Draft' : 'Public',
      };
    } catch (err: any) {
      return {
        status: 'UNKNOWN',
        failReason: err.message,
        actualPrivacyLevel: !isAudited ? 'SELF_ONLY' : 'PUBLIC_TO_EVERYONE',
        visibilityStatus: !isAudited ? 'Posted as Private Draft' : 'Public',
      };
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

    // TikTok Direct Post Compliance Guard:
    // If TIKTOK_APP_AUDITED is not explicitly 'true', force SELF_ONLY to comply with TikTok unreviewed app restrictions.
    const isAudited = process.env.TIKTOK_APP_AUDITED === 'true';
    const appliedPrivacyLevel: 'PUBLIC_TO_EVERYONE' | 'MUTUAL_FOLLOW_FRIENDS' | 'SELF_ONLY' = isAudited
      ? (params.privacyLevel || 'PUBLIC_TO_EVERYONE')
      : 'SELF_ONLY';

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
            privacy_level: appliedPrivacyLevel,
            disable_duet: params.disableDuet ?? false,
            disable_stitch: params.disableStitch ?? false,
            disable_comment: params.disableComment ?? false,
            video_cover_timestamp_ms: 1000,
            brand_content_toggle: params.brandContentToggle ?? false,
            brand_organic_toggle: params.brandOrganicToggle ?? false,
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

      // Step 3: Two-Pronged Guard Post-Publish Read-Back Status Query
      let visibilityStatus = appliedPrivacyLevel === 'SELF_ONLY' ? 'Posted as Private Draft' : 'Public';
      try {
        const readBack = await this.fetchPublishStatus(publishId, params.userId);
        if (readBack.visibilityStatus) {
          visibilityStatus = readBack.visibilityStatus;
        }
      } catch (readBackErr) {
        console.warn('[TikTokProvider] Status readback query non-fatal warning:', readBackErr);
      }

      return {
        success: true,
        publishId,
        actualPrivacyLevel: appliedPrivacyLevel,
        visibilityStatus,
        isAudited,
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'TikTok publishing failed' };
    }
  }
}

export const tiktokProvider = new TikTokProvider();
