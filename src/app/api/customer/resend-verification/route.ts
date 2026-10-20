import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getDb } from '@/lib/db';
import { checkRateLimit, sendEmail, buildVerificationEmail } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const rate = checkRateLimit(`resend_${ip}`, 3, 60000);
    if (!rate.allowed) {
      return NextResponse.json({ error: 'Too many requests. Please wait a minute.' }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const db = getDb();
    const cleanEmail = email.toLowerCase().trim();
    const user = db.prepare('SELECT id, name, email_verified FROM users WHERE email = ?').get(cleanEmail) as any;

    if (!user || user.email_verified === 1) {
      return NextResponse.json({ success: true, message: 'If the account exists and is unverified, verification email has been sent.' });
    }

    const verificationToken = crypto.randomBytes(24).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    const now = new Date().toISOString();

    db.prepare('UPDATE users SET verification_token = ?, verification_token_expires = ?, updated_at = ? WHERE id = ?')
      .run(verificationToken, verificationExpires, now, user.id);

    const emailData = buildVerificationEmail(user.name, verificationToken);
    await sendEmail({
      to: cleanEmail,
      subject: emailData.subject,
      text: emailData.text,
      html: emailData.html,
    });

    return NextResponse.json({ success: true, message: 'Verification email sent successfully.', verificationToken });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to resend verification' }, { status: 500 });
  }
}
