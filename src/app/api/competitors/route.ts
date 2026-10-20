import { NextRequest, NextResponse } from 'next/server';
import { getDb, listCompetitorChannels, getCompetitorViralVideos, deleteCompetitorChannel } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const channels = listCompetitorChannels(user.id);
    const enriched = channels.map((ch) => {
      const viralVideos = getCompetitorViralVideos(ch.id);
      return {
        ...ch,
        viralVideos,
      };
    });

    return NextResponse.json({ success: true, competitors: enriched });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to list competitors' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Competitor ID is required' }, { status: 400 });
    }

    const deleted = deleteCompetitorChannel(id, user.id);
    return NextResponse.json({ success: deleted });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to remove competitor' }, { status: 500 });
  }
}
