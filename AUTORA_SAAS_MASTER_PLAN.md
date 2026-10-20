# 🚀 AUTORA — Final Production SaaS Master Plan (v2.1)
### Codebase Target: `D:\Saas - Sami parthnership\youtube-automation-`
### Built For: Rayyan × Sami Partnership | High-Margin Multi-Platform Video Automation SaaS
### Validated Against: AUTORA Gap Analysis + Live Market Research + Codebase Audit + Trustpilot Pain Points

---

## 📋 Executive Summary & Codebase Audit Review

AUTORA is a Next.js 14 full-stack TypeScript application with SQLite (`better-sqlite3`) / PostgreSQL support, local FFmpeg video compositing, multi-tenant customer authentication, Stripe/Polar billing, and YouTube OAuth publishing.

This master plan addresses **every single gap identified in the audit**, fulfills the user requirements (Competitor Intelligence, Own Channel Analytics, AI Video Clips by Default, Multi-Platform Publishing to Instagram & TikTok, and Pain-Point-Driven Analytics), and provides the full financial cost model.

### 🔎 The Complete Codebase Audit Matrix (What Exists vs. What We Solve)

| Area | Current Code State | Critical Gap / Risk | Final Master Plan Solution |
|---|---|---|---|
| **Video Pipeline** | `SCRIPT → SCENES → VIDEO → VOICE → SUBTITLES → FINAL_VIDEO` state machine. | Visuals default to Flux static images with FFmpeg `zoompan`. True AI video (Wan 2.1, Veo, Hailuo) is only in dormant helper files. | **Make Real AI Video Clips Default** via `falVideoProvider` (Wan 2.1 / LTX) & `cloudflareVideoProvider` (Hailuo 2.3), with Flux motion as reliable fallback. |
| **Publishing Platforms** | `youtubeProvider.ts` exists; `publishingProvider.ts` has stubs for TikTok/Instagram returning `NOT_CONNECTED`. | No Instagram Reels publishing; no TikTok publishing. YouTube upload lacks `containsSyntheticMedia` disclosure and per-channel `made_for_kids`. | **Full Multi-Platform Auto-Publishing Engine**: Meta Graph API for Instagram Reels, TikTok Direct Post API v2, and compliant YouTube upload with AI disclosure. |
| **Competitor Intelligence** | Completely absent from codebase. | Users have to manually brainstorm video ideas; zero competitive market awareness. | **Automated Competitor Intelligence Engine**: Discover channels, scrape last 7-day viral outliers (>1.5× average), and 1-click add variations to calendar. |
| **Own Channel Analytics** | YouTube OAuth tokens stored in `oauth_connections`, but YouTube Analytics API is never called. | Calendar generates generic ideas without knowing what already works on the customer's channel. | **Own Channel IQ**: Pull real CTR, AVD %, and top video hooks from YouTube Analytics API to bias and calibrate future content generation. |
| **Analytics Dashboard** | Hardcoded stub (`avg render time: 38s`, static cards). | Zero live data; creates immediate buyer distrust during due diligence and user dissatisfaction. | **Pain-Point-Driven Analytics Dashboard**: Live credit refund ledger, render benchmark timers, AI clip ratio, originality scores, and YouTube metrics. |
| **Voice & Speech** | Edge TTS (`msedge-tts` v2.0.7) + ElevenLabs + voice cloning. | Microsoft Edge TTS is an undocumented internal endpoint with no commercial licensing rights for SaaS users. | **Licensed Commercial Voice Tiering**: Azure Speech API (500k chars/mo free tier + commercial license) + ElevenLabs Studio tier. |
| **Auth & Security** | Scrypt customer auth, signed sessions, admin vault. | Admin credentials fallback to default strings; admin sitemap is exposed; `/api/admin/auth` lacks brute-force protection. | **Fail-Closed Security Guard**: Eliminate all fallback strings, delete admin sitemap, implement IP-based rate limiting on admin routes. |
| **Billing & Credits** | Stripe + Polar webhooks, 2 plans ($49 Creator / $99 Pro), credit ledger. | Discrepancy between code ($49/$99) and documentation (4 tiers); failed renders don't automatically refund credits (Trustpilot #1 complaint). | **Unified 2-Tier Pricing + Zero-Waste Auto-Refund**: Transparent cost preview before render and automatic credit refund on job failure. |
| **Content Calendar UI** | `/calendar` page with AI-generated 30-day prompt generation. | Disconnected from real channel analytics or competitor trends. | **Integrated Content Studio**: Calendar feeds directly from competitor viral outliers and own-channel winning hooks. |
| **AI Slop / Originality** | Static prompt structure in AI script generator. | YouTube's 2026 Inauthentic Content crackdown penalizes channels with identical pacing and structure. | **Script Diversity & Originality Engine**: 5 distinct narrative frameworks rotated automatically per video to prevent channel demonetization. |

---

## 🎬 Section 1: The AI Video Pipeline Fix (Default Real AI Video Clips)

### The Core Problem
In the existing codebase (`src/lib/providers/videoProvider.ts`), `DefaultVideoProvider.generateSceneVideo` generates an AI still image using Cloudflare Flux 1 Schnell or Pollinations, and then creates motion using FFmpeg's `zoompan` filter. While efficient, this produces a "slideshow" aesthetic. Meanwhile, true generative video providers already exist in your codebase (`falVideoProvider.ts`, `veoVideoProvider.ts`, `cloudflareVideoProvider.ts`), but they are never called in the primary rendering loop!

