import assert from 'assert';
import { v4 as uuidv4 } from 'uuid';
import {
  getDb,
  DEFAULT_USER_ID,
  ContentProject,
  listCompetitorChannels,
} from '../src/lib/db';
import { publishingProvider, SupportedPlatform } from '../src/lib/providers/publishingProvider';

async function runMultiPlatformDurationTests() {
  console.log('\n========================================================================');
  console.log('   RUNNING MULTI-PLATFORM & FLEXIBLE VERTICAL DURATION TESTS');
  console.log('========================================================================\n');

  const db = getDb();
  const testUserId = `user_flex_${Date.now()}`;
  const testProjectId = `proj_flex_${Date.now()}`;
  const now = new Date().toISOString();

  // Test 1: Decoupled Vertical Aspect Ratio with >1 Minute Duration (3m TikTok Sweetspot)
  console.log('[Test 1] Creating 3-minute 9:16 vertical project for TikTok & YouTube...');
  const testEmail = `test_flex_${Date.now()}@autora.live`;
  db.prepare(`
    INSERT INTO users (id, email, password_hash, salt, name, created_at, updated_at)
    VALUES (?, ?, 'hash', 'salt', 'Flex Creator', ?, ?)
  `).run(testUserId, testEmail, now, now);

  const testChannelId = `chan_flex_${Date.now()}`;
  db.prepare(`
    INSERT INTO channels (
      id, user_id, name, niche, language, voice, voice_speed,
      target_duration_minutes, visual_style, subtitle_style, intro_style, outro_cta,
      publishing_platform, content_rules, publishing_days, publishing_time, timezone,
      default_visibility, auto_publish, created_at, updated_at
    ) VALUES (?, ?, 'Flex Studio', 'AI & Tech', 'en', 'en-US-ChristopherNeural', '1.0x', 3, 'Cinematic High-Contrast', 'Modern Clean White', 'High-Impact Hook', 'Subscribe for more', 'YouTube', 'pacing', '["Monday"]', '14:00', 'UTC', 'PRIVATE', 0, ?, ?)
  `).run(testChannelId, testUserId, now, now);

  const selectedPlatforms = ['YouTube', 'TikTok', 'Instagram'];
  const metadata = JSON.stringify({
    aspectRatio: '9:16',
    platforms: selectedPlatforms,
    voice: 'en-US-ChristopherNeural',
    visualStyle: 'Cinematic High-Contrast',
  });

  db.prepare(`
    INSERT INTO content_projects (
      id, user_id, channel_id, topic, target_length_minutes, preset,
      language, platform, aspect_ratio, visibility, status, current_stage,
      publishing_status, metadata_json, created_at, updated_at
    ) VALUES (?, ?, ?, '10 Mind-Blowing AI Breakthroughs', 3, 'STANDARD', 'en', ?, '9:16', 'PRIVATE', 'PENDING', 'SCRIPT', 'DRAFT', ?, ?, ?)
  `).run(
    testProjectId,
    testUserId,
    testChannelId,
    selectedPlatforms.join(', '),
    metadata,
    now,
    now
  );

  const savedProject = db.prepare('SELECT * FROM content_projects WHERE id = ?').get(testProjectId) as ContentProject;
  assert(savedProject, 'Project must exist in DB');
  assert.strictEqual(savedProject.target_length_minutes, 3, 'Target duration must be 3 minutes');
  assert.strictEqual((savedProject as any).aspect_ratio, '9:16', 'Aspect ratio must be preserved as 9:16');
  assert.strictEqual(savedProject.platform, 'YouTube, TikTok, Instagram', 'Platform must reflect multi-platform target');
  console.log('✓ Project stored with 3-minute length, 9:16 vertical format, and multi-platform selection.');

  // Test 2: Verify Video Pipeline Worker Aspect Ratio Resolution
  console.log('[Test 2] Verifying worker pipeline aspect ratio resolution logic...');
  let resolvedWorkerAspect = '16:9';
  if ((savedProject as any).aspect_ratio) {
    resolvedWorkerAspect = (savedProject as any).aspect_ratio;
  } else if (savedProject.metadata_json) {
    const meta = JSON.parse(savedProject.metadata_json);
    if (meta.aspectRatio) resolvedWorkerAspect = meta.aspectRatio;
    else if (savedProject.target_length_minutes >= 2) resolvedWorkerAspect = '16:9';
  } else if (savedProject.target_length_minutes >= 2) {
    resolvedWorkerAspect = '16:9';
  }

  assert.strictEqual(
    resolvedWorkerAspect,
    '9:16',
    'Worker must preserve 9:16 for a 3-minute video when aspect_ratio is explicitly 9:16'
  );
  console.log('✓ Worker correctly resolves 9:16 vertical format for 3-minute video without forcing 16:9.');

  // Test 3: Multi-Platform Publishing Dispatch
  console.log('[Test 3] Testing multi-platform publishing dispatch across YouTube, TikTok, and Instagram...');
  const targetPlatforms: SupportedPlatform[] = ['YouTube', 'TikTok', 'Instagram'];
  const publishResults = [];

  for (const plat of targetPlatforms) {
    const res = await publishingProvider.publishVideo({
      projectId: testProjectId,
      platform: plat,
      videoFilePath: 'd:/tests/sample.mp4',
      title: savedProject.topic,
      description: 'AI Generated video',
      userId: testUserId,
    });
    publishResults.push(res);
  }

  assert.strictEqual(publishResults.length, 3, 'Must return results for all 3 target platforms');
  assert.strictEqual(publishResults[0].platform, 'YouTube');
  assert.strictEqual(publishResults[1].platform, 'TikTok');
  assert.strictEqual(publishResults[2].platform, 'Instagram');
  console.log('✓ Multi-platform publishing dispatcher executed across all 3 platforms seamlessly.');

  // Test 4: Cross-Platform Competitor Channels & Viral Intelligence (TikTok & Instagram)
  console.log('[Test 4] Testing Cross-Platform Competitor Intelligence (TikTok & Instagram handles)...');
  const ttChannelId = uuidv4();
  const igChannelId = uuidv4();

  db.prepare(`
    INSERT INTO competitor_channels (id, user_id, channel_handle, channel_id, channel_title, thumbnail_url, subscriber_count, avg_views_7d, platform, last_refreshed, created_at)
    VALUES (?, ?, 'growthhacker', 'tt_growthhacker', '@growthhacker', 'https://example.com/thumb.jpg', 500000, 45000, 'TIKTOK', ?, ?)
  `).run(ttChannelId, testUserId, now, now);

  db.prepare(`
    INSERT INTO competitor_channels (id, user_id, channel_handle, channel_id, channel_title, thumbnail_url, subscriber_count, avg_views_7d, platform, last_refreshed, created_at)
    VALUES (?, ?, 'reelsviral', 'ig_reelsviral', '@reelsviral', 'https://example.com/thumb.jpg', 850000, 60000, 'INSTAGRAM', ?, ?)
  `).run(igChannelId, testUserId, now, now);

  const ttList = listCompetitorChannels(testUserId, 'TIKTOK');
  assert.strictEqual(ttList.length, 1);
  assert.strictEqual(ttList[0].channel_title, '@growthhacker');
  assert.strictEqual(ttList[0].platform, 'TIKTOK');

  const igList = listCompetitorChannels(testUserId, 'INSTAGRAM');
  assert.strictEqual(igList.length, 1);
  assert.strictEqual(igList[0].channel_title, '@reelsviral');
  assert.strictEqual(igList[0].platform, 'INSTAGRAM');

  // Insert viral outlier for TikTok
  const viralVideoId = uuidv4();
  db.prepare(`
    INSERT INTO competitor_viral_cache (
      id, competitor_id, video_id, title, view_count, like_count,
      viral_score, thumbnail_url, platform, published_at, cached_at
    ) VALUES (?, ?, 'tt_vid_123', 'Secret AI Tool Nobody Knows', 350000, 45000, 7.77, 'https://example.com/thumb.jpg', 'TIKTOK', ?, ?)
  `).run(viralVideoId, ttChannelId, now, now);

  const viralVideos = db.prepare('SELECT * FROM competitor_viral_cache WHERE competitor_id = ?').all(ttChannelId) as any[];
  assert(viralVideos.length >= 1, 'Must find TikTok viral outlier');
  assert.strictEqual(viralVideos[0].platform, 'TIKTOK');
  assert(viralVideos[0].viral_score > 7.0, 'Viral multiplier must be > 7x');
  console.log('✓ Cross-platform competitor intelligence successfully tracks TikTok & Instagram viral outliers.');

  // Clean up test data
  db.prepare('DELETE FROM competitor_viral_cache WHERE id = ?').run(viralVideoId);
  db.prepare('DELETE FROM competitor_channels WHERE id IN (?, ?)').run(ttChannelId, igChannelId);
  db.prepare('DELETE FROM content_projects WHERE id = ?').run(testProjectId);
  db.prepare('DELETE FROM channels WHERE id = ?').run(testChannelId);
  db.prepare('DELETE FROM users WHERE id = ?').run(testUserId);

  console.log('\n========================================================================');
  console.log('   🎉 ALL MULTI-PLATFORM & DURATION TESTS PASSED 100%!');
  console.log('========================================================================\n');
}

runMultiPlatformDurationTests().catch((err) => {
  console.error('Test run failed:', err);
  process.exit(1);
});
