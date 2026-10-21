import fs from 'fs';
import { getDb, DEFAULT_USER_ID, OAuthConnection } from '../db';
import { encryptToken, decryptToken } from '../security/encryption';

export type YouTubeVisibility = 'PRIVATE' | 'UNLISTED' | 'PUBLIC';

export type YouTubeConnectionStatus = 'NOT_CONNECTED' | 'AUTH_REQUIRED' | 'CONNECTED';

export interface YouTubeChannelInfo {
  id: string;
  title: string;
  email?: string;
  customUrl?: string;
  thumbnailUrl?: string;
}

export interface YouTubeUploadParams {
  projectId: string;
  videoFilePath: string;
  title: string;
  description: string;
  tags?: string[];
  visibility?: YouTubeVisibility;
  scheduledPublishTime?: string; // ISO 8601 string for scheduled release
  thumbnailFilePath?: string;
  madeForKids?: boolean;
}

export interface YouTubeUploadResult {
  status: 'PUBLISHED' | 'SCHEDULED' | 'FAILED' | 'NOT_CONNECTED' | 'AUTH_REQUIRED' | 'UPLOADING';
  videoId?: string;
  videoUrl?: string;
  publishTime?: string;
  errorMessage?: string;
}

export interface YouTubeProvider {
  getAuthUrl(userId?: string): string | null;
  handleOAuthCallback(code: string, userId?: string): Promise<{ success: boolean; channel?: YouTubeChannelInfo; error?: string }>;
  getConnectionStatus(userId?: string): Promise<{ status: YouTubeConnectionStatus; channel?: YouTubeChannelInfo; message: string }>;
  disconnect(userId?: string): Promise<boolean>;
  uploadVideo(params: YouTubeUploadParams, userId?: string): Promise<YouTubeUploadResult>;
  uploadThumbnail(videoId: string, thumbnailFilePath: string, userId?: string): Promise<{ success: boolean; error?: string }>;
  updateMetadata(params: { videoId: string; title: string; description: string; tags?: string[] }, userId?: string): Promise<{ success: boolean; error?: string }>;
}

class DefaultYouTubeProvider implements YouTubeProvider {
  private get clientId(): string {
    return process.env.GOOGLE_CLIENT_ID || process.env.YOUTUBE_CLIENT_ID || '';
  }

  private get clientSecret(): string {
    return process.env.GOOGLE_CLIENT_SECRET || process.env.YOUTUBE_CLIENT_SECRET || '';
  }

