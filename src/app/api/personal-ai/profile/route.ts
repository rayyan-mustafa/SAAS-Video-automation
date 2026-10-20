import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getPersonalCreatorProfile, upsertPersonalCreatorProfile, getPersonalCreatorAsset } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const profile = getPersonalCreatorProfile(user.id);
    let avatarAsset = null;
    let voiceAsset = null;

    if (profile?.avatar_asset_id) {
      avatarAsset = getPersonalCreatorAsset(profile.avatar_asset_id, user.id);
    }
    if (profile?.voice_asset_id) {
      voiceAsset = getPersonalCreatorAsset(profile.voice_asset_id, user.id);
    }

    return NextResponse.json({
      profile: profile || {
        user_id: user.id,
        avatar_asset_id: null,
        voice_asset_id: null,
        default_style: 'PODCAST',
        default_language: 'en',
        consent_agreed_at: null,
      },
      avatarAsset,
      voiceAsset,
    });
  } catch (err: any) {
    console.error('[API /api/personal-ai/profile GET] Error:', err);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const profile = upsertPersonalCreatorProfile(user.id, {
      avatar_asset_id: body.avatar_asset_id,
      voice_asset_id: body.voice_asset_id,
      default_style: body.default_style || 'PODCAST',
      default_language: body.default_language || 'en',
      consent_agreed_at: body.consent_agreed ? new Date().toISOString() : undefined,
    });

    return NextResponse.json({ profile });
  } catch (err: any) {
    console.error('[API /api/personal-ai/profile POST] Error:', err);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
