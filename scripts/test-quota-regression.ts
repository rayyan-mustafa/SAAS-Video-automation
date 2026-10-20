import http from 'http';
import { getDb, getMonthlyVideoUsage } from '../src/lib/db';
import { createSession, SESSION_TOKEN_COOKIE } from '../src/lib/auth';

async function request(url: string, options: any = {}): Promise<{ status: number; body: string; headers: any }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + parsed.search,
        method: options.method || 'GET',
        headers: options.headers || {},
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve({ status: res.statusCode || 0, body: data, headers: res.headers }));
      }
    );
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function main() {
  console.log('--- TEST SUITE: 30 Videos/Month Quota & Zero-Waste Policy ---');
  const db = getDb();
  const testUserId = `usr_quota_${Date.now()}`;
  const now = new Date().toISOString();

  // Create user record
  db.prepare(`
    INSERT INTO users (id, email, password_hash, salt, name, email_verified, role, status, onboarding_completed, created_at, updated_at)
    VALUES (?, ?, 'hash', 'salt', 'Quota Tester', 1, 'CUSTOMER', 'ACTIVE', 1, ?, ?)
  `).run(testUserId, `${testUserId}@example.com`, now, now);

  // Create user channel
  const channelId = `chan_${testUserId}`;
  db.prepare(`
    INSERT INTO channels (
      id, user_id, name, niche, language, voice, voice_speed, target_duration_minutes,
      visual_style, subtitle_style, intro_style, outro_cta, publishing_platform,
      content_rules, publishing_days, publishing_time, timezone, default_visibility,
      auto_publish, created_at, updated_at
    ) VALUES (
      ?, ?, 'Test Channel', 'Tech', 'en', 'elevenlabs:rachel', '1.0x', 1,
      'Cinematic High-Contrast', 'Modern Clean White', 'Hook', 'Subscribe', 'YouTube',
      'Rules', '[]', '12:00', 'UTC', 'PRIVATE', 0, ?, ?
    )
  `).run(channelId, testUserId, now, now);

  // Create session
  const { sessionToken } = createSession(testUserId);
  const authHeaders = {
    Cookie: `${SESSION_TOKEN_COOKIE}=${sessionToken}`,
    'Content-Type': 'application/json',
  };

  // 1. Initial quota check
  const initial = getMonthlyVideoUsage(testUserId);
  console.log(`1. Initial usage for new user: used=${initial.used}, remaining=${initial.remaining}/${initial.limit}`);
  if (initial.used !== 0 || initial.remaining !== 30) throw new Error('Initial quota incorrect');

  // 2. Insert 29 completed videos
  console.log('2. Populating user with 29 completed videos...');
  const insertStmt = db.prepare(`
    INSERT INTO content_projects (
      id, user_id, channel_id, topic, target_length_minutes, preset,
      language, platform, visibility, status, current_stage, publishing_status,
      created_at, updated_at
    ) VALUES (?, ?, ?, 'Sample Topic', 1, 'STANDARD', 'en', 'YouTube', 'PRIVATE', 'COMPLETED', 'EXPORT', 'DRAFT', ?, ?)
  `);

  const projectIds: string[] = [];
  for (let i = 1; i <= 29; i++) {
    const pid = `proj_quota_${testUserId}_${i}`;
    projectIds.push(pid);
    insertStmt.run(pid, testUserId, channelId, now, now);
  }

  const usage29 = getMonthlyVideoUsage(testUserId);
  console.log(`   Usage at 29: used=${usage29.used}, remaining=${usage29.remaining}/${usage29.limit}`);
  if (usage29.used !== 29 || usage29.remaining !== 1) throw new Error('Usage at 29 incorrect');

  // 3. Attempt 30th video via POST /api/projects -> Should be ALLOWED
  console.log('3. Attempting 30th video creation via POST /api/projects...');
  const res30 = await request('http://localhost:3000/api/projects', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ topic: '30th Video Test', target_length_minutes: 1, channel_id: channelId }),
  });
  console.log(`   Status: ${res30.status}`);
  if (res30.status !== 201) throw new Error(`Expected 201 for 30th video, got ${res30.status}: ${res30.body}`);
  const json30 = JSON.parse(res30.body);
  console.log(`   ✓ 30th video accepted (Project ID: ${json30.projectId})`);

  // Verify usage is now 30/30
  const usage30 = getMonthlyVideoUsage(testUserId);
  console.log(`   Usage now: used=${usage30.used}, remaining=${usage30.remaining}/${usage30.limit}`);
  if (usage30.used !== 30 || usage30.remaining !== 0) throw new Error('Usage at 30 incorrect');

  // 4. Attempt 31st video via POST /api/projects -> Should be BLOCKED with HTTP 429
  console.log('4. Attempting 31st video creation (exceeding 30 limit)...');
  const res31 = await request('http://localhost:3000/api/projects', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ topic: '31st Video Should Be Blocked', target_length_minutes: 1, channel_id: channelId }),
  });
  console.log(`   Status: ${res31.status}`);
  console.log(`   Response: ${res31.body}`);
  if (res31.status !== 429) throw new Error(`Expected HTTP 429 for 31st video, got ${res31.status}`);
  const json31 = JSON.parse(res31.body);
  if (!json31.error.includes('Monthly video quota reached')) throw new Error('Incorrect quota error message');
  console.log('   ✓ 31st video correctly blocked with HTTP 429.');

  // 5. Zero-Waste Policy verification: mark one video FAILED
  console.log('5. Testing Zero-Waste Policy (marking 1 job FAILED)...');
  db.prepare("UPDATE content_projects SET status = 'FAILED' WHERE id = ?").run(projectIds[0]);
  const usageAfterFail = getMonthlyVideoUsage(testUserId);
  console.log(`   Usage after job failed: used=${usageAfterFail.used}, remaining=${usageAfterFail.remaining}/${usageAfterFail.limit}`);
  if (usageAfterFail.used !== 29 || usageAfterFail.remaining !== 1) {
    throw new Error('Zero-Waste policy failed: failed video was still counted towards quota');
  }
  console.log('   ✓ Zero-Waste Policy verified: failed video did not consume monthly quota.');

  // 6. Tenant isolation check: Tenant B has 0/30 used
  const tenantBId = `usr_tenant_b_${Date.now()}`;
  const usageB = getMonthlyVideoUsage(tenantBId);
  console.log(`6. Tenant B usage: used=${usageB.used}, remaining=${usageB.remaining}/${usageB.limit}`);
  if (usageB.used !== 0 || usageB.remaining !== 30) throw new Error('Tenant isolation failed: quota leaked between users');
  console.log('   ✓ Tenant isolation verified: Tenant A usage has zero impact on Tenant B.');

  console.log('\n=============================================');
  console.log('ALL QUOTA & ZERO-WASTE TESTS PASSED (6/6)! 🚀');
  console.log('=============================================');
}

main().catch((err) => {
  console.error('Test Failed:', err);
  process.exit(1);
});
