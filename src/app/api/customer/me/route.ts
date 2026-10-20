import { NextResponse } from 'next/server';
import { getCurrentUser, destroyAllUserSessions, clearSessionCookie } from '@/lib/auth';
import { getDb, getUserCredits } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const credits = getUserCredits(user.id);
    return NextResponse.json({
      authenticated: true,
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      avatar_url: user.avatar,
      email_verified: user.email_verified === 1,
      role: user.role,
      status: user.status,
      onboarding_completed: user.onboarding_completed,
      credits,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch user' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { name, avatar_url, avatar } = body;
    const db = getDb();
    const now = new Date().toISOString();

    const newName = name !== undefined ? name.trim() : user.name;
    const newAvatar = avatar_url !== undefined ? avatar_url : avatar !== undefined ? avatar : user.avatar;

    db.prepare('UPDATE users SET name = ?, avatar = ?, updated_at = ? WHERE id = ?').run(newName, newAvatar, now, user.id);

    const updated = db.prepare('SELECT id, email, name, avatar, email_verified, role, status, onboarding_completed FROM users WHERE id = ?').get(user.id) as any;

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully.',
      user: {
        ...updated,
        avatar_url: updated.avatar,
        email_verified: updated.email_verified === 1,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update profile' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const db = getDb();
    destroyAllUserSessions(user.id);
    db.prepare('DELETE FROM users WHERE id = ?').run(user.id);

    const res = NextResponse.json({ success: true, message: 'Account deleted successfully.' });
    clearSessionCookie(res);
    return res;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete account' }, { status: 500 });
  }
}
