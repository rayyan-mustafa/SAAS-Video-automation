import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getDb, Channel } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

import { DEFAULT_USER_ID } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);
    const userId = user?.id || DEFAULT_USER_ID;

    const db = getDb();
    let channels = db
      .prepare(
        `SELECT c.*, COUNT(p.id) as video_count 
         FROM channels c 
         LEFT JOIN content_projects p ON c.id = p.channel_id 
         WHERE c.user_id = ? 
         GROUP BY c.id 
         ORDER BY c.created_at DESC`
      )
      .all(userId) as Channel[];

    if (channels.length === 0) {
      const now = new Date().toISOString();
      const defaultChanId = `chan_${userId.substring(4)}`;
      db.prepare(`
        INSERT OR IGNORE INTO channels (
          id, user_id, name, niche, language, voice, voice_speed,
          target_duration_minutes, visual_style, subtitle_style, intro_style, outro_cta,
          publishing_platform, content_rules, publishing_days, publishing_time, timezone,
          default_visibility, auto_publish, created_at, updated_at
        ) VALUES (?, ?, 'Creator Studio', 'AI & Tech', 'en', 'en-US-ChristopherNeural', '1.0x', 5, 'Cinematic High-Contrast', 'Modern Clean White', 'High-Impact Dramatic Question', 'Subscribe to the channel and leave your thoughts below', 'YouTube', 'Engaging, clear, professional tone', '["Monday","Wednesday","Friday"]', '14:00', 'UTC', 'PRIVATE', 0, ?, ?)
      `).run(defaultChanId, userId, now, now);

      channels = db
        .prepare(
          `SELECT c.*, COUNT(p.id) as video_count 
           FROM channels c 
           LEFT JOIN content_projects p ON c.id = p.channel_id 
           WHERE c.user_id = ? 
           GROUP BY c.id 
           ORDER BY c.created_at DESC`
        )
        .all(userId) as Channel[];
    }

    return NextResponse.json({ channels });
  } catch (err: any) {
    console.error('Channels GET error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch channels' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser(request);
    const userId = user?.id || DEFAULT_USER_ID;

    const db = getDb();
    const nowIso = new Date().toISOString();
    
    // Ensure user record exists in container DB
    db.prepare(`
      INSERT OR IGNORE INTO users (id, email, password_hash, salt, name, email_verified, role, status, onboarding_completed, created_at, updated_at)
      VALUES (?, ?, '', '', ?, 1, 'CUSTOMER', 'ACTIVE', 1, ?, ?)
    `).run(userId, user?.email || 'creator@autovideo.local', user?.name || 'Creator', nowIso, nowIso);

    const body = await request.json();
    const {
      name,
      niche,
      language = 'en',
      voice = 'en-US-ChristopherNeural',
      voice_speed = '1.0x',
      target_duration_minutes = 5,
      visual_style = 'Cinematic High-Contrast',
      subtitle_style = 'Modern Clean White',
      intro_style = 'High-Impact Dramatic Question',
      outro_cta = 'Subscribe to the channel and leave your thoughts below',
      publishing_platform = 'YouTube',
      content_rules = 'Engaging, clear, professional tone',
      publishing_days = '["Monday","Wednesday","Friday"]',
      publishing_time = '14:00',
      timezone = 'UTC',
      default_visibility = 'PRIVATE',
      auto_publish = 0,
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Channel name is required' }, { status: 400 });
    }
    if (!niche || !niche.trim()) {
      return NextResponse.json({ error: 'Niche is required' }, { status: 400 });
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    const daysStr = typeof publishing_days === 'string' ? publishing_days : JSON.stringify(publishing_days);

    db.prepare(
      `INSERT INTO channels (
        id, user_id, name, niche, language, voice, voice_speed,
        target_duration_minutes, visual_style, subtitle_style, intro_style, outro_cta,
        publishing_platform, content_rules, publishing_days, publishing_time, timezone,
        default_visibility, auto_publish, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      userId,
      name.trim(),
      niche.trim(),
      language.trim(),
      voice.trim(),
      voice_speed,
      Number(target_duration_minutes) || 5,
      visual_style,
      subtitle_style,
      intro_style,
      outro_cta,
      publishing_platform,
      content_rules,
      daysStr,
      publishing_time,
      timezone,
      default_visibility,
      auto_publish ? 1 : 0,
      now,
      now
    );

    const created = db.prepare('SELECT * FROM channels WHERE id = ? AND user_id = ?').get(id, userId) as Channel;
    return NextResponse.json({ channel: created }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create channel' }, { status: 500 });
  }
}
