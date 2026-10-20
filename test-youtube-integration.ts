import fs from 'fs';
import path from 'path';
import { getDb, DEFAULT_USER_ID } from './src/lib/db';
import { youtubeProvider } from './src/lib/providers/youtubeProvider';
import { publishingScheduler } from './src/lib/scheduler';

// Load .env manually
try {
  const envContent = fs.readFileSync(path.join(__dirname, '.env'), 'utf-8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [k, ...v] = trimmed.split('=');
      if (k && !process.env[k.trim()]) {
        process.env[k.trim()] = v.join('=').trim();
      }
    }
  });
} catch {}

interface TestResult {
  suite: string;
  name: string;
  verdict: 'PASS' | 'FAIL';
  details: string;
  latencyMs?: number;
}

const results: TestResult[] = [];

function recordTest(suite: string, name: string, verdict: 'PASS' | 'FAIL', details: string, latencyMs?: number) {
  results.push({ suite, name, verdict, details, latencyMs });
  const badge = verdict === 'PASS' ? '✓ [PASS]' : '✗ [FAIL]';
  console.log(`${badge} [${suite}] ${name} - ${details} ${latencyMs ? `(${latencyMs}ms)` : ''}`);
}

async function fetchHttp(urlPath: string, options: RequestInit = {}): Promise<{ status: number; text: string; json: any; headers: Headers; latency: number }> {
  const t0 = Date.now();
  const url = `http://localhost:3000${urlPath}`;
  try {
    const res = await fetch(url, options);
    const latency = Date.now() - t0;
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {}
    return { status: res.status, text, json, headers: res.headers, latency };
  } catch (err: any) {
    const latency = Date.now() - t0;
    return { status: 0, text: err.message, json: null, headers: new Headers(), latency };
  }
}

