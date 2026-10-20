import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { hashPassword, destroyAllUserSessions, checkRateLimit } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const rate = checkRateLimit(`reset_${ip}`, 5, 60000);
    if (!rate.allowed) {
      return NextResponse.json({ error: 'Too many attempts. Please wait a moment.' }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const { token, newPassword } = body;

    if (!token || !newPassword || newPassword.length < 8) {
      return NextResponse.json({ error: 'Valid token and new password (min 8 chars) are required.' }, { status: 400 });
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

    // Update password & clear reset token
    db.prepare(`
      UPDATE users SET 
        password_hash = ?, 
        salt = ?, 
        reset_token = NULL, 
        reset_token_expires = NULL, 
        updated_at = ? 
      WHERE id = ?
    `).run(hash, salt, now, user.id);

    // Invalidate all active sessions for security
    destroyAllUserSessions(user.id);

    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully. Please log in with your new password.',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to reset password' }, { status: 500 });
  }
}
