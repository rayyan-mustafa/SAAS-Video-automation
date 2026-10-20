import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '@/lib/db';
import fs from 'fs';
import path from 'path';
import { verifyAdminToken } from '@/lib/security/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('admin_session_token')?.value;
    if (!token || !verifyAdminToken(token)) {
      return NextResponse.json({ error: 'Unauthorized: Admin authentication required.' }, { status: 401 });
    }
    const db = getDb();

    // 1. Channel stats
    const totalChannels = (db.prepare('SELECT COUNT(*) as count FROM channels').get() as any)?.count || 0;
    const channelsList = db.prepare('SELECT id, name, niche, language, target_duration_minutes, publishing_platform, auto_publish, default_visibility, created_at FROM channels ORDER BY created_at DESC').all();

    // 2. Video Project stats
    const totalProjects = (db.prepare('SELECT COUNT(*) as count FROM content_projects').get() as any)?.count || 0;
    const statusCounts = db.prepare(`
      SELECT status, COUNT(*) as count 
      FROM content_projects 
      GROUP BY status
    `).all() as Array<{ status: string; count: number }>;

    const pubStatusCounts = db.prepare(`
      SELECT publishing_status, COUNT(*) as count 
      FROM content_projects 
      GROUP BY publishing_status
    `).all() as Array<{ publishing_status: string; count: number }>;

    const projectsList = db.prepare(`
      SELECT p.id, COALESCE(c.name, 'Default Channel') as channel_name, p.topic, p.status, p.current_stage, p.publishing_status, p.publish_url, p.created_at, p.target_length_minutes
      FROM content_projects p
      LEFT JOIN channels c ON p.channel_id = c.id
      ORDER BY p.created_at DESC
      LIMIT 20
    `).all();

    // 3. User & Subscription stats
    let totalUsers = 0;
    let activeSubscriptions = 0;
    let totalCredits = 0;
    let tierBreakdown: Record<string, number> = {
      STARTER: 0,
      CREATOR: 0,
      SCALE: 0,
      AGENCY: 0,
    };
    let recentUsers: any[] = [];

    try {
      totalUsers = (db.prepare('SELECT COUNT(*) as count FROM users').get() as any)?.count || 0;
      activeSubscriptions = (db.prepare("SELECT COUNT(*) as count FROM user_credits WHERE subscription_status = 'ACTIVE'").get() as any)?.count || 0;
      totalCredits = (db.prepare("SELECT SUM(balance) as total FROM user_credits").get() as any)?.total || 0;
      
      const tiers = db.prepare(`
        SELECT COALESCE(tier, 'CREATOR') as tier, COUNT(*) as count 
        FROM user_credits 
        GROUP BY tier
      `).all() as Array<{ tier: string; count: number }>;

      for (const t of tiers) {
        tierBreakdown[t.tier.toUpperCase()] = t.count;
      }

      recentUsers = db.prepare(`
        SELECT u.id, u.email, u.name, u.role, u.status, u.created_at,
               COALESCE(uc.tier, 'CREATOR') as tier,
               COALESCE(uc.balance, 500) as credits_balance,
               COALESCE(uc.subscription_status, 'ACTIVE') as subscription_status
        FROM users u
        LEFT JOIN user_credits uc ON u.id = uc.user_id
        ORDER BY u.created_at DESC
        LIMIT 5
      `).all();
    } catch (uErr) {
      console.warn('[Admin Stats] Error fetching users metrics:', uErr);
    }

    // 4. Video Jobs & Assets counts for legacy display
    let totalVideoJobs = 0;
    let totalAssets = 0;
    try {
      totalVideoJobs = (db.prepare('SELECT COUNT(*) as count FROM video_jobs').get() as any)?.count || 0;
      totalAssets = (db.prepare('SELECT COUNT(*) as count FROM generated_assets').get() as any)?.count || 0;
    } catch {}

    // 5. YouTube Connections
    const totalConnections = (db.prepare('SELECT COUNT(*) as count FROM oauth_connections').get() as any)?.count || 0;
    const connectionsList = db.prepare('SELECT id, platform, account_email, channel_id, channel_title, token_expiry, created_at FROM oauth_connections').all();

    // 6. Storage Calculation
    let totalStorageBytes = 0;
    const storageDir = path.join(process.cwd(), 'storage');
    if (fs.existsSync(storageDir)) {
      const getDirSize = (dirPath: string): number => {
        let size = 0;
        try {
          const files = fs.readdirSync(dirPath);
          for (const file of files) {
            const filePath = path.join(dirPath, file);
            const stat = fs.statSync(filePath);
            if (stat.isDirectory()) {
              size += getDirSize(filePath);
            } else {
              size += stat.size;
            }
          }
        } catch {
          // Ignore inaccessible files
        }
        return size;
      };
      totalStorageBytes = getDirSize(storageDir);
    }

    const storageMb = Math.round((totalStorageBytes / (1024 * 1024)) * 10) / 10;

    // Map status metrics
    const statusMap: Record<string, number> = {
      PENDING: 0,
      PROCESSING: 0,
      COMPLETED: 0,
      FAILED: 0,
    };
    for (const item of statusCounts) {
      statusMap[item.status] = item.count;
    }

    const pubStatusMap: Record<string, number> = {
      DRAFT: 0,
      READY: 0,
      SCHEDULED: 0,
      UPLOADING: 0,
      PUBLISHED: 0,
      FAILED: 0,
    };
    for (const item of pubStatusCounts) {
      if (item.publishing_status) {
        pubStatusMap[item.publishing_status] = item.count;
      }
    }

    return NextResponse.json({
      success: true,
      stats: {
        totalUsers,
        activeSubscriptions,
        totalCredits,
        tierBreakdown,
        totalChannels,
        totalProjects,
        totalConnections,
        storageMb,
        statusMap,
        pubStatusMap,
      },
      counts: {
        users: totalUsers,
        subscriptions: activeSubscriptions,
        projects: totalProjects,
        channels: totalChannels,
        videoJobs: totalVideoJobs,
        assets: totalAssets,
        connections: totalConnections,
        storageMb,
      },
      channels: channelsList,
      recentProjects: projectsList,
      recentUsers,
      connections: connectionsList,
      serverTime: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch admin statistics' }, { status: 500 });
  }
}
