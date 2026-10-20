import { NextRequest, NextResponse } from 'next/server';
import { getDb, getApiKey } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { handleOrQuery } = body;
    if (!handleOrQuery) {
      return NextResponse.json({ error: 'Missing competitor handle or search query' }, { status: 400 });
    }

    const apiKey = getApiKey('youtube_data_api_key') || getApiKey('google_api_key') || getApiKey('gemini_api_key') || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'YouTube API Key not configured in system settings' }, { status: 500 });
    }

    const cleanHandle = handleOrQuery.replace(/^@/, '').trim();
    let channelId = '';
    let title = '';
    let thumb = '';
    let subs = 0;

    // 1. Resolve Channel via handle or search
    const handleRes = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&forHandle=${encodeURIComponent(cleanHandle)}&key=${apiKey}`
    );
    const handleData = await handleRes.json();

    if (handleData.items && handleData.items.length > 0) {
      const item = handleData.items[0];
      channelId = item.id;
      title = item.snippet.title;
      thumb = item.snippet.thumbnails?.default?.url || '';
      subs = parseInt(item.statistics?.subscriberCount || '0', 10);
    } else {
      // Fallback search by query
      const searchRes = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(cleanHandle)}&maxResults=1&key=${apiKey}`
      );
      const searchData = await searchRes.json();
      if (!searchData.items || searchData.items.length === 0) {
        return NextResponse.json({ error: `Competitor channel "${handleOrQuery}" not found` }, { status: 404 });
      }
      channelId = searchData.items[0].snippet.channelId;
      title = searchData.items[0].snippet.title;
      thumb = searchData.items[0].snippet.thumbnails?.default?.url || '';
    }

    // 2. Fetch Recent Uploads Playlist
    const chanRes = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=contentDetails,statistics&id=${channelId}&key=${apiKey}`
    );
    const chanData = await chanRes.json();
    const uploadsPlaylistId = chanData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (chanData.items?.[0]?.statistics?.subscriberCount) {
      subs = parseInt(chanData.items[0].statistics.subscriberCount, 10);
    }

    if (!uploadsPlaylistId) {
      return NextResponse.json({ error: 'Unable to access channel uploads playlist' }, { status: 404 });
    }

    // 3. Fetch Last 15 Videos from uploads
    const playlistRes = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${uploadsPlaylistId}&maxResults=15&key=${apiKey}`
    );
    const playlistData = await playlistRes.json();
    const videoItems = playlistData.items || [];
    const videoIds = videoItems.map((i: any) => i.contentDetails.videoId).filter(Boolean).join(',');

    if (!videoIds) {
      return NextResponse.json({
        success: true,
        channel: { id: channelId, title, handle: cleanHandle, avgViews: 0, subscribers: subs, thumbnailUrl: thumb },
        viralVideos: [],
      });
    }

    // 4. Fetch Video Statistics (Views, Likes, Published Date)
    const statsRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoIds}&key=${apiKey}`
    );
    const statsData = await statsRes.json();
    const videos = statsData.items || [];

    // 5. Calculate Outliers (Average Views & Viral Multiplier)
    const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000).toISOString();
    const recentVideos = videos.filter((v: any) => v.snippet.publishedAt >= fourteenDaysAgo);
    const targetVideos = recentVideos.length >= 3 ? recentVideos : videos.slice(0, 7);

    const totalViews = targetVideos.reduce((acc: number, v: any) => acc + parseInt(v.statistics.viewCount || '0', 10), 0);
    const avgViews = Math.max(1, Math.round(totalViews / (targetVideos.length || 1)));

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
        thumbnailUrl: v.snippet.thumbnails?.medium?.url || v.snippet.thumbnails?.default?.url || '',
      };
    }).sort((a: any, b: any) => b.viralScore - a.viralScore);

    // 6. Save in SQLite
    const db = getDb();
    const compId = uuidv4();
    const now = new Date().toISOString();

    const existing = db.prepare('SELECT id FROM competitor_channels WHERE user_id = ? AND channel_handle = ?').get(user.id, cleanHandle) as any;
    const finalCompId = existing ? existing.id : compId;

    if (existing) {
      db.prepare(`
        UPDATE competitor_channels 
        SET channel_title = ?, thumbnail_url = ?, subscriber_count = ?, avg_views_7d = ?, last_refreshed = ?
        WHERE id = ?
      `).run(title, thumb, subs, avgViews, now, finalCompId);
    } else {
      db.prepare(`
        INSERT INTO competitor_channels (id, user_id, channel_handle, channel_id, channel_title, thumbnail_url, subscriber_count, avg_views_7d, last_refreshed, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(finalCompId, user.id, cleanHandle, channelId, title, thumb, subs, avgViews, now, now);
    }

    // Refresh viral video cache for this competitor
    db.prepare('DELETE FROM competitor_viral_cache WHERE competitor_id = ?').run(finalCompId);
    const insertCache = db.prepare(`
      INSERT INTO competitor_viral_cache (id, competitor_id, video_id, title, view_count, like_count, published_at, viral_score, thumbnail_url, cached_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const v of viralVideos) {
      insertCache.run(uuidv4(), finalCompId, v.videoId, v.title, v.views, v.likes, v.publishedAt, v.viralScore, v.thumbnailUrl, now);
    }

    return NextResponse.json({
      success: true,
      channel: {
        id: finalCompId,
        channelId,
        title,
        handle: cleanHandle,
        avgViews,
        subscribers: subs,
        thumbnailUrl: thumb,
      },
      viralVideos,
    });
  } catch (err: any) {
    console.error('[Competitor Discover Error]:', err);
    return NextResponse.json({ error: err.message || 'Failed to discover competitor channel' }, { status: 500 });
  }
}