  private get redirectUri(): string {
    return process.env.GOOGLE_REDIRECT_URI || process.env.YOUTUBE_REDIRECT_URI || (process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/youtube/callback` : 'https://autora.live/api/auth/youtube/callback');
  }

  getAuthUrl(userId: string = DEFAULT_USER_ID): string | null {
    if (!this.clientId) {
      return null;
    }

    const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
    const options = {
      redirect_uri: this.redirectUri,
      client_id: this.clientId,
      access_type: 'offline',
      response_type: 'code',
      prompt: 'consent',
      scope: [
        'https://www.googleapis.com/auth/youtube.upload',
        'https://www.googleapis.com/auth/youtube.readonly',
        'https://www.googleapis.com/auth/userinfo.email',
      ].join(' '),
      state: userId,
    };

    const qs = new URLSearchParams(options);
    return `${rootUrl}?${qs.toString()}`;
  }

  async handleOAuthCallback(code: string, userId: string = DEFAULT_USER_ID): Promise<{ success: boolean; channel?: YouTubeChannelInfo; error?: string }> {
    if (!this.clientId || !this.clientSecret) {
      return { success: false, error: 'Google OAuth Client ID and Secret are not configured in environment.' };
    }

    try {
      // Exchange code for token
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: this.clientId,
          client_secret: this.clientSecret,
          redirect_uri: this.redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      if (!tokenRes.ok) {
        const errText = await tokenRes.text();
        return { success: false, error: `Token exchange failed: ${errText}` };
      }

      const tokenData = await tokenRes.json();
      const accessToken = tokenData.access_token;
      const refreshToken = tokenData.refresh_token;
      const expiresIn = tokenData.expires_in || 3600;
      const expiryDate = new Date(Date.now() + expiresIn * 1000).toISOString();

      // Fetch YouTube Channel Info
      const channelRes = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails&mine=true', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      let channelId = '';
      let channelTitle = 'YouTube Channel';
      let channelThumbnail = '';

      if (channelRes.ok) {
        const chData = await channelRes.json();
        const chItem = chData.items?.[0];
        if (chItem) {
          channelId = chItem.id;
          channelTitle = chItem.snippet?.title || 'Connected YouTube Channel';
          channelThumbnail = chItem.snippet?.thumbnails?.default?.url || '';
        }
      }

      // Fetch User Email
      const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      let accountEmail = '';
      if (userRes.ok) {
        const uData = await userRes.json();
        accountEmail = uData.email || '';
      }

      // Save connection securely to SQLite database
      const db = getDb();
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO oauth_connections (
          id, user_id, platform, account_email, channel_id, channel_title,
          access_token, refresh_token, token_expiry, scope, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id, platform) DO UPDATE SET
          account_email = excluded.account_email,
          channel_id = excluded.channel_id,
          channel_title = excluded.channel_title,
          access_token = excluded.access_token,
          refresh_token = COALESCE(excluded.refresh_token, oauth_connections.refresh_token),
          token_expiry = excluded.token_expiry,
          scope = excluded.scope,
          updated_at = excluded.updated_at
      `).run(
        `oauth_yt_${userId}`,
        userId,
        'YOUTUBE',
        accountEmail,
        channelId,
        channelTitle,
        encryptToken(accessToken),
        encryptToken(refreshToken || null),
        expiryDate,
        tokenData.scope || '',
        now,
        now
      );

      return {
        success: true,
        channel: {
          id: channelId,
          title: channelTitle,
          email: accountEmail,
          thumbnailUrl: channelThumbnail,
        },
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'OAuth handling failed' };
    }
  }

  async getConnectionStatus(userId: string = DEFAULT_USER_ID): Promise<{ status: YouTubeConnectionStatus; channel?: YouTubeChannelInfo; message: string }> {
    const db = getDb();
    const conn = db.prepare('SELECT * FROM oauth_connections WHERE user_id = ? AND platform = ?').get(userId, 'YOUTUBE') as OAuthConnection | undefined;

    if (!conn) {
      if (!this.clientId) {
        return {
          status: 'NOT_CONNECTED',
          message: 'YouTube OAuth credentials not configured. Configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.',
        };
      }
      return {
        status: 'AUTH_REQUIRED',
        message: 'YouTube account not connected. Please authorize your YouTube channel.',
      };
    }

    return {
      status: 'CONNECTED',
      channel: {
        id: conn.channel_id || '',
        title: conn.channel_title || 'Connected YouTube Channel',
        email: conn.account_email || undefined,
      },
      message: `Connected to YouTube Channel "${conn.channel_title || conn.channel_id}".`,
    };
  }

  async disconnect(userId: string = DEFAULT_USER_ID): Promise<boolean> {
    const db = getDb();
    db.prepare('DELETE FROM oauth_connections WHERE user_id = ? AND platform = ?').run(userId, 'YOUTUBE');
    return true;
  }

  async getValidAccessToken(userId: string = DEFAULT_USER_ID): Promise<{ token: string | null; conn?: OAuthConnection; error?: string }> {
    const db = getDb();
    const conn = db.prepare('SELECT * FROM oauth_connections WHERE user_id = ? AND platform = ?').get(userId, 'YOUTUBE') as OAuthConnection | undefined;

    if (!conn) {
      return { token: null, error: 'YouTube account not connected. Authenticate in /settings/publishing to enable direct publishing.' };
    }

    const decryptedAccessToken = decryptToken(conn.access_token) || conn.access_token;
    const decryptedRefreshToken = decryptToken(conn.refresh_token) || conn.refresh_token;

    let validAccessToken = decryptedAccessToken;
    if (conn.token_expiry && new Date(conn.token_expiry).getTime() < Date.now() + 60000 && decryptedRefreshToken) {
      try {
        const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: this.clientId,
            client_secret: this.clientSecret,
            refresh_token: decryptedRefreshToken,
            grant_type: 'refresh_token',
          }),
        });

        if (refreshRes.ok) {
          const rData = await refreshRes.json();
          validAccessToken = rData.access_token;
          const newExpiry = new Date(Date.now() + (rData.expires_in || 3600) * 1000).toISOString();
          const encryptedNewAccess = encryptToken(validAccessToken);
          db.prepare('UPDATE oauth_connections SET access_token = ?, token_expiry = ?, updated_at = ? WHERE id = ?').run(
            encryptedNewAccess,
            newExpiry,
            new Date().toISOString(),
            conn.id
          );
        } else {
          console.warn('[YouTube Token Refresh] Server returned status:', refreshRes.status);
        }
      } catch (err) {
        console.warn('[YouTube Token Refresh] Failed to refresh token:', err);
      }
    }

    return { token: validAccessToken, conn };
  }

  async uploadVideo(params: YouTubeUploadParams, userId: string = DEFAULT_USER_ID): Promise<YouTubeUploadResult> {
    const { videoFilePath, title, description, tags = [], visibility = 'PRIVATE', scheduledPublishTime } = params;

    const authResult = await this.getValidAccessToken(userId);
    if (!authResult.token || !authResult.conn) {
      return {
        status: 'NOT_CONNECTED',
        errorMessage: authResult.error || 'YouTube account is not connected. Authenticate in /settings/publishing to enable direct publishing.',
      };
    }
    const validAccessToken = authResult.token;

    if (!fs.existsSync(videoFilePath)) {
      return {
        status: 'FAILED',
        errorMessage: `Video file not found at path: ${videoFilePath}`,
      };
    }

    try {
      const stats = fs.statSync(videoFilePath);
      const fileSize = stats.size;

      const privacyStatus = scheduledPublishTime ? 'private' : visibility.toLowerCase();

      let isMadeForKids = params.madeForKids ?? false;
      if (params.madeForKids === undefined) {
        try {
          const db = getDb();
          const proj = db.prepare('SELECT channel_id FROM content_projects WHERE id = ?').get(params.projectId) as { channel_id?: string } | undefined;
          if (proj?.channel_id) {
            const ch = db.prepare('SELECT content_rules FROM channels WHERE id = ?').get(proj.channel_id) as { content_rules?: string } | undefined;
            if (ch?.content_rules && /kids|children|for\s+kids/i.test(ch.content_rules)) {
              isMadeForKids = true;
            }
          }
        } catch {}
      }

      const metadata: any = {
        snippet: {
          title: title.slice(0, 100),
          description: description.slice(0, 5000),
          tags: tags.slice(0, 30),
          categoryId: '22', // People & Blogs / Education
        },
        status: {
          privacyStatus,
          selfDeclaredMadeForKids: isMadeForKids,
          containsSyntheticMedia: true,
        },
      };

      if (scheduledPublishTime) {
        metadata.status.publishAt = new Date(scheduledPublishTime).toISOString();
        metadata.status.privacyStatus = 'private';
      }

      // Step 1: Initiate Resumable Upload
      const initRes = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${validAccessToken}`,
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Length': String(fileSize),
          'X-Upload-Content-Type': 'video/mp4',
        },
        body: JSON.stringify(metadata),
      });

      if (!initRes.ok) {
        const errBody = await initRes.text();
        return {
          status: 'FAILED',
          errorMessage: `YouTube upload initialization failed (${initRes.status}): ${errBody}`,
        };
      }

      const uploadUrl = initRes.headers.get('location');
      if (!uploadUrl) {
        return {
          status: 'FAILED',
          errorMessage: 'YouTube upload initialization did not return a valid resumable upload location header.',
        };
      }

      // Step 2: Upload Video File Stream
      const fileStream = fs.createReadStream(videoFilePath);
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Length': String(fileSize),
          'Content-Type': 'video/mp4',
        },
        body: fileStream as any,
        // @ts-ignore - Node.js fetch streaming support
        duplex: 'half',
      });

      if (!uploadRes.ok) {
        const uploadErr = await uploadRes.text();
        return {
          status: 'FAILED',
          errorMessage: `YouTube binary file upload failed (${uploadRes.status}): ${uploadErr}`,
        };
      }

      const uploadJson = await uploadRes.json();
      const videoId = uploadJson.id;
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

      // Step 3: Upload Thumbnail if provided
      if (params.thumbnailFilePath && fs.existsSync(params.thumbnailFilePath)) {
        await this.uploadThumbnail(videoId, params.thumbnailFilePath, userId).catch((err) => {
          console.warn('Thumbnail upload warning:', err);
        });
      }

      return {
        status: scheduledPublishTime ? 'SCHEDULED' : 'PUBLISHED',
        videoId,
        videoUrl,
        publishTime: scheduledPublishTime || new Date().toISOString(),
      };
    } catch (err: any) {
      return {
        status: 'FAILED',
        errorMessage: `YouTube upload execution failed: ${err.message || err}`,
      };
    }
  }

  async uploadThumbnail(videoId: string, thumbnailFilePath: string, userId: string = DEFAULT_USER_ID): Promise<{ success: boolean; error?: string }> {
    const authResult = await this.getValidAccessToken(userId);
    if (!authResult.token) {
      return { success: false, error: authResult.error || 'YouTube account not connected' };
    }
    const validAccessToken = authResult.token;

    if (!fs.existsSync(thumbnailFilePath)) {
      return { success: false, error: 'Thumbnail file does not exist' };
    }

    try {
      const stats = fs.statSync(thumbnailFilePath);
      const fileStream = fs.createReadStream(thumbnailFilePath);

      const res = await fetch(`https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${videoId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${validAccessToken}`,
          'Content-Length': String(stats.size),
          'Content-Type': 'image/png',
        },
        body: fileStream as any,
        // @ts-ignore
        duplex: 'half',
      });

      if (!res.ok) {
        const errText = await res.text();
        return { success: false, error: `Thumbnail upload failed (${res.status}): ${errText}` };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Thumbnail upload error' };
    }
  }

  async updateMetadata(params: { videoId: string; title: string; description: string; tags?: string[] }, userId: string = DEFAULT_USER_ID): Promise<{ success: boolean; error?: string }> {
    const authResult = await this.getValidAccessToken(userId);
    if (!authResult.token) {
      return { success: false, error: authResult.error || 'YouTube account not connected' };
    }
    const validAccessToken = authResult.token;

    try {
      const res = await fetch('https://www.googleapis.com/youtube/v3/videos?part=snippet', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${validAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: params.videoId,
          snippet: {
            title: params.title.slice(0, 100),
            description: params.description.slice(0, 5000),
            tags: params.tags?.slice(0, 30) || [],
            categoryId: '22',
          },
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        return { success: false, error: `Metadata update failed: ${errText}` };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}

export const youtubeProvider: YouTubeProvider = new DefaultYouTubeProvider();
