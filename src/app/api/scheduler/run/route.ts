import { NextResponse } from 'next/server';
import { publishingScheduler } from '@/lib/scheduler';
import { getCurrentUser } from '@/lib/auth';
import { verifyAdminToken } from '@/lib/security/adminAuth';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET || process.env.ADMIN_SECRET;
    const authHeader = request.headers.get('authorization');
    const xCronSecret = request.headers.get('x-cron-secret');
    const cookieStore = cookies();
    const adminToken = cookieStore.get('admin_session_token')?.value;

    let isAuthorized = false;

    // 1. Check Bearer token or custom x-cron-secret header
    if (cronSecret) {
      if (authHeader === `Bearer ${cronSecret}` || xCronSecret === cronSecret) {
        isAuthorized = true;
      }
    }

    // 2. Check Admin session cookie
    if (!isAuthorized && adminToken && verifyAdminToken(adminToken)) {
      isAuthorized = true;
    }

    // 3. Check Authenticated Customer session (allows manual sync from Calendar)
    if (!isAuthorized) {
      const user = await getCurrentUser(request);
      if (user) {
        isAuthorized = true;
      }
    }

    // 4. In development mode without secrets configured, allow internal requests
    if (!isAuthorized && !cronSecret && process.env.NODE_ENV !== 'production') {
      isAuthorized = true;
    }

    if (!isAuthorized) {
      return NextResponse.json(
        {
          error: 'Unauthorized. Provide Authorization: Bearer <CRON_SECRET> header or authenticate as admin/customer.',
        },
        { status: 401 }
      );
    }

    const result = await publishingScheduler.checkAndPublishDueVideos();
    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Scheduler run failed' }, { status: 500 });
  }
}