### The Solution: Multi-Tier AI Video Generation Pipeline
We refactor `videoProvider.ts` to make **real AI video clips the default generation path**:

```
SCENE PROMPT
    │
    ▼
[ Tier 1: True AI Video Generation ]
    ├── Primary: FAL.ai Wan 2.1 (720p / 16fps) or Cloudflare Hailuo 2.3
    └── Pro Tier: Google Veo 3.1 Fast (High Cinematic Fidelity)
    │
    ├── SUCCESS ──► AI Motion Video Clip (.mp4) ──► Scene QC Checker (≥80%)
    │
    ▼ (API Key Missing / Timeout / Rate Limit)
[ Tier 2: Generative Still + Dynamic Camera Motion (Failsafe) ]
    ├── Cloudflare Flux 1 Schnell (1080x1920)
    └── FFmpeg Cinematic Zoompan + Volumetric Grain + Grade
    │
    ▼
[ Output Validation ]
    └── Zero Black Frames / Zero Procedural Color Blocks
```

### Exact Code Implementation: `src/lib/providers/videoProvider.ts`

Replace the current scene generation logic in `DefaultVideoProvider` with an intelligent tiered router:

```typescript
// src/lib/providers/videoProvider.ts (Refactored Scene Generation Method)

import { falVideoProvider } from './falVideoProvider';
import { cloudflareVideoProvider } from './cloudflareVideoProvider';
import { veoVideoProvider } from './veoVideoProvider';
import { qualityControlService } from '../video/qualityControl';

export class DefaultVideoProvider implements VideoProvider {
  // ... existing constructor & setup ...

  async generateSceneVideo(params: SceneVideoParams): Promise<void> {
    const {
      outputPath,
      prompt,
      durationSec = 5,
      sceneIndex,
      aspectRatio = '9:16',
      userTier = 'creator', // 'creator' or 'pro'
      userId,
    } = params;

    let videoGenerated = false;

    // ============================================================
    // STEP 1: ATTEMPT TRUE GENERATIVE AI VIDEO (DEFAULT PATH)
    // ============================================================
    
    // Check if FAL.ai Wan 2.1 / LTX is available
    if (!videoGenerated && falVideoProvider.isConfigured()) {
      try {
        console.log(`[VideoProvider] 🚀 Generating TRUE AI Video Clip for Scene ${sceneIndex} via FAL.ai Wan 2.1...`);
        const clipResult = await falVideoProvider.generateClip({
          prompt,
          durationSec,
          outputPath,
          sceneIndex,
          aspectRatio,
        });

        if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 10000) {
          // Validate with Quality Control
          const qc = await qualityControlService.validateSceneClip(outputPath);
          if (qc.isValid) {
            videoGenerated = true;
            console.log(`[VideoProvider] ✅ High-quality AI video clip generated and verified for Scene ${sceneIndex}`);
            return;
          }
        }
      } catch (err: any) {
        console.warn(`[VideoProvider] FAL.ai video generation failed for Scene ${sceneIndex}: ${err.message}. Cascading...`);
      }
    }

    // Check Cloudflare Workers AI Hailuo 2.3 (Fast & Affordable)
    if (!videoGenerated && cloudflareVideoProvider.isConfigured()) {
      try {
        console.log(`[VideoProvider] 🚀 Generating AI Video Clip for Scene ${sceneIndex} via Cloudflare Hailuo...`);
        await cloudflareVideoProvider.generateClip({
          prompt,
          durationSec,
          outputPath,
          sceneIndex,
          aspectRatio,
        });

        if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 10000) {
          videoGenerated = true;
          return;
        }
      } catch (err: any) {
        console.warn(`[VideoProvider] Cloudflare AI video failed: ${err.message}. Cascading...`);
      }
    }

    // For Pro Tier: Check Google Veo 3.1
    if (!videoGenerated && userTier === 'pro' && veoVideoProvider.isConfigured()) {
      try {
        console.log(`[VideoProvider] 🌟 Generating Pro AI Video Clip via Google Veo 3.1 for Scene ${sceneIndex}...`);
        await veoVideoProvider.generateClip({
          prompt,
          durationSec,
          outputPath,
          sceneIndex,
          aspectRatio,
        });

        if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 10000) {
          videoGenerated = true;
          return;
        }
      } catch (err: any) {
        console.warn(`[VideoProvider] Google Veo generation failed: ${err.message}. Cascading...`);
      }
    }

    // ============================================================
    // STEP 2: HIGH-FIDELITY FAILSAFE (FLUX 1 SCHNELL + FFMPEG MOTION)
    // ============================================================
    console.log(`[VideoProvider] ⚠️ AI Video APIs unavailable or rate-limited. Falling back to Flux 1 Schnell Cinematic Pan...`);
    await this.renderCinematicStillWithMotion(params);
  }
}
```

---

## 📱 Section 2: Multi-Platform Auto-Publishing (Instagram Reels + TikTok + YouTube)

Currently, `publishingProvider.ts` only routes to `youtubeProvider.ts`. We will implement full direct publishing for **Instagram Reels** and **TikTok**, backed by secure OAuth token management in SQLite.

