import { NextResponse } from 'next/server';
import { requireAuth, hashPassword, verifyPassword, destroyAllUserSessions } from '@/lib/auth';
import { getDb, getUserCredits } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const user = await requireAuth(req);
    const credits = getUserCredits(user.id);

    return NextResponse.json({
      user,
      credits,
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function PUT(req: Request) {
  try {
    const user = await requireAuth(req);
    const body = await req.json().catch(() => ({}));
    const { name, currentPassword, newPassword, onboardingCompleted } = body;

    const db = getDb();
    const now = new Date().toISOString();

    // 1. If updating password
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json({ error: 'Current password is required to set a new password.' }, { status: 400 });
      }
      if (newPassword.length < 8) {
        return NextResponse.json({ error: 'New password must be at least 8 characters long.' }, { status: 400 });
      }

      const dbUser = db.prepare('SELECT password_hash, salt FROM users WHERE id = ?').get(user.id) as any;
      const isValid = verifyPassword(currentPassword, dbUser.password_hash, dbUser.salt);
      if (!isValid) {
        return NextResponse.json({ error: 'Current password does not match.' }, { status: 400 });
      }

      const { hash, salt } = hashPassword(newPassword);
      db.prepare('UPDATE users SET password_hash = ?, salt = ?, updated_at = ? WHERE id = ?').run(hash, salt, now, user.id);
    }

    // 2. If updating name
    if (name && name.trim()) {
      db.prepare('UPDATE users SET name = ?, updated_at = ? WHERE id = ?').run(name.trim(), now, user.id);
    }

    // 3. If updating onboarding status
    if (typeof onboardingCompleted === 'number') {
      db.prepare('UPDATE users SET onboarding_completed = ?, updated_at = ? WHERE id = ?').run(onboardingCompleted, now, user.id);
    }

    const updatedUser = db.prepare('SELECT id, email, name, avatar, email_verified, role, status, onboarding_completed FROM users WHERE id = ?').get(user.id);

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully.',
      user: updatedUser,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update profile' }, { status: err.message === 'UNAUTHORIZED' ? 401 : 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await requireAuth(req);
    const db = getDb();

    // Cascade delete user and associated sessions
    destroyAllUserSessions(user.id);
    db.prepare('DELETE FROM users WHERE id = ?').run(user.id);

    const res = NextResponse.json({ success: true, message: 'Account deleted.' });
    res.cookies.set('auth_session_token', '', { maxAge: 0, path: '/' });
    return res;
  } catch (err: any) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
