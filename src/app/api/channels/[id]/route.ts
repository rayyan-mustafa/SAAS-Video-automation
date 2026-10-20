import { NextResponse } from 'next/server';
import { getDb, Channel } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: any }) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const id = resolvedParams?.id;
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const db = getDb();
    const channel = db
      .prepare('SELECT * FROM channels WHERE id = ? AND user_id = ?')
      .get(id, user.id) as Channel | undefined;

    if (!channel) {
      return NextResponse.json({ error: 'Channel not found or access denied.' }, { status: 404 });
    }

    return NextResponse.json({ channel });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch channel' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: any }) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const id = resolvedParams?.id;
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const body = await request.json();
    const db = getDb();

    const existing = db
      .prepare('SELECT * FROM channels WHERE id = ? AND user_id = ?')
      .get(id, user.id) as Channel | undefined;

    if (!existing) {
      return NextResponse.json({ error: 'Channel not found or access denied.' }, { status: 404 });
    }

    const {
      name = existing.name,
      niche = existing.niche,
      language = existing.language,
      voice = existing.voice,
      voice_speed = existing.voice_speed,
      target_duration_minutes = existing.target_duration_minutes,
      visual_style = existing.visual_style,
      subtitle_style = existing.subtitle_style,
      intro_style = existing.intro_style,
      outro_cta = existing.outro_cta,
      publishing_platform = existing.publishing_platform,
      content_rules = existing.content_rules,
      publishing_days = existing.publishing_days,
      publishing_time = existing.publishing_time,
      timezone = existing.timezone,
      default_visibility = existing.default_visibility,
      auto_publish = existing.auto_publish,
    } = body;

    const now = new Date().toISOString();
    const daysStr = typeof publishing_days === 'string' ? publishing_days : JSON.stringify(publishing_days);

    db.prepare(
      `UPDATE channels SET 
        name = ?, niche = ?, language = ?, voice = ?, voice_speed = ?,
        target_duration_minutes = ?, visual_style = ?, subtitle_style = ?,
        intro_style = ?, outro_cta = ?, publishing_platform = ?,
        content_rules = ?, publishing_days = ?, publishing_time = ?,
        timezone = ?, default_visibility = ?, auto_publish = ?, updated_at = ?
       WHERE id = ? AND user_id = ?`
    ).run(
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
      id,
      user.id
    );

    const updated = db.prepare('SELECT * FROM channels WHERE id = ? AND user_id = ?').get(id, user.id) as Channel;
    return NextResponse.json({ channel: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update channel' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const db = getDb();
    const existing = db
      .prepare('SELECT * FROM channels WHERE id = ? AND user_id = ?')
      .get(id, user.id) as Channel | undefined;

    if (!existing) {
      return NextResponse.json({ error: 'Channel not found or access denied.' }, { status: 404 });
    }

    db.prepare('DELETE FROM channels WHERE id = ? AND user_id = ?').run(id, user.id);
    return NextResponse.json({ message: 'Channel deleted successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete channel' }, { status: 500 });
  }
}
