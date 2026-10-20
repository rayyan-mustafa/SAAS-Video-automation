import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb, getUserVoices, deleteUserVoice, UserVoice } from '@/lib/db';
import { storage } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Authentication required. Please log in.' }, { status: 401 });
    }

    const voices = getUserVoices(user.id);

    // Sanitize response: return only client-safe fields (never expose user_id or internal DB schemas)
    const sanitized = voices.map((v: UserVoice) => ({
      id: v.id,
      name: v.name,
      voice_id: v.voice_id,
      sample_url: v.sample_url,
      created_at: v.created_at,
    }));

    return NextResponse.json({ success: true, voices: sanitized });
  } catch (err: any) {
    console.error('[my-voices GET error]:', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch user voices' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Authentication required. Please log in.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id');

    if (!id) {
      const body = await request.json().catch(() => ({}));
      id = body?.id;
    }

    if (!id || typeof id !== 'string' || !id.trim()) {
      return NextResponse.json({ success: false, error: 'Voice ID is required' }, { status: 400 });
    }

    const cleanId = id.trim();
    if (cleanId.includes('/') || cleanId.includes('\\') || cleanId.includes('..') || cleanId.length > 64) {
      return NextResponse.json({ success: false, error: 'Invalid Voice ID format' }, { status: 400 });
    }

    // IDOR Protection: verify the record exists AND belongs to the requesting user
    const db = getDb();
    const existing = db
      .prepare('SELECT * FROM user_voices WHERE id = ? AND user_id = ?')
      .get(cleanId, user.id) as UserVoice | undefined;

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Voice not found or you do not have permission to delete it.' },
        { status: 404 }
      );
    }

    const deleted = deleteUserVoice(user.id, cleanId);
    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Failed to delete voice record.' }, { status: 500 });
    }

    // Clean up local sample audio file to avoid orphaned storage artifacts
    if (existing.voice_id) {
      try {
        const sampleKey = `voices/${user.id}/${existing.voice_id}.wav`;
        await storage.deleteObject(sampleKey);
      } catch (cleanErr) {
        console.warn('[my-voices DELETE cleanup warning]:', cleanErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Voice "${existing.name}" deleted successfully.`,
      deletedId: cleanId,
    });
  } catch (err: any) {
    console.error('[my-voices DELETE error]:', err);
    return NextResponse.json({ success: false, error: 'Failed to delete voice' }, { status: 500 });
  }
}
