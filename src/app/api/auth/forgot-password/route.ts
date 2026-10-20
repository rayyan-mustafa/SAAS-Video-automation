import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getDb } from '@/lib/db';
import { checkRateLimit } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const rate = checkRateLimit(`forgot_${ip}`, 5, 60000);
    if (!rate.allowed) {
      return NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email address is required.' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const db = getDb();
    const user = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail) as { id: string } | undefined;

    // To prevent email enumeration, return success even if user not found
    if (!user) {
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, password reset instructions have been generated.',
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600 * 1000).toISOString(); // 1 hour

    db.prepare('UPDATE users SET reset_token = ?, reset_token_expires = ?, updated_at = ? WHERE id = ?').run(
      resetToken,
      expires,
      new Date().toISOString(),
      user.id
    );

    return NextResponse.json({
      success: true,
      message: 'Password reset token generated successfully.',
      resetToken, // Returned for dev / staging workflows
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to process password reset request' }, { status: 500 });
  }
}
