import { NextResponse } from 'next/server';
import { getCurrentUser, verifyPassword, hashPassword, destroyAllUserSessions } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Current password and new password are required.' }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'New password must be at least 8 characters long.' }, { status: 400 });
    }

    const db = getDb();
    const dbUser = db.prepare('SELECT password_hash, salt FROM users WHERE id = ?').get(user.id) as any;

    const isValid = verifyPassword(currentPassword, dbUser.password_hash, dbUser.salt);
    if (!isValid) {
      return NextResponse.json({ error: 'Current password does not match.' }, { status: 400 });
    }

    const { hash, salt } = hashPassword(newPassword);
    const now = new Date().toISOString();

    db.prepare('UPDATE users SET password_hash = ?, salt = ?, updated_at = ? WHERE id = ?').run(hash, salt, now, user.id);

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully.',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to change password' }, { status: 500 });
  }
}
