import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb, DEFAULT_USER_ID, getAllApiCredentials } from '@/lib/db';
import { getFfmpegPath } from '@/lib/providers/videoProvider';
import { execFile } from 'child_process';
import util from 'util';
import fs from 'fs';
import { verifyAdminToken } from '@/lib/security/adminAuth';

const execFileAsync = util.promisify(execFile);
export const dynamic = 'force-dynamic';

export async function GET() {
  const cookieStore = cookies();
  const token = cookieStore.get('admin_session_token')?.value;
  if (!token || !verifyAdminToken(token)) {
    return NextResponse.json({ error: 'Unauthorized: Admin authentication required.' }, { status: 401 });
  }

  const results: Record<string, { status: 'OK' | 'ERROR' | 'WARNING'; message: string; latencyMs?: number }> = {};
  const startTime = Date.now();

  // 1. Database Check
  try {
    const t0 = Date.now();
    const db = getDb();
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    results['database'] = {
      status: 'OK',
      message: `SQLite connected (${tables.length} tables active)`,
      latencyMs: Date.now() - t0,
    };
  } catch (err: any) {
    results['database'] = { status: 'ERROR', message: err.message };
  }

  // 2. FFmpeg Engine Check
  try {
    const t0 = Date.now();
    const ffmpegPath = getFfmpegPath();
    const res = await execFileAsync(ffmpegPath, ['-version']);
    const hasFreetype = res.stdout.includes('--enable-libfreetype');
    results['ffmpeg'] = {
      status: 'OK',
      message: `FFmpeg binary ready (${hasFreetype ? 'libfreetype enabled' : 'basic'})`,
      latencyMs: Date.now() - t0,
    };
  } catch (err: any) {
    results['ffmpeg'] = { status: 'ERROR', message: `FFmpeg not found: ${err.message}` };
  }

  // 3. Neural Voice Engine Check
  try {
    const t0 = Date.now();
    const res = await fetch('https://translate.google.com/translate_tts?ie=UTF-8&q=test&tl=en&client=tw-ob', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    results['voice'] = {
      status: res.ok ? 'OK' : 'WARNING',
      message: res.ok ? 'Google Neural Voice Streamer online' : 'Offline fallback to Windows SAPI',
      latencyMs: Date.now() - t0,
    };
  } catch (err: any) {
    results['voice'] = { status: 'WARNING', message: 'Offline fallback (Windows SAPI)' };
  }

  // 4. Cloudflare Workers AI Check
  try {
    const t0 = Date.now();
    const creds = getAllApiCredentials(DEFAULT_USER_ID);
    if (creds.cloudflare_api_token?.configured && creds.cloudflare_account_id?.configured) {
      results['cloudflare_ai'] = {
        status: 'OK',
        message: 'Cloudflare Workers AI (Flux & SDXL) configured & active',
        latencyMs: Date.now() - t0,
      };
    } else {
      results['cloudflare_ai'] = {
        status: 'WARNING',
        message: 'Cloudflare credentials not configured (using stock b-roll)',
      };
    }
  } catch (err: any) {
    results['cloudflare_ai'] = { status: 'WARNING', message: err.message };
  }

  // 5. Stock Video B-Roll Check
  try {
    const t0 = Date.now();
    const { stockVideoEngine } = await import('@/lib/providers/stockVideoProvider');
    const testUrl = await stockVideoEngine.findStockVideo('morning nature');
    results['stock_video'] = {
      status: testUrl ? 'OK' : 'WARNING',
      message: testUrl ? 'Stock Video B-Roll Engine active' : 'Stock video fallback ready',
      latencyMs: Date.now() - t0,
    };
  } catch (err: any) {
    results['stock_video'] = { status: 'WARNING', message: err.message };
  }

  return NextResponse.json({
    success: true,
    totalLatencyMs: Date.now() - startTime,
    timestamp: new Date().toISOString(),
    diagnostics: results,
  });
}
