import assert from 'assert';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../src/lib/db';
import { instagramProvider, MAX_INSTAGRAM_REELS_DURATION_SEC } from '../src/lib/providers/instagramProvider';

async function runInstagramUrlTests() {
  console.log('\n======================================================');
  console.log('   RUNNING WP6 TESTS: INSTAGRAM REELS URL & DURATION');
  console.log('======================================================\n');

  const db = getDb();
  const testUserId = `test_user_ig_${Date.now()}`;
  const now = new Date().toISOString();

  // Insert mock user & connection
  db.prepare(`
    INSERT INTO users (id, email, password_hash, salt, name, email_verified, role, status, onboarding_completed, created_at, updated_at)
    VALUES (?, ?, '', '', 'Instagram Creator', 1, 'CUSTOMER', 'ACTIVE', 1, ?, ?)
  `).run(testUserId, `${testUserId}@example.com`, now, now);

  db.prepare(`
    INSERT INTO oauth_connections (
      id, user_id, platform, account_email, channel_id, channel_title,
      access_token, refresh_token, token_expiry, scope, created_at, updated_at
    ) VALUES (?, ?, 'INSTAGRAM', 'ig@example.com', 'ig_account_123', 'Instagram Account', 'fake_ig_token', 'fake_ig_refresh', ?, 'instagram_basic', ?, ?)
  `).run(uuidv4(), testUserId, new Date(Date.now() + 3600000).toISOString(), now, now);

  // Test 1: Reject local file path
  console.log('[Test 1] Attempting to publish local file path to Instagram...');
  const localRes = await instagramProvider.publishReel({
    userId: testUserId,
    videoUrl: '/var/data/videos/final.mp4',
    caption: 'Local file test',
  });

  assert.strictEqual(localRes.success, false, 'Local file path must fail');
  assert.ok(
    localRes.error && localRes.error.includes('Local file paths and insecure HTTP URLs are rejected by the Meta Graph API'),
    `Error message must clearly state rejection of local paths: ${localRes.error}`
  );
  console.log('✓ Test 1 Passed: Local file path cleanly rejected with descriptive error.');

  // Test 2: Reject non-HTTPS HTTP URL
  console.log('\n[Test 2] Attempting to publish non-HTTPS HTTP URL...');
  const httpRes = await instagramProvider.publishReel({
    userId: testUserId,
    videoUrl: 'http://cdn.example.com/video.mp4',
    caption: 'Insecure HTTP test',
  });

  assert.strictEqual(httpRes.success, false, 'HTTP URL must fail');
  assert.ok(
    httpRes.error && httpRes.error.includes('URL must be a publicly accessible HTTPS URL'),
    `Error must mention HTTPS requirement: ${httpRes.error}`
  );
  console.log('✓ Test 2 Passed: Insecure HTTP URL rejected.');

  // Test 3: Reject duration exceeding 90s
  console.log('\n[Test 3] Attempting to publish video exceeding 90s duration ceiling...');
  const longRes = await instagramProvider.publishReel({
    userId: testUserId,
    videoUrl: 'https://cdn.autora.live/videos/project123/final.mp4',
    caption: 'Overlength test',
    durationSeconds: 110,
  });

  assert.strictEqual(longRes.success, false, 'Overlength video must fail');
  assert.ok(
    longRes.error && longRes.error.includes('Instagram Reels duration cannot exceed 90 seconds (attempted: 110s)'),
    `Error must state duration limit: ${longRes.error}`
  );
  console.log('✓ Test 3 Passed: 90s duration ceiling enforced.');

  // Test 4: Valid HTTPS URL within 90s duration ceiling reaches API container endpoint
  console.log('\n[Test 4] Valid public HTTPS URL and 45s duration reaches Meta Graph API container...');
  const originalFetch = global.fetch;
  let containerRequested = false;

  global.fetch = async (url: any, opts: any) => {
    const urlStr = String(url);
    if (urlStr.includes('/media_publish')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ id: 'ig_media_final_888' }),
      } as any;
    }
    if (urlStr.includes('/media')) {
      containerRequested = true;
      return {
        ok: true,
        status: 200,
        json: async () => ({ id: 'ig_container_999' }),
      } as any;
    }
    if (urlStr.includes('/ig_container_999')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ status_code: 'FINISHED' }),
      } as any;
    }
    return { ok: true, status: 200, json: async () => ({}) } as any;
  };

  try {
    const validRes = await instagramProvider.publishReel({
      userId: testUserId,
      videoUrl: 'https://cdn.autora.live/videos/project123/final.mp4',
      caption: 'Valid public reel',
      durationSeconds: 45,
    });

    assert.strictEqual(validRes.success, true, 'Valid HTTPS Reel publish must succeed');
    assert.strictEqual(containerRequested, true, 'Container creation endpoint must have been called');
    assert.strictEqual(validRes.mediaId, 'ig_media_final_888', 'Media ID must match');
    console.log('✓ Test 4 Passed: Valid HTTPS Reel published successfully.');
  } finally {
    global.fetch = originalFetch;
  }

  console.log('\n======================================================');
  console.log('   ALL INSTAGRAM URL & DURATION TESTS PASSED (4/4)');
  console.log('======================================================\n');
}

runInstagramUrlTests().catch((err) => {
  console.error('\n❌ INSTAGRAM TESTS FAILED:', err);
  process.exit(1);
});
