import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { hashPassword, destroyAllUserSessions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { token, newPassword } = body;

    if (!token || !newPassword) {
      return NextResponse.json({ error: 'Reset token and new password are required.' }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters long.' }, { status: 400 });
    }

    const db = getDb();
    const now = new Date().toISOString();

    const user = db
      .prepare('SELECT id FROM users WHERE reset_token = ? AND reset_token_expires > ?')
      .get(token, now) as { id: string } | undefined;

    if (!user) {
      return NextResponse.json({ error: 'Password reset link is invalid or has expired.' }, { status: 400 });
    }

    const { hash, salt } = hashPassword(newPassword);

    db.prepare(`
      UPDATE users SET 
        password_hash = ?, 
        salt = ?, 
        reset_token = NULL, 
        reset_token_expires = NULL, 
        updated_at = ? 
      WHERE id = ?
    `).run(hash, salt, now, user.id);

    // Invalidate all prior sessions
    destroyAllUserSessions(user.id);

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully. Please sign in with your new password.',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Password reset failed' }, { status: 500 });
  }
}
