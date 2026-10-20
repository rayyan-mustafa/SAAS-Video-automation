import assert from 'assert';
import { v4 as uuidv4 } from 'uuid';
import { getDb, OAuthConnection } from '../src/lib/db';
import { publishingProvider } from '../src/lib/providers/publishingProvider';
import { instagramProvider } from '../src/lib/providers/instagramProvider';
import { tiktokProvider } from '../src/lib/providers/tiktokProvider';

async function runModule6Tests() {
  console.log('\n======================================================');
  console.log('   RUNNING MODULE 6 TESTS: MULTI-PLATFORM AUTO-PUBLISH');
  console.log('======================================================\n');

  const db = getDb();
  const testUserId = `user_pub_${Date.now()}`;
  const now = new Date().toISOString();

  // Test 1: Platform status when disconnected
  console.log('[Test 1] Verifying platform status for unconnected accounts...');
  const ytStatus = await publishingProvider.getPlatformStatus('YouTube', testUserId);
  assert.strictEqual(ytStatus.status, 'NOT_CONNECTED');

  const igStatus = await publishingProvider.getPlatformStatus('Instagram', testUserId);
  assert.strictEqual(igStatus.status, 'NOT_CONNECTED');

  const ttStatus = await publishingProvider.getPlatformStatus('TikTok', testUserId);
  assert.strictEqual(ttStatus.status, 'NOT_CONNECTED');
  console.log('✓ All platforms report NOT_CONNECTED for new user.');

  // Test 2: Connecting Instagram and TikTok accounts
  console.log('[Test 2] Connecting Instagram & TikTok OAuth credentials...');
  const igConnId = `oauth_ig_${uuidv4()}`;
  db.prepare(`
    INSERT INTO oauth_connections (
      id, user_id, platform, account_email, channel_id, channel_title,
      access_token, token_expiry, scope, created_at, updated_at
    ) VALUES (?, ?, 'INSTAGRAM', 'creator@instagram.com', '17841400012345678', 'InstaReelsStudio', 'IGQVJ_fake_access_token', ?, 'instagram_basic,instagram_content_publish', ?, ?)
  `).run(igConnId, testUserId, new Date(Date.now() + 3600000).toISOString(), now, now);

  const ttConnId = `oauth_tt_${uuidv4()}`;
  db.prepare(`
    INSERT INTO oauth_connections (
      id, user_id, platform, account_email, channel_id, channel_title,
      access_token, token_expiry, scope, created_at, updated_at
    ) VALUES (?, ?, 'TIKTOK', 'creator@tiktok.com', 'open_id_tt_999', 'TikTokCreatorStudio', 'act.fake_tiktok_access_token', ?, 'video.publish', ?, ?)
  `).run(ttConnId, testUserId, new Date(Date.now() + 3600000).toISOString(), now, now);

  const igStatusAfter = await publishingProvider.getPlatformStatus('Instagram', testUserId);
  assert.strictEqual(igStatusAfter.status, 'CONNECTED');
  assert.strictEqual(igStatusAfter.channelTitle, 'InstaReelsStudio');

  const ttStatusAfter = await publishingProvider.getPlatformStatus('TikTok', testUserId);
  assert.strictEqual(ttStatusAfter.status, 'CONNECTED');
  assert.strictEqual(ttStatusAfter.channelTitle, 'TikTokCreatorStudio');
  console.log('✓ Connected accounts recognized across Instagram Reels & TikTok.');

  // Test 3: Instagram Provider Validation (requires public URL)
  console.log('[Test 3] Testing Instagram Provider Validation...');
  assert.strictEqual(typeof instagramProvider.publishReel, 'function');

  // Test 4: TikTok Provider Validation (validates file path exists)
  console.log('[Test 4] Testing TikTok Provider File Existence Guard...');
  const missingFileRes = await tiktokProvider.publishVideo({
    userId: testUserId,
    videoFilePath: 'd:/nonexistent/file/path.mp4',
    title: 'Test TikTok',
  });
  assert.strictEqual(missingFileRes.success, false);
  assert(missingFileRes.error?.includes('not found'), 'Missing file must return clean error');
  console.log('✓ TikTok file validation error handled gracefully.');

  // Clean up
  db.prepare('DELETE FROM oauth_connections WHERE id IN (?, ?)').run(igConnId, ttConnId);

  console.log('\n======================================================');
  console.log('   🎉 ALL MODULE 6 TESTS PASSED SUCCESSFULLY!');
  console.log('======================================================\n');
}

runModule6Tests().catch((err) => {
  console.error('Module 6 test failed:', err);
  process.exit(1);
});
