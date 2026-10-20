import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { token } = body;

    if (!token) {
      return NextResponse.json({ error: 'Verification token is required.' }, { status: 400 });
    }

    const db = getDb();
    const now = new Date().toISOString();

    const user = db
      .prepare('SELECT id FROM users WHERE verification_token = ? AND verification_token_expires > ?')
      .get(token, now) as { id: string } | undefined;

    if (!user) {
      return NextResponse.json({ error: 'Verification link is invalid or has expired.' }, { status: 400 });
    }

    db.prepare(`
      UPDATE users SET 
        email_verified = 1, 
        verification_token = NULL, 
        verification_token_expires = NULL, 
        updated_at = ? 
      WHERE id = ?
    `).run(now, user.id);

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully! You now have full studio access.',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Email verification failed' }, { status: 500 });
  }
}
