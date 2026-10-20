import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb, grantUserCredits } from '@/lib/db';
import { verifyAdminToken } from '@/lib/security/adminAuth';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

function checkAdminAuth(): boolean {
  const cookieStore = cookies();
  const token = cookieStore.get('admin_session_token')?.value;
  return !!token && verifyAdminToken(token);
}

function ensureSchema(db: any) {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        name TEXT NOT NULL,
        avatar TEXT,
        email_verified INTEGER NOT NULL DEFAULT 0,
        verification_token TEXT,
        verification_token_expires TEXT,
        reset_token TEXT,
        reset_token_expires TEXT,
        role TEXT NOT NULL DEFAULT 'CUSTOMER',
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        onboarding_completed INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

      CREATE TABLE IF NOT EXISTS user_credits (
        user_id TEXT PRIMARY KEY,
        balance INTEGER NOT NULL DEFAULT 500,
        tier TEXT NOT NULL DEFAULT 'CREATOR',
        subscription_status TEXT NOT NULL DEFAULT 'ACTIVE',
        monthly_allowance INTEGER NOT NULL DEFAULT 500,
        renews_at TEXT,
        stripe_customer_id TEXT,
        stripe_subscription_id TEXT,
        created_at TEXT,
        updated_at TEXT NOT NULL
      );
    `);
  } catch {}
  try { db.prepare('ALTER TABLE user_credits ADD COLUMN stripe_customer_id TEXT').run(); } catch {}
  try { db.prepare('ALTER TABLE user_credits ADD COLUMN stripe_subscription_id TEXT').run(); } catch {}
  try { db.prepare('ALTER TABLE user_credits ADD COLUMN created_at TEXT').run(); } catch {}
  try { db.prepare('ALTER TABLE user_credits ADD COLUMN renews_at TEXT').run(); } catch {}
}

// GET: List all users or get detailed user inspection
export async function GET(req: Request) {
  try {
    if (!checkAdminAuth()) {
      return NextResponse.json({ error: 'Unauthorized: Admin authentication required.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const search = searchParams.get('search')?.trim().toLowerCase() || '';
    const tier = searchParams.get('tier')?.trim().toUpperCase() || 'ALL';
    const status = searchParams.get('status')?.trim().toUpperCase() || 'ALL';

    const db = getDb();
    ensureSchema(db);

    // 1. Single User Detail View
    if (userId) {
      const user = db.prepare(`
        SELECT 
          u.id,
          u.email,
          u.name,
          u.avatar,
          u.email_verified,
          u.role,
          u.status,
          u.onboarding_completed,
          u.created_at,
          u.updated_at,
          COALESCE(uc.balance, 500) as credits_balance,
          COALESCE(uc.tier, 'CREATOR') as plan,
          COALESCE(uc.subscription_status, 'ACTIVE') as subscription_status,
          COALESCE(uc.monthly_allowance, 500) as monthly_allowance,
          uc.renews_at,
          uc.stripe_customer_id,
          uc.stripe_subscription_id
        FROM users u
        LEFT JOIN user_credits uc ON u.id = uc.user_id
        WHERE u.id = ?
      `).get(userId) as any;

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // Channels owned by user
      const channels = db.prepare(`
        SELECT id, name, niche, language, voice, target_duration_minutes, visual_style, publishing_platform, auto_publish, default_visibility, created_at
        FROM channels
        WHERE user_id = ?
        ORDER BY created_at DESC
      `).all(userId);

      // Projects created by user
      const projects = db.prepare(`
        SELECT p.id, p.topic, p.status, p.current_stage, p.target_length_minutes, p.preset, p.publishing_status, p.publish_url, p.created_at, p.error_message,
               c.name as channel_name
        FROM content_projects p
        LEFT JOIN channels c ON p.channel_id = c.id
        WHERE p.user_id = ?
        ORDER BY p.created_at DESC
        LIMIT 50
      `).all(userId);

      // Credit transactions for user
      const transactions = db.prepare(`
        SELECT id, amount, balance_after, type, description, project_id, created_at
        FROM credit_transactions
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 50
      `).all(userId);

      // Social / OAuth connections for user
      const connections = db.prepare(`
        SELECT id, platform, account_email, channel_id, channel_title, token_expiry, created_at
        FROM oauth_connections
        WHERE user_id = ?
      `).all(userId);

      return NextResponse.json({
        success: true,
        user: {
          ...user,
          channels,
          projects,
          transactions,
          connections,
        },
      });
    }

    // 2. Full Users List with search & filters
    let query = `
      SELECT 
        u.id,
        u.email,
        u.name,
        u.avatar,
        u.email_verified,
        u.role,
        u.status,
        u.onboarding_completed,
        u.created_at,
        u.updated_at,
        COALESCE(uc.balance, 500) as credits_balance,
        COALESCE(uc.tier, 'CREATOR') as plan,
        COALESCE(uc.subscription_status, 'ACTIVE') as subscription_status,
        COALESCE(uc.monthly_allowance, 500) as monthly_allowance,
        uc.renews_at,
        uc.stripe_customer_id,
        uc.stripe_subscription_id,
        (SELECT COUNT(*) FROM channels c WHERE c.user_id = u.id) as channels_count,
        (SELECT COUNT(*) FROM content_projects p WHERE p.user_id = u.id) as projects_count,
        (SELECT COUNT(*) FROM content_projects p WHERE p.user_id = u.id AND p.status = 'COMPLETED') as completed_videos_count
      FROM users u
      LEFT JOIN user_credits uc ON u.id = uc.user_id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (search) {
      query += ` AND (LOWER(u.email) LIKE ? OR LOWER(u.name) LIKE ? OR LOWER(u.id) LIKE ?)`;
      const searchWild = `%${search}%`;
      params.push(searchWild, searchWild, searchWild);
    }

    if (tier !== 'ALL') {
      query += ` AND UPPER(COALESCE(uc.tier, 'CREATOR')) = ?`;
      params.push(tier);
    }

    if (status !== 'ALL') {
      query += ` AND UPPER(u.status) = ?`;
      params.push(status);
    }

    query += ` ORDER BY u.created_at DESC`;

    const users = db.prepare(query).all(...params);

    // Summary statistics for users
    const totalUsers = users.length;
    const totalCredits = users.reduce((sum: number, u: any) => sum + (u.credits_balance || 0), 0);
    const totalProjects = users.reduce((sum: number, u: any) => sum + (u.projects_count || 0), 0);
    const activeSubscribers = users.filter((u: any) => u.subscription_status === 'ACTIVE').length;

    return NextResponse.json({
      success: true,
      users,
      summary: {
        totalUsers,
        totalCredits,
        totalProjects,
        activeSubscribers,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch users list' }, { status: 500 });
  }
}

// POST: Manage User (Adjust Credits, Change Plan, Change Status, Delete)
export async function POST(req: Request) {
  try {
    if (!checkAdminAuth()) {
      return NextResponse.json({ error: 'Unauthorized: Admin authentication required.' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { action, userId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const db = getDb();
    ensureSchema(db);
    const now = new Date().toISOString();

    // Verify user exists
    const userExists = db.prepare('SELECT id, email, name FROM users WHERE id = ?').get(userId) as any;
    if (!userExists) {
      return NextResponse.json({ error: 'User does not exist' }, { status: 404 });
    }

    // ACTION 1: Adjust Credits
    if (action === 'adjust_credits') {
      const amount = Number(body.amount);
      if (isNaN(amount) || amount === 0) {
        return NextResponse.json({ error: 'Valid non-zero amount is required' }, { status: 400 });
      }

      const reason = body.reason?.trim() || `Admin manual adjustment (${amount > 0 ? '+' : ''}${amount})`;

      // Ensure user_credits row exists
      db.prepare(`
        INSERT INTO user_credits (user_id, balance, tier, subscription_status, monthly_allowance, created_at, updated_at)
        VALUES (?, 500, 'CREATOR', 'ACTIVE', 500, ?, ?)
        ON CONFLICT(user_id) DO NOTHING
      `).run(userId, now, now);

      if (amount > 0) {
        grantUserCredits(userId, amount, 'ADMIN_GRANT', reason);
      } else {
        // Safe subtraction without going below 0
        db.prepare(`
          UPDATE user_credits
          SET balance = MAX(0, balance + ?), updated_at = ?
          WHERE user_id = ?
        `).run(amount, now, userId);

        const updated = db.prepare('SELECT balance FROM user_credits WHERE user_id = ?').get(userId) as any;
        db.prepare(`
          INSERT INTO credit_transactions (id, user_id, amount, balance_after, type, description, project_id, created_at)
          VALUES (?, ?, ?, ?, 'ADMIN_DEDUCTION', ?, NULL, ?)
        `).run(uuidv4(), userId, amount, updated?.balance || 0, reason, now);
      }

      const updatedCredits = db.prepare('SELECT balance, tier, subscription_status FROM user_credits WHERE user_id = ?').get(userId) as any;
      return NextResponse.json({
        success: true,
        message: `Successfully adjusted credits for ${userExists.name} (${userExists.email}). New balance: ${updatedCredits.balance}`,
        credits: updatedCredits,
      });
    }

    // ACTION 2: Update Plan / Subscription Tier
    if (action === 'update_plan') {
      const tier = (body.tier || 'CREATOR').toUpperCase();
      const subStatus = (body.subscription_status || 'ACTIVE').toUpperCase();
      const monthlyAllowance = Number(body.monthly_allowance) || (
        tier === 'STARTER' ? 200 :
        tier === 'SCALE' ? 1200 :
        tier === 'AGENCY' ? 3500 : 500
      );

      db.prepare(`
        INSERT INTO user_credits (user_id, balance, tier, subscription_status, monthly_allowance, created_at, updated_at)
        VALUES (?, 500, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
          tier = excluded.tier,
          subscription_status = excluded.subscription_status,
          monthly_allowance = excluded.monthly_allowance,
          updated_at = excluded.updated_at
      `).run(userId, tier, subStatus, monthlyAllowance, now, now);

      return NextResponse.json({
        success: true,
        message: `Updated plan for ${userExists.email} to ${tier} (${subStatus}) with ${monthlyAllowance} monthly credits.`,
      });
    }

    // ACTION 3: Update Account Status (ACTIVE / SUSPENDED)
    if (action === 'update_status') {
      const status = (body.status || 'ACTIVE').toUpperCase();
      db.prepare('UPDATE users SET status = ?, updated_at = ? WHERE id = ?').run(status, now, userId);

      return NextResponse.json({
        success: true,
        message: `Updated status for ${userExists.email} to ${status}.`,
      });
    }

    // ACTION 4: Delete User Account
    if (action === 'delete_user') {
      if (userId === 'user_default') {
        return NextResponse.json({ error: 'Cannot delete system default user' }, { status: 400 });
      }

      db.prepare('DELETE FROM user_sessions WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM credit_transactions WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM user_credits WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM oauth_connections WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM channels WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM content_projects WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM users WHERE id = ?').run(userId);

      return NextResponse.json({
        success: true,
        message: `Successfully deleted user ${userExists.email} and all associated channels and projects.`,
      });
    }

    return NextResponse.json({ error: 'Invalid or unsupported action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Action failed' }, { status: 500 });
  }
}