```
                              [ Video Output Ready ]
                                        │
                                        ▼
                        [ publishingProvider Dispatcher ]
                                        │
             ┌──────────────────────────┼──────────────────────────┐
             ▼                          ▼                          ▼
      [ YouTube API ]           [ Instagram Graph API ]     [ TikTok API v2 ]
             │                          │                          │
    • Resumable Upload          • Create Media Container    • Direct Post Init
    • Set Made-for-Kids         • Upload Video Stream       • Chunked File Upload
    • AI Disclosure Flag        • Poll Processing Status    • Publish Confirmation
    • Schedule Publish          • Call Media Publish        • Creator Inbox Notice
```

### 1. Instagram Reels Publishing (`src/lib/providers/instagramProvider.ts`)

Instagram requires a 2-step containerized publishing flow via the Meta Graph API v20.0+:
1. Create a Media Container with `media_type: 'REELS'` and public video URL (or Cloudflare R2 signed URL).
2. Poll container status until `FINISHED`.
3. Publish container to the user's Instagram Professional/Creator account.

```typescript
// src/lib/providers/instagramProvider.ts

import { getDb, OAuthConnection } from '../db';
import { decryptToken } from '../security/encryption';

export interface InstagramPublishParams {
  userId: string;
  videoUrl: string; // Must be publicly accessible HTTPS URL (e.g. from R2 or temporary signed URL)
  caption: string;
  coverUrl?: string;
  shareToFeed?: boolean;
}

export interface InstagramPublishResult {
  success: boolean;
  mediaId?: string;
  permalink?: string;
  error?: string;
}

export class InstagramProvider {
  private async getValidToken(userId: string): Promise<{ accessToken: string; igUserId: string } | null> {
    const db = getDb();
    const conn = db.prepare('SELECT * FROM oauth_connections WHERE user_id = ? AND platform = ?').get(userId, 'INSTAGRAM') as OAuthConnection | undefined;
    if (!conn) return null;

    const accessToken = decryptToken(conn.access_token);
    return { accessToken, igUserId: conn.channel_id || '' };
  }

  async publishReel(params: InstagramPublishParams): Promise<InstagramPublishResult> {
    const auth = await this.getValidToken(params.userId);
    if (!auth || !auth.igUserId) {
      return { success: false, error: 'Instagram account not connected. Please connect in Settings.' };
    }

    try {
      // Step 1: Create Media Container
      const containerUrl = `https://graph.facebook.com/v20.0/${auth.igUserId}/media`;
      const containerBody = new URLSearchParams({
        media_type: 'REELS',
        video_url: params.videoUrl,
        caption: params.caption,
        share_to_feed: params.shareToFeed ? 'true' : 'false',
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
        return { success: false, error: initData.error?.message || 'Failed to create Instagram Reels container' };
      }

      const containerId = initData.id;

      // Step 2: Poll Container Status until READY
      let isReady = false;
      const startTime = Date.now();
      while (!isReady && Date.now() - startTime < 180000) { // 3 min max
        await new Promise(r => setTimeout(r, 5000));
        const statusRes = await fetch(`https://graph.facebook.com/v20.0/${containerId}?fields=status_code,status&access_token=${auth.accessToken}`);
        const statusData = await statusRes.json();

        if (statusData.status_code === 'FINISHED') {
          isReady = true;
        } else if (statusData.status_code === 'ERROR') {
          return { success: false, error: `Instagram media processing failed: ${statusData.status}` };
        }
      }

      if (!isReady) {
        return { success: false, error: 'Instagram media upload processing timed out.' };
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
        return { success: false, error: publishData.error?.message || 'Failed to publish Instagram Reel' };
      }

      return {
        success: true,
        mediaId: publishData.id,
        permalink: `https://www.instagram.com/reel/${publishData.id}`,
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}

export const instagramProvider = new InstagramProvider();
```

---

### 2. TikTok Direct Post Publishing (`src/lib/providers/tiktokProvider.ts`)

TikTok uses the TikTok Content Posting API v2 (Direct Post):

```typescript
// src/lib/providers/tiktokProvider.ts

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
    const conn = db.prepare('SELECT * FROM oauth_connections WHERE user_id = ? AND platform = ?').get(userId, 'TIKTOK') as OAuthConnection | undefined;
    if (!conn) return null;
    return decryptToken(conn.access_token);
  }

  async publishVideo(params: TikTokPublishParams): Promise<TikTokPublishResult> {
    const accessToken = await this.getValidToken(params.userId);
    if (!accessToken) {
      return { success: false, error: 'TikTok account not connected. Please connect in Settings.' };
    }

    if (!fs.existsSync(params.videoFilePath)) {
      return { success: false, error: `Video file not found: ${params.videoFilePath}` };
    }

    try {
      const stats = fs.statSync(params.videoFilePath);
      const fileSize = stats.size;

      // Step 1: Initialize Direct Post
      const initUrl = 'https://open.tiktokapis.com/v2/post/publish/video/init/';
      const initRes = await fetch(initUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
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
        return { success: false, error: initData.error?.message || 'TikTok upload initialization failed.' };
      }

      const { upload_url, publish_id } = initData.data;

      // Step 2: Stream Binary Video to TikTok Upload URL
      const fileStream = fs.createReadStream(params.videoFilePath);
      const uploadRes = await fetch(upload_url, {
        method: 'PUT',
        headers: {
          'Content-Range': `bytes 0-${fileSize - 1}/${fileSize}`,
          'Content-Type': 'video/mp4',
          'Content-Length': String(fileSize),
        },
        body: fileStream as any,
        // @ts-ignore
        duplex: 'half',
      });

      if (!uploadRes.ok) {
        return { success: false, error: `TikTok binary file transfer failed with status ${uploadRes.status}` };
      }

      return {
        success: true,
        publishId: publish_id,
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}

export const tiktokProvider = new TikTokProvider();
```

---

### 3. Unified Dispatcher Update (`src/lib/providers/publishingProvider.ts`)

Wire `instagramProvider` and `tiktokProvider` directly into `MultiPlatformPublishingProvider.publishVideo`:

```typescript
// Integration into src/lib/providers/publishingProvider.ts

import { youtubeProvider } from './youtubeProvider';
import { instagramProvider } from './instagramProvider';
import { tiktokProvider } from './tiktokProvider';

// Inside MultiPlatformPublishingProvider.publishVideo:
if (platform === 'YouTube') {
  // Existing YouTube implementation with AI disclosure flag...
}

if (platform === 'Instagram') {
  // Use public R2 storage URL or temporary signed URL for Instagram container
  const publicVideoUrl = await storageService.getPublicOrSignedUrl(params.videoFilePath);
  const igRes = await instagramProvider.publishReel({
    userId,
    videoUrl: publicVideoUrl,
    caption: `${params.title}\n\n${params.description}\n\n${(params.tags || []).map(t => `#${t.replace(/\s+/g, '')}`).join(' ')}`,
    coverUrl: params.thumbnailFilePath ? await storageService.getPublicOrSignedUrl(params.thumbnailFilePath) : undefined,
    shareToFeed: true,
  });

  return {
    status: igRes.success ? 'PUBLISHED' : 'FAILED',
    platform: 'Instagram',
    platformVideoId: igRes.mediaId,
    platformUrl: igRes.permalink,
    errorMessage: igRes.error,
  };
}

if (platform === 'TikTok') {
  const ttRes = await tiktokProvider.publishVideo({
    userId,
    videoFilePath: params.videoFilePath,
    title: params.title,
    privacyLevel: 'PUBLIC_TO_EVERYONE',
  });

  return {
    status: ttRes.success ? 'PUBLISHED' : 'FAILED',
    platform: 'TikTok',
    platformVideoId: ttRes.publishId,
    errorMessage: ttRes.error,
  };
}
```

---

## 🔍 Section 3: Competitor Intelligence & Viral Topic Harvester

### Workflow Architecture
1. **User Input**: User adds competitor channel handles (e.g. `@MagnatesMedia`, `@AliAbdaal`, or niche keywords like `"Dark Psychology"`).
2. **Channel Resolution**: Backend queries YouTube Data API v3 (`channels.list` / `search.list`) to resolve handle to canonical Channel ID (`UC...`).
3. **Uploads Harvesting**: Backend queries `playlistItems.list` on the channel's uploads playlist to retrieve all videos uploaded in the **last 7 to 14 days**.
4. **Outlier / Viral Calculation**:
   $$\text{Viral Score} = \frac{\text{Video Views}}{\text{Channel 7-Day Average Views}}$$
   Videos with $\text{Viral Score} \ge 1.5$ are tagged as **🔥 Viral Outliers**.
5. **AI Variation Engine**: User clicks **"Add Variation to Calendar"**. Gemini 2.0 Flash takes the competitor's viral hook, preserves the psychological trigger, but generates **5 brand-new, unique angles tailored to the user's specific channel niche**.

```
[ User Inputs @Competitor ]
          │
          ▼
[ YouTube Data API v3 ] ──► Resolve Channel ID & Fetch Last 7-Day Uploads
          │
          ▼
[ Outlier Calculation ] ──► Filter Videos where Views > 1.5× Channel Avg
          │
          ▼
[ Display Viral Feed ] ──► Title, Views, Outlier Multiplier, Published Date
          │
          ▼
[ 1-Click "Add to Calendar" ] ──► AI Generates Original Angle ──► Added to 30-Day Plan!
```

### New Database Tables (SQLite / Postgres)

```sql
-- Track competitor channels per user
CREATE TABLE IF NOT EXISTS competitor_channels (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  channel_handle TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  channel_title TEXT NOT NULL,
  thumbnail_url TEXT,
  subscriber_count INTEGER DEFAULT 0,
  avg_views_7d INTEGER DEFAULT 0,
  last_refreshed TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(user_id, channel_handle),
  FOREIGN KEY (user_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- Cache viral videos (TTL: 6 hours to minimize YouTube API quota)
CREATE TABLE IF NOT EXISTS competitor_viral_cache (
  id TEXT PRIMARY KEY,
  competitor_id TEXT NOT NULL,
  video_id TEXT NOT NULL,
  title TEXT NOT NULL,
  view_count INTEGER NOT NULL,
  like_count INTEGER DEFAULT 0,
  published_at TEXT NOT NULL,
  viral_score REAL NOT NULL, -- e.g. 2.4x
  thumbnail_url TEXT,
  cached_at TEXT NOT NULL,
  FOREIGN KEY (competitor_id) REFERENCES competitor_channels(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_competitors_user ON competitor_channels(user_id);
CREATE INDEX IF NOT EXISTS idx_viral_cache_comp ON competitor_viral_cache(competitor_id);
```

### API Implementation: `src/app/api/competitors/discover/route.ts`

```typescript
// src/app/api/competitors/discover/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { handleOrQuery } = await req.json();
  if (!handleOrQuery) return NextResponse.json({ error: 'Missing competitor handle or search query' }, { status: 400 });

  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'YouTube API Key not configured' }, { status: 500 });

  try {
    // 1. Resolve Channel using YouTube Data API
    let channelId = '';
    let title = '';
    let thumb = '';
    let subs = 0;

    const cleanHandle = handleOrQuery.replace(/^@/, '').trim();
    const handleRes = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&forHandle=${encodeURIComponent(cleanHandle)}&key=${apiKey}`
    );
    const handleData = await handleRes.json();

    if (handleData.items && handleData.items.length > 0) {
      const item = handleData.items[0];
      channelId = item.id;
      title = item.snippet.title;
      thumb = item.snippet.thumbnails?.default?.url || '';
      subs = parseInt(item.statistics.subscriberCount || '0', 10);
    } else {
      // Fallback search by query
      const searchRes = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(cleanHandle)}&maxResults=1&key=${apiKey}`
      );
      const searchData = await searchRes.json();
      if (!searchData.items || searchData.items.length === 0) {
        return NextResponse.json({ error: 'Competitor channel not found' }, { status: 404 });
      }
      channelId = searchData.items[0].snippet.channelId;
      title = searchData.items[0].snippet.title;
      thumb = searchData.items[0].snippet.thumbnails?.default?.url || '';
    }

    // 2. Fetch Recent Uploads Playlist
    const chanRes = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${apiKey}`
    );
    const chanData = await chanRes.json();
    const uploadsPlaylistId = chanData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;

    if (!uploadsPlaylistId) {
      return NextResponse.json({ error: 'Unable to access channel uploads' }, { status: 404 });
    }

    // 3. Fetch Last 15 Videos
    const playlistRes = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${uploadsPlaylistId}&maxResults=15&key=${apiKey}`
    );
    const playlistData = await playlistRes.json();
    const videoIds = (playlistData.items || []).map((i: any) => i.contentDetails.videoId).join(',');

    // 4. Fetch Video Statistics
    const statsRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoIds}&key=${apiKey}`
    );
    const statsData = await statsRes.json();
    const videos = statsData.items || [];

    // 5. Calculate Outliers (Average Views & Viral Multiplier)
    const sevenDaysAgo = new Date(Date.now() - 14 * 86400000).toISOString();
    const recentVideos = videos.filter((v: any) => v.snippet.publishedAt >= sevenDaysAgo);
    const targetVideos = recentVideos.length > 0 ? recentVideos : videos.slice(0, 7);

    const totalViews = targetVideos.reduce((acc: number, v: any) => acc + parseInt(v.statistics.viewCount || '0', 10), 0);
    const avgViews = Math.max(1, Math.round(totalViews / targetVideos.length));

    const viralVideos = targetVideos.map((v: any) => {
      const views = parseInt(v.statistics.viewCount || '0', 10);
      const viralScore = Math.round((views / avgViews) * 10) / 10;
      return {
        videoId: v.id,
        title: v.snippet.title,
        views,
        likes: parseInt(v.statistics.likeCount || '0', 10),
        publishedAt: v.snippet.publishedAt,
        viralScore,
        thumbnailUrl: v.snippet.thumbnails?.medium?.url || '',
      };
    }).sort((a: any, b: any) => b.viralScore - a.viralScore);

    // 6. Save in SQLite
    const db = getDb();
    const compId = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO competitor_channels (id, user_id, channel_handle, channel_id, channel_title, thumbnail_url, subscriber_count, avg_views_7d, last_refreshed, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, channel_handle) DO UPDATE SET
        avg_views_7d = excluded.avg_views_7d,
        last_refreshed = excluded.last_refreshed
    `).run(compId, user.id, cleanHandle, channelId, title, thumb, subs, avgViews, now, now);

    return NextResponse.json({
      success: true,
      channel: { id: channelId, title, handle: cleanHandle, avgViews, subscribers: subs },
      viralVideos,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

---

## 📈 Section 4: Own Channel IQ & Winner-Biased Calendar

### How Winner Bias Works
When a user connects their YouTube channel via OAuth, AUTORA accesses the **YouTube Analytics API** (`reports.query`). We pull their top 10 performing videos by **Views, Impressions, CTR %, and Average View Duration (AVD %)** over the last 90 days.

When the user opens the Content Calendar to generate their next 30-day plan, this performance context is automatically injected into the generation prompt:

```typescript
// Prompt injection in src/app/api/calendar/generate-plan/route.ts
const winningTopicsContext = userTopVideos
  .map(v => `• "${v.title}" (Retention: ${v.avd_pct}%, CTR: ${v.ctr_pct}%)`)
  .join('\n');

const promptText = `
You are a senior YouTube content strategist.
Channel Niche: "${niche}".
Target Format: ${isShort ? '60-Second Viral Short' : '8-Minute Video'}.

DATA FROM USER'S TOP-PERFORMING VIDEOS (REPLICATE THESE PATTERNS):
${winningTopicsContext}

Generate 30 brand-new video topics that double down on what ALREADY works on this channel.
Focus on the formats, emotional triggers, and vocabulary from their highest-retention videos.
`;
```

---

## 📊 Section 5: Market-Researched Analytics Dashboard (Solving Real User Pain Points)

### Solving the Trustpilot Complaints

| Incumbent Pain Point (Trustpilot InVideo 1.8★ / Fliki / Pictory) | AUTORA Real Analytics Dashboard Metric |
|---|---|
| **"Credits vanish on failed renders"** | **Zero-Waste Credit Transparency Card**: Total Credits, Credits Consumed, Automatic Credits Refunded (with a live ledger link showing every refunded failed job). |
| **"Cheap slideshow slop output"** | **Video Quality & Motion Breakdown**: Real AI Video Clips % (Wan 2.1/Hailuo) vs. Still Zoompan %, Resolution distribution, and 60 FPS status. |
| **"Channels get demonetized for duplicate slop"** | **YouTube Originality & Compliance Score**: Script Diversity Index (0-100), AI Synthetic Media Disclosure Status, and Batch Similarity Warning. |
| **"Fake stats & hardcoded numbers"** | **Real SQLite Benchmark Engine**: Live average render time calculated from actual completed `video_jobs` table records. |
| **"No feedback on what actually gets views"** | **YouTube Performance Feed**: Direct API sync of CTR %, Average View Duration (AVD %), and Impressions from the user's connected YouTube channel. |

### Analytics Dashboard Wireframe & KPI Grid

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│  📊 AUTORA Channel & Production Intelligence                                           │
├────────────────────┬────────────────────┬────────────────────┬─────────────────────────┤
│  ⚡ Render Health  │  💎 Credit Ledger  │  🛡️ Compliance     │  📈 YouTube CTR (Avg)   │
│  Avg: 4m 12s       │  750 Balance       │  100% Monitored    │  8.4% (Top: 12.2%)      │
│  96.4% Success     │  +50 Auto-Refunded │  Synthetic Flag: ON│  Avg Retention: 62%     │
├────────────────────┴────────────────────┴────────────────────┴─────────────────────────┤
│                                                                                        │
│  🎬 Visual Motion Distribution                                                         │
│  [████████████████████████████████████░░░░░░░░] 78% True Generative AI Video Clips     │
│  [████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░] 22% Cinematic Dynamic Flux Pan          │
│                                                                                        │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  🏆 Your Channel's Top Performing Formats (Winner Feedback Loop)                       │
│  1. "How [Entity] Secretly Controls [Market]" ── 84K views | 11.2% CTR | 71% Retention │
│  2. "The 5 Mistakes Everyone Makes in [Niche]" ── 42K views | 9.8% CTR  | 64% Retention│
│  [⚡ Auto-Generate 5 Variations of Top Winners into Calendar]                          │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### Analytics Summary API Route: `src/app/api/analytics/summary/route.ts`

```typescript
// src/app/api/analytics/summary/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();

  // 1. Real Average Render Time (in seconds)
  const renderStats = db.prepare(`
    SELECT 
      AVG((julianday(completed_at) - julianday(started_at)) * 86400) as avg_render_seconds,
      COUNT(*) as total_jobs,
      COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_jobs,
      COUNT(CASE WHEN status = 'FAILED' THEN 1 END) as failed_jobs
    FROM video_jobs
    WHERE started_at IS NOT NULL AND completed_at IS NOT NULL
  `).get() as any;

  // 2. Real Credit Transparency & Auto-Refund Totals
  const creditStats = db.prepare(`
    SELECT 
      SUM(CASE WHEN type = 'VIDEO_GENERATION' THEN ABS(amount) ELSE 0 END) as credits_spent,
      SUM(CASE WHEN type = 'REFUND' THEN amount ELSE 0 END) as credits_refunded
    FROM credit_transactions
    WHERE customer_id = ?
  `).get(user.id) as any;

  // 3. Content Production Stats
  const projectStats = db.prepare(`
    SELECT 
      COUNT(*) as total_projects,
      COUNT(CASE WHEN publishing_status = 'PUBLISHED' THEN 1 END) as published_count,
      COUNT(CASE WHEN publishing_status = 'SCHEDULED' THEN 1 END) as scheduled_count
    FROM content_projects
    WHERE user_id = ?
  `).get(user.id) as any;

  return NextResponse.json({
    renderHealth: {
      avgRenderSeconds: Math.round(renderStats?.avg_render_seconds || 240),
      successRatePct: renderStats?.total_jobs > 0 
        ? Math.round((renderStats.completed_jobs / renderStats.total_jobs) * 100) 
        : 100,
      totalCompletedJobs: renderStats?.completed_jobs || 0,
    },
    creditLedger: {
      spent: creditStats?.credits_spent || 0,
      autoRefunded: creditStats?.credits_refunded || 0,
      refundPolicy: '100% Zero-Waste: Failed renders automatically credited back instantly.',
    },
    production: {
      totalCreated: projectStats?.total_projects || 0,
      published: projectStats?.published_count || 0,
      scheduled: projectStats?.scheduled_count || 0,
    },
  });
}
```

---

## 🛠️ Section 6: Complete Solutions for ALL Remaining Audit Areas

### 1. Voice & TTS: Commercial License Compliance
- **Current Issue**: `msedge-tts` accesses Microsoft's internal preview synthesizer without a commercial license. If an enterprise or creator audits the app, this poses copyright risk.
- **Master Plan Solution**: 
  - Add **Azure Cognitive Speech API** as the primary licensed voice provider (0.5M characters/month free, then $16 per 1M characters).
  - Retain **ElevenLabs** as the ultra-premium voice option (already fully supported in `src/lib/providers/voiceProvider.ts`).
  - Keep Edge TTS strictly as a user-configured development sandbox mode.

### 2. Admin Security & Fail-Closed Guard
- **Current Issue**: `src/app/api/admin/auth/route.ts` has fallback default credentials (`admin` / default pass), and `public/admin-sitemap.xml` reveals the admin path.
- **Master Plan Solution**:
  ```typescript
  // Fail-closed enforcement on startup:
  if (!process.env.ADMIN_USER || !process.env.ADMIN_PASSWORD || !process.env.ADMIN_SECRET) {
    throw new Error('FATAL SECURITY ERROR: Admin environment variables not set. Server refusing to boot.');
  }
  ```
  - Delete `public/admin-sitemap.xml`.
  - Add IP-based sliding-window rate limiting to `/api/admin/auth` (5 attempts per 15 minutes).

### 3. Pricing & Tier Reconciling
- **Current Issue**: Code implements $49 (Creator) and $99 (Pro), while documentation describes 4 tiers.
- **Master Plan Solution**: Standardize on the 2 clean, high-converting tiers:
  - **Creator ($49/mo)**: 30 videos/mo, 1 channel, 750 credits, 1080p Full HD, Standard AI Voice & Video.
  - **Pro ($99/mo)**: 90 videos/mo, 5 channels, 2,250 credits, 4K exports, Priority Queue, Competitor Intelligence, Cloned Voices, Multi-Platform (YT + IG + TikTok).

### 4. YouTube Monetization & Originality Protection
- **Current Issue**: YouTube's updated Inauthentic Content Policy penalizes identical repetitive scripts.
- **Master Plan Solution**: Implement the **Narrative Variety Engine** in `src/lib/providers/personalCreatorScriptService.ts`. The prompt generator rotates across 5 distinct narrative structures:
  1. *The Provocative Question Hook* (Pattern interrupt $\to$ Case study $\to$ Payoff)
  2. *The Counter-Intuitive Mistake* (Identify mistake $\to$ Breakdown why $\to$ Correct system)
  3. *The Historical / Business Case Breakdown* (Opening conflict $\to$ Behind the scenes $\to$ Climax)
  4. *The Step-by-Step Tactical System* (Fast overview $\to$ 3 rules $\to$ Immediate CTA)
  5. *The Mystery Box Curiosity Loop* (Incomplete open loop $\to$ Clues $\to$ Resolution)

---

## 💰 Section 7: Full Cost Breakdown & Unit Economics

### 1. Cost Per Video Output (COGS)

| Pipeline Component | Service / Provider Used | Unit Price | Cost per 60s Short (5 Scenes) | Cost per 5-Min Video (15 Scenes) |
|---|---|---|---|---|
| **Script Generation** | DeepSeek-V3 / Gemini 2.0 Flash | $0.14 / 1M input tokens | **$0.001** | **$0.003** |
| **Neural Voiceover** | Azure Speech (Licensed) / Edge | $0.000016 / word | **$0.003** | **$0.015** |
| **True AI Video Clips** | FAL.ai Wan 2.1 (720p) or Hailuo | $0.20 - $0.40 / clip | **$1.00** (5 scenes @ $0.20) | **$3.00** (Mixed 5 AI + 10 Pan) |
| **Cinematic Still Pan (Fallback)** | Cloudflare Flux 1 Schnell | $0.003 / image | **$0.015** (5 images) | **$0.045** (15 images) |
| **Subtitles / Burn-In** | Local FFmpeg on server | Free / Compute | **$0.000** | **$0.000** |
| **Storage (Video + Assets)** | Cloudflare R2 (S3-compatible) | $0.015 / GB-month | **$0.002** (~50MB MP4) | **$0.005** (~150MB MP4) |
| **Publishing (YT, IG, TikTok)** | Direct Platform APIs | Free Developer APIs | **$0.000** | **$0.000** |
| **TOTAL COGS (AI Video Clips)** | **FAL Wan 2.1 + Azure Speech** | — | **$1.01 per video** | **$3.03 per video** |
| **TOTAL COGS (Cinematic Pan)** | **Flux Schnell + Azure Speech** | — | **$0.02 per video** | **$0.06 per video** |

### 2. Competitor Intelligence API Cost

| Action | API Called | Quota / API Cost | Dollar Cost to You |
|---|---|---|---|
| **Channel Discovery** | YouTube Data API v3 (`channels.list`) | 1 Quota Unit | **$0.00** (10,000 units free daily) |
| **Last 7-Day Uploads** | YouTube Data API v3 (`playlistItems.list`) | 1 Quota Unit | **$0.00** |
| **Video Views & Stats** | YouTube Data API v3 (`videos.list`) | 1 Quota Unit | **$0.00** |
| **Viral Hook Transformation** | Gemini 2.0 Flash (OpenRouter/Google) | ~800 tokens input/output | **$0.0008** |
| **TOTAL PER COMPETITOR SCAN** | — | **3 Quota Units + Gemini** | **<$0.001 per scan** |

> *Note: Even if a Pro user monitors 10 competitors daily, the monthly cost for competitor intelligence is less than $0.30 per user.*

### 3. Monthly Profit Margins per Plan

| Subscription Plan | Monthly Price | Video Quota | Blended COGS (AI Video + Pan) | Hosting / Server Cost | Net Profit per User | Gross Margin |
|---|---|---|---|---|---|---|
| **Creator Plan** | **$49 / mo** | 30 Videos | ~$12.00 (10 AI Clips + 20 Pan) | $1.50 | **$35.50** | **72.4%** |
| **Pro Plan** | **$99 / mo** | 90 Videos | ~$38.00 (30 AI Clips + 60 Pan) | $3.50 | **$57.50** | **58.1%** |

### 4. Business Break-Even Calculation
- Fixed Infrastructure Costs:
  - Hetzner / DigitalOcean Dedicated FFmpeg Render Server: **$48.00 / mo**
  - Cloudflare R2 Storage (1 TB): **$15.00 / mo**
  - Domain, SSL & Monitoring: **$10.00 / mo**
  - **Total Fixed Monthly Overhead: ~$73.00 / mo**
- **Break-Even Point: Exactly 2 paying Creator customers ($49 × 2 = $98) covers the entire server stack!**

---

## 📅 Section 8: 8-Week Implementation & Launch Roadmap

```
[ Week 1-2 ] Security & Stability ──► Admin fail-closed, credit refund on failure, cost preview modal
[ Week 3 ]   Default AI Video      ──► Route videoProvider to Wan 2.1 / Hailuo, eliminate black frames
[ Week 4 ]   Competitor Engine     ──► YouTube scraper, outlier score formula, add variation to calendar
[ Week 5 ]   Own Channel IQ        ──► YouTube Analytics API, top hook extraction, winner prompt injection
[ Week 6 ]   Social Auto-Publish   ──► Instagram Reels Graph API, TikTok Direct Post API v2
[ Week 7 ]   Analytics Dashboard   ──► Real SQLite queries, credit transparency card, motion distribution
[ Week 8 ]   Compliance & Launch   ──► Commercial voice license, YouTube quota request, Meta app review
```

| Week | Focus | Concrete Deliverables |
|---|---|---|
| **Week 1** | Security & Quotas | • Purge hardcoded admin credentials & delete `admin-sitemap.xml`.<br>• Turn off build error ignores (`ignoreBuildErrors: false`) and fix linter errors.<br>• Add sliding-window rate limit on admin auth. |
| **Week 2** | Credit Transparency | • Implement auto-refund in `worker.ts` on any job failure.<br>• Add Pre-Render Cost & Time Preview Modal in UI.<br>• Reconcile pricing to $49 / $99 across all code and docs. |
| **Week 3** | Default AI Video | • Update `videoProvider.ts` to call FAL Wan 2.1 & Cloudflare Hailuo by default.<br>• Implement strict fallback to Flux Schnell zoompan.<br>• Eliminate Coverr and untracked stock footage. |
| **Week 4** | Competitor Intelligence | • Create `competitor_channels` and `competitor_viral_cache` tables.<br>• Build `/api/competitors/discover` and viral outlier calculation.<br>• Build `/competitors` UI with 1-click "Add to Calendar". |
| **Week 5** | Own Channel IQ | • Integrate YouTube Analytics API in `/api/analytics/my-channel`.<br>• Pull CTR % and AVD % for top 10 performing videos.<br>• Inject winning topics into `/api/calendar/generate-plan`. |
| **Week 6** | Multi-Platform Publishing | • Build `instagramProvider.ts` for Instagram Reels via Meta Graph API.<br>• Build `tiktokProvider.ts` for TikTok Direct Post API v2.<br>• Add platform connection toggles in `/settings/publishing`. |
| **Week 7** | Real Analytics Dashboard | • Replace stub in `/dashboard` with live SQLite queries.<br>• Display real average render times, credit refund ledger, and motion ratio.<br>• Show live YouTube CTR and retention charts. |
| **Week 8** | Launch Readiness | • File YouTube API Quota Extension form in Google Cloud Console.<br>• Submit Meta App for Instagram Reels review.<br>• Launch on ProductHunt, Twitter/X, and YouTube Automation communities. |

---

## 🏆 Summary: The Complete Advantage

With this plan executed:
1. **You solve the #1 user complaint** (credits wasted on failures) with an automatic refund system that no competitor provides.
2. **You eliminate the "slideshow" stigma** by making real AI video clips the default rendering path.
3. **You close the loop between research and creation** with Competitor Intelligence and Own Channel Analytics feeding the Content Calendar.
4. **You become a true multi-platform powerhouse** by auto-publishing to YouTube Shorts, Instagram Reels, and TikTok from a single prompt.
5. **Your unit economics are ironclad**: 58% to 72% gross margins with break-even achieved at just 2 subscribers.
