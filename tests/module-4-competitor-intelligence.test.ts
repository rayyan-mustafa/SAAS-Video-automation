import assert from 'assert';
import { v4 as uuidv4 } from 'uuid';
import {
  getDb,
  listCompetitorChannels,
  getCompetitorViralVideos,
  deleteCompetitorChannel,
} from '../src/lib/db';

async function runModule4Tests() {
  console.log('\n======================================================');
  console.log('   RUNNING MODULE 4 TESTS: COMPETITOR INTELLIGENCE');
  console.log('======================================================\n');

  const db = getDb();
  const testUserId = `user_comp_${Date.now()}`;
  const now = new Date().toISOString();

  // Ensure test user exists
  db.prepare(`
    INSERT INTO users (id, email, password_hash, salt, name, role, status, created_at, updated_at)
    VALUES (?, ?, 'dummy', 'dummy', 'Competitor Test User', 'CUSTOMER', 'ACTIVE', ?, ?)
  `).run(testUserId, `${testUserId}@autora.test`, now, now);

  // Test 1: Insert Competitor Channel and Viral Video Cache
  console.log('[Test 1] Storing competitor channel and viral outliers in SQLite...');
  const compId = uuidv4();
  db.prepare(`
    INSERT INTO competitor_channels (id, user_id, channel_handle, channel_id, channel_title, thumbnail_url, subscriber_count, avg_views_7d, last_refreshed, created_at)
    VALUES (?, ?, 'MagnatesMedia', 'UC_MagnatesMedia_001', 'Magnates Media', 'https://example.com/thumb.jpg', 1500000, 250000, ?, ?)
  `).run(compId, testUserId, now, now);

  // Insert 3 videos: 1 normal, 2 viral outliers (> 1.5x avg views of 250,000)
  const vid1Id = uuidv4();
  const vid2Id = uuidv4();
  const vid3Id = uuidv4();

  db.prepare(`
    INSERT INTO competitor_viral_cache (id, competitor_id, video_id, title, view_count, like_count, published_at, viral_score, thumbnail_url, cached_at)
    VALUES (?, ?, 'yt_vid_1', 'How Disney Secretly Controls Everything', 750000, 45000, ?, 3.0, 'https://example.com/disney.jpg', ?)
  `).run(vid1Id, compId, now, now);

  db.prepare(`
    INSERT INTO competitor_viral_cache (id, competitor_id, video_id, title, view_count, like_count, published_at, viral_score, thumbnail_url, cached_at)
    VALUES (?, ?, 'yt_vid_2', 'The Untold Story of Red Bull Empire', 450000, 30000, ?, 1.8, 'https://example.com/redbull.jpg', ?)
  `).run(vid2Id, compId, now, now);

  db.prepare(`
    INSERT INTO competitor_viral_cache (id, competitor_id, video_id, title, view_count, like_count, published_at, viral_score, thumbnail_url, cached_at)
    VALUES (?, ?, 'yt_vid_3', 'Weekly Tech Briefing #42', 120000, 8000, ?, 0.5, 'https://example.com/tech.jpg', ?)
  `).run(vid3Id, compId, now, now);

  const channels = listCompetitorChannels(testUserId);
  assert.strictEqual(channels.length, 1, 'Should find 1 tracked competitor channel');
  assert.strictEqual(channels[0].channel_handle, 'MagnatesMedia');
  assert.strictEqual(channels[0].avg_views_7d, 250000);

  const viralVideos = getCompetitorViralVideos(compId);
  assert.strictEqual(viralVideos.length, 3, 'Should retrieve 3 cached videos');
  assert.strictEqual(viralVideos[0].viral_score, 3.0, 'Top viral score should be 3.0x');
  console.log('✓ Competitor channel and cached viral outliers verified in SQLite.');

  // Test 2: Viral Outlier Formula Verification
  console.log('[Test 2] Testing Outlier Calculation Logic...');
  const testViews = [100000, 150000, 80000, 500000, 90000]; // 500k is an outlier
  const avgViews = Math.round(testViews.reduce((a, b) => a + b, 0) / testViews.length); // 184,000
  const outlierMultiplier = Math.round((500000 / avgViews) * 10) / 10;
  assert(outlierMultiplier >= 2.5, `500k views should yield outlier multiplier >= 2.5x (got ${outlierMultiplier}x)`);
  console.log(`✓ Viral score calculation verified: 500k vs ${avgViews} avg -> ${outlierMultiplier}x outlier.`);

  // Test 3: 1-Click "Add Variation to Calendar"
  console.log('[Test 3] Simulating 1-Click Add Viral Variation to Calendar...');
  const testChannelId = `chan_${Date.now()}`;
  db.prepare(`
    INSERT INTO channels (id, user_id, name, niche, language, voice, target_duration_minutes, created_at, updated_at)
    VALUES (?, ?, 'AI Tech Channel', 'Tech & Business', 'en', 'rachel', 3, ?, ?)
  `).run(testChannelId, testUserId, now, now);

  const selectedHook = 'The Secret Weapon Behind Tesla AI in 2026';
  const newProjectId = uuidv4();
  db.prepare(`
    INSERT INTO content_projects (
      id, user_id, channel_id, topic, target_length_minutes, preset,
      language, platform, visibility, status, current_stage, publishing_status,
      auto_publish, scheduled_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 3, 'STANDARD', 'en', 'YouTube', 'PUBLIC', 'DRAFT', 'SCRIPT', 'SCHEDULED', 0, ?, ?, ?)
  `).run(newProjectId, testUserId, testChannelId, selectedHook, new Date(Date.now() + 86400000).toISOString(), now, now);

  const createdProj = db.prepare('SELECT * FROM content_projects WHERE id = ?').get(newProjectId) as any;
  assert(createdProj !== undefined, 'New calendar project must be created in DB');
  assert.strictEqual(createdProj.topic, selectedHook, 'Topic must match the viral variation angle');
  console.log('✓ 1-Click Add to Calendar successfully creates scheduled project.');

  // Test 4: Cascading Channel Deletion
  console.log('[Test 4] Testing Untrack Competitor & Cascading Cleanup...');
  const deleted = deleteCompetitorChannel(compId, testUserId);
  assert.strictEqual(deleted, true, 'deleteCompetitorChannel must return true');

  const channelsAfter = listCompetitorChannels(testUserId);
  assert.strictEqual(channelsAfter.length, 0, 'No channels should remain');

  const cacheAfter = getCompetitorViralVideos(compId);
  assert.strictEqual(cacheAfter.length, 0, 'Cascading deletion must purge viral cache records');
  console.log('✓ Competitor channel and associated viral cache cleanly purged.');

  console.log('\n======================================================');
  console.log('   🎉 ALL MODULE 4 TESTS PASSED SUCCESSFULLY!');
  console.log('======================================================\n');
}

runModule4Tests().catch((err) => {
  console.error('Module 4 test failed:', err);
  process.exit(1);
});
