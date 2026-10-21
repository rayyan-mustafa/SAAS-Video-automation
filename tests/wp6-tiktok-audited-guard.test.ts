import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../src/lib/db';
import { tiktokProvider } from '../src/lib/providers/tiktokProvider';

async function runTikTokGuardTests() {
  console.log('\n======================================================');
  console.log('   RUNNING WP6 TESTS: TIKTOK AUDITED COMPLIANCE GUARD');
  console.log('======================================================\n');

  const db = getDb();
  const testUserId = `test_user_tt_${Date.now()}`;
  const now = new Date().toISOString();

  // 1. Create a dummy test video file
  const testVideoPath = path.join(process.cwd(), `test_tt_video_${Date.now()}.mp4`);
  fs.writeFileSync(testVideoPath, Buffer.from('FAKE_MP4_VIDEO_CONTENT_FOR_TIKTOK_TEST'));

  try {
    // 2. Insert test user and oauth connection for TikTok
    db.prepare(`
      INSERT INTO users (id, email, password_hash, salt, name, email_verified, role, status, onboarding_completed, created_at, updated_at)
      VALUES (?, ?, '', '', 'TikTok Creator', 1, 'CUSTOMER', 'ACTIVE', 1, ?, ?)
    `).run(testUserId, `${testUserId}@example.com`, now, now);

    db.prepare(`
      INSERT INTO oauth_connections (
        id, user_id, platform, account_email, channel_id, channel_title,
        access_token, refresh_token, token_expiry, scope, created_at, updated_at
      ) VALUES (?, ?, 'TIKTOK', 'tiktok@example.com', 'tt_chan_123', 'TikTok Channel', 'fake_access_token', 'fake_refresh_token', ?, 'video.publish', ?, ?)
    `).run(uuidv4(), testUserId, new Date(Date.now() + 3600000).toISOString(), now, now);

    // Save original fetch and env
    const originalFetch = global.fetch;
    const originalAudited = process.env.TIKTOK_APP_AUDITED;

    // Test 1: When TIKTOK_APP_AUDITED is false/unset -> Force SELF_ONLY & read-back Private Draft
    console.log('[Test 1] Verifying TIKTOK_APP_AUDITED=false forces SELF_ONLY and "Posted as Private Draft"...');
    delete process.env.TIKTOK_APP_AUDITED;

    let initPayload: any = null;
    let readBackQueried = false;

    global.fetch = async (url: any, opts: any) => {
      const urlStr = String(url);
      if (urlStr.includes('/video/init/')) {
        initPayload = JSON.parse(opts.body);
        return {
          ok: true,
          status: 200,
          json: async () => ({
            error: { code: 'ok', message: '' },
            data: {
              upload_url: 'https://open.tiktokapis.com/fake-upload-url',
              publish_id: 'pub_test_123',
            },
          }),
        } as any;
      }
      if (urlStr.includes('/fake-upload-url')) {
        return { ok: true, status: 200 } as any;
      }
      if (urlStr.includes('/status/fetch/')) {
        readBackQueried = true;
        return {
          ok: true,
          status: 200,
          json: async () => ({
            error: { code: 'ok', message: '' },
            data: { status: 'PROCESSING_DOWNLOAD' },
          }),
        } as any;
      }
      return { ok: true, status: 200, json: async () => ({}) } as any;
    };

    const resUnaudited = await tiktokProvider.publishVideo({
      userId: testUserId,
      videoFilePath: testVideoPath,
      title: 'Unaudited Public Post Attempt',
      privacyLevel: 'PUBLIC_TO_EVERYONE', // Caller attempts public
    });

    assert.strictEqual(resUnaudited.success, true, 'Publish must succeed');
    assert.strictEqual(resUnaudited.isAudited, false, 'isAudited must be false');
    assert.strictEqual(initPayload.post_info.privacy_level, 'SELF_ONLY', 'Init must force SELF_ONLY when unaudited');
    assert.strictEqual(resUnaudited.actualPrivacyLevel, 'SELF_ONLY', 'Actual privacy level must be SELF_ONLY');
    assert.strictEqual(resUnaudited.visibilityStatus, 'Posted as Private Draft', 'Visibility status must be "Posted as Private Draft"');
    assert.strictEqual(readBackQueried, true, 'Status readback endpoint must be queried');
    console.log('✓ Test 1 Passed: Unaudited app strictly forced to SELF_ONLY with read-back status.');

    // Test 2: When TIKTOK_APP_AUDITED='true' -> Honors requested PUBLIC_TO_EVERYONE
    console.log('\n[Test 2] Verifying TIKTOK_APP_AUDITED=true honors PUBLIC_TO_EVERYONE...');
    process.env.TIKTOK_APP_AUDITED = 'true';
    initPayload = null;

    const resAudited = await tiktokProvider.publishVideo({
      userId: testUserId,
      videoFilePath: testVideoPath,
      title: 'Audited Public Post',
      privacyLevel: 'PUBLIC_TO_EVERYONE',
    });

    assert.strictEqual(resAudited.success, true, 'Publish must succeed');
    assert.strictEqual(resAudited.isAudited, true, 'isAudited must be true');
    assert.strictEqual(initPayload.post_info.privacy_level, 'PUBLIC_TO_EVERYONE', 'Init must allow requested public level when audited');
    assert.strictEqual(resAudited.actualPrivacyLevel, 'PUBLIC_TO_EVERYONE', 'Actual privacy level must be PUBLIC_TO_EVERYONE');
    assert.strictEqual(resAudited.visibilityStatus, 'Public', 'Visibility status must be "Public"');
    console.log('✓ Test 2 Passed: Audited app properly allowed public distribution.');

    // Test 3: Commercial-Content / Brand Disclosure toggles
    console.log('\n[Test 3] Verifying commercial-content and brand disclosure flags...');
    initPayload = null;

    await tiktokProvider.publishVideo({
      userId: testUserId,
      videoFilePath: testVideoPath,
      title: 'Sponsored Brand Post',
      brandContentToggle: true,
      brandOrganicToggle: true,
    });

    assert.strictEqual(initPayload.post_info.brand_content_toggle, true, 'brand_content_toggle must be sent to TikTok API');
    assert.strictEqual(initPayload.post_info.brand_organic_toggle, true, 'brand_organic_toggle must be sent to TikTok API');
    console.log('✓ Test 3 Passed: Brand disclosure toggles accurately passed to TikTok API.');

    // Restore fetch and env
    global.fetch = originalFetch;
    if (originalAudited !== undefined) {
      process.env.TIKTOK_APP_AUDITED = originalAudited;
    } else {
      delete process.env.TIKTOK_APP_AUDITED;
    }

    console.log('\n======================================================');
    console.log('   ALL TIKTOK AUDITED GUARD TESTS PASSED (3/3)');
    console.log('======================================================\n');
  } finally {
    if (fs.existsSync(testVideoPath)) {
      try { fs.unlinkSync(testVideoPath); } catch {}
    }
  }
}

runTikTokGuardTests().catch((err) => {
  console.error('\n❌ TIKTOK GUARD TESTS FAILED:', err);
  process.exit(1);
});
