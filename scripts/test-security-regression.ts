import http from 'http';
import { getDb } from '../src/lib/db';
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
  console.log('--- TEST SUITE: Multi-Tenant Security & Privilege Isolation ---');
  const db = getDb();
  const now = new Date().toISOString();

  // 1. Provision Tenant A & Tenant B
  const tenantAId = `usr_sec_a_${Date.now()}`;
  const tenantBId = `usr_sec_b_${Date.now()}`;

  db.prepare(`
    INSERT INTO users (id, email, password_hash, salt, name, email_verified, role, status, onboarding_completed, created_at, updated_at)
    VALUES (?, ?, 'hash', 'salt', 'Tenant A', 1, 'CUSTOMER', 'ACTIVE', 1, ?, ?),
           (?, ?, 'hash', 'salt', 'Tenant B', 1, 'CUSTOMER', 'ACTIVE', 1, ?, ?)
  `).run(tenantAId, `${tenantAId}@test.com`, now, now, tenantBId, `${tenantBId}@test.com`, now, now);

  const sessionA = createSession(tenantAId).sessionToken;
  const sessionB = createSession(tenantBId).sessionToken;

  const headersA = { Cookie: `${SESSION_TOKEN_COOKIE}=${sessionA}`, 'Content-Type': 'application/json' };
  const headersB = { Cookie: `${SESSION_TOKEN_COOKIE}=${sessionB}`, 'Content-Type': 'application/json' };

  // Tenant A creates Channel
  const channelAId = `chan_${tenantAId}`;
  db.prepare(`
    INSERT INTO channels (
      id, user_id, name, niche, language, voice, voice_speed, target_duration_minutes,
      visual_style, subtitle_style, intro_style, outro_cta, publishing_platform,
      content_rules, publishing_days, publishing_time, timezone, default_visibility,
      auto_publish, created_at, updated_at
    ) VALUES (
      ?, ?, 'Confidential Brand Channel A', 'Finance', 'en', 'elevenlabs:rachel', '1.0x', 3,
      'Cinematic High-Contrast', 'Modern Clean White', 'Hook', 'Subscribe', 'YouTube',
      'Confidential secret rules', '[]', '12:00', 'UTC', 'PRIVATE', 0, ?, ?
    )
  `).run(channelAId, tenantAId, now, now);

  // Tenant A creates Project
  const projectAId = `proj_sec_${Date.now()}`;
  db.prepare(`
    INSERT INTO content_projects (
      id, user_id, channel_id, topic, target_length_minutes, preset,
      language, platform, visibility, status, current_stage, publishing_status,
      created_at, updated_at
    ) VALUES (?, ?, ?, 'Secret Strategy for Brand A', 3, 'STANDARD', 'en', 'YouTube', 'PRIVATE', 'COMPLETED', 'EXPORT', 'DRAFT', ?, ?)
  `).run(projectAId, tenantAId, channelAId, now, now);

  // Tenant A connects YouTube (with mock secret tokens)
  db.prepare(`
    INSERT INTO oauth_connections (
      id, user_id, platform, account_email, channel_id, channel_title,
      access_token, refresh_token, token_expiry, scope, created_at, updated_at
    ) VALUES (?, ?, 'YOUTUBE', 'owner.a@secretbrand.com', 'UC_SecretChannelA', 'Brand A Official', 'ya29.secret_token_a', '1//refresh_a', ?, 'scope', ?, ?)
  `).run(`oauth_${tenantAId}`, tenantAId, new Date(Date.now() + 3600000).toISOString(), now, now);

  console.log('1. Tenant A created Channel, Project, and YouTube connection.');

  // 2. Tenant B attempts to access Tenant A's project (GET /api/projects/:id)
  console.log("2. Tenant B attempting to read Tenant A's project...");
  const projRes = await request(`http://localhost:3000/api/projects/${projectAId}`, { headers: headersB });
  console.log(`   Status: ${projRes.status}`);
  if (projRes.status !== 404) throw new Error(`Expected 404 for cross-tenant project access, got ${projRes.status}`);
  if (projRes.body.includes('Secret Strategy')) throw new Error('Data leak: Tenant A project details returned to Tenant B');
  console.log('   ✓ Tenant B blocked with HTTP 404 (No data leaked).');

  // 3. Tenant B attempts to read Tenant A's channel (GET /api/channels/:id)
  console.log("3. Tenant B attempting to read Tenant A's channel...");
  const chanRes = await request(`http://localhost:3000/api/channels/${channelAId}`, { headers: headersB });
  console.log(`   Status: ${chanRes.status}`);
  if (chanRes.status !== 404) throw new Error(`Expected 404 for cross-tenant channel access, got ${chanRes.status}`);
  if (chanRes.body.includes('Confidential Brand')) throw new Error('Data leak: Tenant A channel details returned to Tenant B');
  console.log('   ✓ Tenant B blocked with HTTP 404 (No data leaked).');

  // 4. Tenant B checks YouTube connection (GET /api/auth/youtube/status)
  console.log("4. Tenant B checking YouTube status...");
  const ytRes = await request('http://localhost:3000/api/auth/youtube/status', { headers: headersB });
  console.log(`   Status: ${ytRes.status}, Body: ${ytRes.body}`);
  const ytJson = JSON.parse(ytRes.body);
  if (ytJson.status === 'CONNECTED' || ytJson.channel?.id === 'UC_SecretChannelA') {
    throw new Error('Data leak: Tenant A YouTube credentials accessible to Tenant B');
  }
  console.log('   ✓ Tenant B sees unlinked YouTube status (Tenant A tokens completely isolated).');

  // 5. Tenant B attempts to access Admin API (GET /api/admin/keys)
  console.log('5. Tenant B attempting to access Admin API (/api/admin/keys)...');
  const adminRes = await request('http://localhost:3000/api/admin/keys', { headers: headersB });
  console.log(`   Status: ${adminRes.status}`);
  if (adminRes.status !== 401) throw new Error(`Expected 401 for unauthorized admin access, got ${adminRes.status}`);
  console.log('   ✓ Customer access to Super Admin API strictly blocked with HTTP 401.');

  // 6. Unauthenticated request to billing
  console.log('6. Unauthenticated request to /api/billing...');
  const unauthBill = await request('http://localhost:3000/api/billing');
  console.log(`   Status: ${unauthBill.status}`);
  if (unauthBill.status !== 401) throw new Error(`Expected 401 for unauthenticated billing access, got ${unauthBill.status}`);
  console.log('   ✓ Unauthenticated request blocked with HTTP 401.');

  console.log('\n======================================================');
  console.log('ALL SECURITY & TENANT ISOLATION TESTS PASSED (6/6)! 🔒');
  console.log('======================================================');
}

main().catch((err) => {
  console.error('Test Failed:', err);
  process.exit(1);
});