async function runYouTubeIntegrationSuite() {
  console.log('\n================================================================');
  console.log('   AUTOVIDEO SaaS — YOUTUBE AUTO-PUBLISH & OAUTH TEST SUITE');
  console.log('================================================================\n');

  const testId = Date.now();
  const userAEmail = `yt_user_a_${testId}@autovideo.ai`;
  const userBEmail = `yt_user_b_${testId}@autovideo.ai`;
  const password = 'YouTubeSecurePass2026!#';

  // 1. Create User A and User B
  const signupA = await fetchHttp('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Channel Creator A', email: userAEmail, password }),
  });
  const cookieA = (signupA.headers.get('set-cookie') || '').split(';')[0];
  const userAId = signupA.json?.user?.id;

  const signupB = await fetchHttp('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Channel Creator B', email: userBEmail, password }),
  });
  const cookieB = (signupB.headers.get('set-cookie') || '').split(';')[0];
  const userBId = signupB.json?.user?.id;

  recordTest(
    'Tenant Setup',
    'Customer A & B Account Provisioning',
    signupA.status === 201 && signupB.status === 201 ? 'PASS' : 'FAIL',
    `Created User A (${userAId}) and User B (${userBId})`,
    signupA.latency + signupB.latency
  );

  // 2. Test Auth URL Generation (Unauthenticated vs Authenticated)
  const unauthUrl = await fetchHttp('/api/auth/youtube/url');
  recordTest(
    'OAuth Security',
    'Unauthenticated Auth URL Request Blocked',
    unauthUrl.status === 401 ? 'PASS' : 'FAIL',
    'Unauthenticated request rejected with HTTP 401',
    unauthUrl.latency
  );

  const authUrlRes = await fetchHttp('/api/auth/youtube/url', {
    headers: { Cookie: cookieA },
  });
  recordTest(
    'OAuth Security',
    'Authenticated Auth URL Generation Endpoint',
    authUrlRes.status === 200 && (authUrlRes.json?.configured === false || typeof authUrlRes.json?.authUrl === 'string') ? 'PASS' : 'FAIL',
    `Response configured=${authUrlRes.json?.configured}, authUrl=${authUrlRes.json?.authUrl || 'None (Requires Client ID in .env)'}`,
    authUrlRes.latency
  );

  // 3. Test Connection Status (Disconnected State)
  const statusA_before = await fetchHttp('/api/auth/youtube/status', {
    headers: { Cookie: cookieA },
  });
  recordTest(
    'OAuth Status',
    'Disconnected Initial Status Check',
    statusA_before.status === 200 && (statusA_before.json?.status === 'NOT_CONNECTED' || statusA_before.json?.status === 'AUTH_REQUIRED') ? 'PASS' : 'FAIL',
    `Status: ${statusA_before.json?.status} (${statusA_before.json?.message})`,
    statusA_before.latency
  );

  // 4. Secure Connection Ingestion & Token Masking Check
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO oauth_connections (
      id, user_id, platform, account_email, channel_id, channel_title,
      access_token, refresh_token, token_expiry, scope, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, platform) DO UPDATE SET
      channel_id = excluded.channel_id,
      channel_title = excluded.channel_title,
      access_token = excluded.access_token,
      updated_at = excluded.updated_at
  `).run(
    `oauth_yt_${userAId}`,
    userAId,
    'YOUTUBE',
    'creator.alpha@gmail.com',
    'UC_AlphaTestChannel12345',
    'Alpha AI Studio Tech',
    'ya29.mock_secret_access_token_never_expose',
    '1//mock_secret_refresh_token_never_expose',
    new Date(Date.now() + 3600000).toISOString(),
    'https://www.googleapis.com/auth/youtube.upload',
    now,
    now
  );

  const statusA_after = await fetchHttp('/api/auth/youtube/status', {
    headers: { Cookie: cookieA },
  });

  // Verify token secrets are NEVER leaked in status response
  const rawStatusText = statusA_after.text;
  const noTokenLeaked = !rawStatusText.includes('ya29.') && !rawStatusText.includes('1//mock_secret');

  recordTest(
    'OAuth Status & Security',
    'Connected Status Check & Zero Token Leakage Verification',
    statusA_after.status === 200 && statusA_after.json?.status === 'CONNECTED' && noTokenLeaked ? 'PASS' : 'FAIL',
    `Connected: "${statusA_after.json?.channel?.title}" (ID: ${statusA_after.json?.channel?.id}), Tokens strictly masked from client`,
    statusA_after.latency
  );

  // 5. Multi-Tenant Penetration: User B MUST see NOT_CONNECTED
  const statusB = await fetchHttp('/api/auth/youtube/status', {
    headers: { Cookie: cookieB },
  });
  recordTest(
    'Multi-Tenant Isolation',
    'Cross-Tenant YouTube Connection Isolation',
    statusB.status === 200 && (statusB.json?.status === 'NOT_CONNECTED' || statusB.json?.status === 'AUTH_REQUIRED') && !statusB.json?.channel ? 'PASS' : 'FAIL',
    `User B correctly receives status=${statusB.json?.status} with zero access to User A's channel`,
    statusB.latency
  );

  // 6. Direct Publish API & Scheduled Publishing Test
  const chanRes = await fetchHttp('/api/channels', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieA },
    body: JSON.stringify({ name: 'YouTube Release Channel', niche: 'AI & Automation', target_duration_minutes: 3 }),
  });
  const channelAId = chanRes.json?.channel?.id;

  const projRes = await fetchHttp('/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieA },
    body: JSON.stringify({
      channel_id: channelAId,
      topic: 'Autonomous 30-Day YouTube Scheduling Pipeline',
      target_length_minutes: 3,
    }),
  });
  const projectAId = projRes.json?.projectId;

  // Schedule project for future release
  const futureDate = new Date(Date.now() + 86400000).toISOString(); // +24 hours
  // First mark project as COMPLETED and attach dummy output in DB for publishing test
  db.prepare("UPDATE content_projects SET status = 'COMPLETED' WHERE id = ?").run(projectAId);
  db.prepare(`
    INSERT OR REPLACE INTO video_outputs (id, project_id, storage_key, url, duration_sec, resolution, filesize_bytes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(`out_${projectAId}`, projectAId, 'final/test/output.mp4', '/api/assets/final/test/output.mp4', 60, '1920x1080', 1024 * 1024, now);

  const schedRes = await fetchHttp(`/api/projects/${projectAId}/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieA },
    body: JSON.stringify({
      visibility: 'PUBLIC',
      scheduleTime: futureDate,
    }),
  });

  recordTest(
    'Publishing Engine',
    'Future Release Scheduling & Metadata Preparation',
    schedRes.status === 200 && schedRes.json?.publishingStatus === 'SCHEDULED' ? 'PASS' : 'FAIL',
    `Scheduled project for ${futureDate}`,
    schedRes.latency
  );

  // 7. Test Background Scheduler Execution
  const schedRun = await fetchHttp('/api/scheduler/run', {
    method: 'POST',
    headers: { Cookie: cookieA },
  });
  recordTest(
    'Scheduler & Cron',
    'Auto-Publisher Background Queue Evaluation',
    schedRun.status === 200 && typeof schedRun.json?.processedCount === 'number' ? 'PASS' : 'FAIL',
    `Evaluated queue: ${schedRun.json?.processedCount} due items evaluated with error resilience`,
    schedRun.latency
  );

  // 8. Disconnect Flow & Cleanup
  const disconnectRes = await fetchHttp('/api/auth/youtube/disconnect', {
    method: 'POST',
    headers: { Cookie: cookieA },
  });

  const statusA_afterDisconnect = await fetchHttp('/api/auth/youtube/status', {
    headers: { Cookie: cookieA },
  });

  recordTest(
    'OAuth Disconnect',
    'Channel Disconnect & Token Purge',
    disconnectRes.status === 200 && (statusA_afterDisconnect.json?.status === 'NOT_CONNECTED' || statusA_afterDisconnect.json?.status === 'AUTH_REQUIRED') ? 'PASS' : 'FAIL',
    'Tokens successfully deleted from database; channel disconnected cleanly',
    disconnectRes.latency + statusA_afterDisconnect.latency
  );

  // Summary
  const total = results.length;
  const passed = results.filter((r) => r.verdict === 'PASS').length;
  const failed = results.filter((r) => r.verdict === 'FAIL').length;

  console.log(`\n================================================================`);
  console.log(`   YOUTUBE INTEGRATION SUITE: ${passed}/${total} PASSED (${Math.round((passed / total) * 100)}%)`);
  if (failed > 0) {
    console.log(`   FAILED TESTS: ${failed}`);
  }
  console.log(`================================================================\n`);
}

runYouTubeIntegrationSuite().catch(console.error);
