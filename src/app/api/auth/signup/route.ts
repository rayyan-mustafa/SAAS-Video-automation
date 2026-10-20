import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getDb } from '@/lib/db';
import { hashPassword, createSession, checkRateLimit, getUserIdFromEmail, getEmailSalt } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const rate = checkRateLimit(`signup_${ip}`, 10, 60000);
    if (!rate.allowed) {
      return NextResponse.json({ error: 'Too many signup attempts. Please wait a moment.' }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const { email, password, name = 'Creator' } = body;

    if (!email || !email.includes('@') || !email.includes('.')) {
      return NextResponse.json({ error: 'Please provide a valid email address.' }, { status: 400 });
    }

    if (!password || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters long.' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const db = getDb();

    // Check if user already exists
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
    if (existing) {
      return NextResponse.json({ error: 'An account with this email address already exists. Please sign in.' }, { status: 409 });
    }

    const userId = getUserIdFromEmail(cleanEmail);
    const salt = getEmailSalt(cleanEmail);
    const { hash } = hashPassword(password, salt);
    const verificationToken = crypto.randomBytes(24).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    const now = new Date().toISOString();

    // Insert user with instant active status (email_verified: 1)
    db.prepare(`
      INSERT OR REPLACE INTO users (
        id, email, password_hash, salt, name, email_verified,
        verification_token, verification_token_expires, role, status,
        onboarding_completed, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 1, ?, ?, 'CUSTOMER', 'ACTIVE', 1, ?, ?)
    `).run(userId, cleanEmail, hash, salt, name.trim(), verificationToken, verificationExpires, now, now);

    // Initialize 500 free credits
    db.prepare(`
      INSERT OR REPLACE INTO user_credits (user_id, balance, tier, subscription_status, monthly_allowance, renews_at, updated_at)
      VALUES (?, 500, 'CREATOR', 'ACTIVE', 500, ?, ?)
    `).run(userId, new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(), now);

    // Auto-provision a default starter channel for creator
    db.prepare(`
      INSERT OR IGNORE INTO channels (id, user_id, name, niche, language, voice, target_duration_minutes, visual_style, subtitle_style, intro_style, outro_cta, publishing_platform, content_rules, created_at, updated_at)
      VALUES (?, ?, ?, 'AI & Tech', 'en', 'en-US-ChristopherNeural', 3, 'Cinematic High-Contrast', 'Modern Clean White', 'High-Impact Hook', 'Subscribe for more breakdowns', 'YouTube', 'Professional studio pacing', ?, ?)
    `).run(`chan_${userId.substring(4)}`, userId, `${name.trim()} Studio`, now, now);

    // Create session
    const userAgent = req.headers.get('user-agent') || undefined;
    const { sessionToken, expiresAt } = createSession(userId, userAgent, ip);

    const user = {
      id: userId,
      email: cleanEmail,
      name: name.trim(),
      email_verified: 0,
      role: 'CUSTOMER',
      onboarding_completed: 0,
    };

    const res = NextResponse.json(
      {
        success: true,
        message: 'Account created successfully. Welcome to AUTORA!',
        user,
        verificationToken,
      },
      { status: 201 }
    );

    // Set secure session cookie
    res.cookies.set('auth_session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: new Date(expiresAt),
    });

    return res;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Signup failed' }, { status: 500 });
  }
}
