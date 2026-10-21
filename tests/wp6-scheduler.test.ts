import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../src/lib/db';
import { scheduler } from '../src/lib/scheduler';
import { publishingProvider, SupportedPlatform } from '../src/lib/providers/publishingProvider';

async function runSchedulerTests() {
  console.log('\n======================================================');
  console.log('   RUNNING WP6 TESTS: MULTI-PLATFORM SCHEDULER');
  console.log('======================================================\n');

  const db = getDb();
  const testUserId = `test_user_sched_${Date.now()}`;
  const now = new Date();
  const pastTime = new Date(now.getTime() - 10000).toISOString();
  const futureTime = new Date(now.getTime() + 3600000).toISOString();

  // Create a dummy video file
  const testVideoPath = path.join(process.cwd(), `test_sched_vid_${Date.now()}.mp4`);
  fs.writeFileSync(testVideoPath, Buffer.from('FAKE_VIDEO_FOR_SCHEDULER_TEST'));

  try {
    // 1. Insert test user
    db.prepare(`
      INSERT INTO users (id, email, password_hash, salt, name, email_verified, role, status, onboarding_completed, created_at, updated_at)
      VALUES (?, ?, '', '', 'Scheduler Tester', 1, 'CUSTOMER', 'ACTIVE', 1, ?, ?)
    `).run(testUserId, `${testUserId}@example.com`, now.toISOString(), now.toISOString());

    // 2. Setup channels & projects for 4 platforms
    const platforms: SupportedPlatform[] = ['YouTube', 'TikTok', 'Instagram', 'Facebook'];
    const pastProjectIds: Record<string, string> = {};

    for (const plat of platforms) {
      const chanId = `chan_${plat.toLowerCase()}_${uuidv4().substring(0, 8)}`;
      db.prepare(`
        INSERT INTO channels (id, user_id, name, niche, language, voice, target_duration_minutes, visual_style, subtitle_style, intro_style, outro_cta, publishing_platform, content_rules, created_at, updated_at)
        VALUES (?, ?, ?, 'Tech', 'en', 'en-US-ChristopherNeural', 1, 'Style', 'Style', 'Intro', 'Outro', ?, 'Rules', ?, ?)
      `).run(chanId, testUserId, `${plat} Channel`, plat, now.toISOString(), now.toISOString());

      const projId = `proj_${plat.toLowerCase()}_${uuidv4().substring(0, 8)}`;
      pastProjectIds[plat] = projId;

      db.prepare(`
        INSERT INTO content_projects (
          id, user_id, channel_id, topic, target_length_minutes, preset,
          language, platform, visibility, status, current_stage,
          scheduled_at, publishing_status, auto_publish, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 1, 'STANDARD', 'en', ?, 'PRIVATE', 'COMPLETED', 'FINAL_VIDEO', ?, 'SCHEDULED', 1, ?, ?)
      `).run(projId, testUserId, chanId, `${plat} Scheduled Video`, plat, pastTime, now.toISOString(), now.toISOString());

      // Insert video_outputs record
      db.prepare(`
        INSERT INTO video_outputs (id, project_id, storage_key, url, duration_sec, resolution, filesize_bytes, created_at)
        VALUES (?, ?, ?, 'https://cdn.autora.live/videos/test.mp4', 45, '1080x1920', 1024, ?)
      `).run(uuidv4(), projId, testVideoPath, now.toISOString());
    }

    // Also create 1 FUTURE project that must NOT trigger
    const futureChanId = `chan_future_${uuidv4().substring(0, 8)}`;
    const futureProjId = `proj_future_${uuidv4().substring(0, 8)}`;
    db.prepare(`
      INSERT INTO channels (id, user_id, name, niche, language, voice, target_duration_minutes, visual_style, subtitle_style, intro_style, outro_cta, publishing_platform, content_rules, created_at, updated_at)
      VALUES (?, ?, 'Future Channel', 'Tech', 'en', 'en-US-ChristopherNeural', 1, 'Style', 'Style', 'Intro', 'Outro', 'YouTube', 'Rules', ?, ?)
    `).run(futureChanId, testUserId, now.toISOString(), now.toISOString());

    db.prepare(`
      INSERT INTO content_projects (
        id, user_id, channel_id, topic, target_length_minutes, preset,
        language, platform, visibility, status, current_stage,
        scheduled_at, publishing_status, auto_publish, created_at, updated_at
      ) VALUES (?, ?, ?, 'Future Scheduled Video', 1, 'STANDARD', 'en', 'YouTube', 'PRIVATE', 'COMPLETED', 'FINAL_VIDEO', ?, 'SCHEDULED', 1, ?, ?)
    `).run(futureProjId, testUserId, futureChanId, futureTime, now.toISOString(), now.toISOString());

    db.prepare(`
      INSERT INTO video_outputs (id, project_id, storage_key, url, duration_sec, resolution, filesize_bytes, created_at)
      VALUES (?, ?, ?, 'https://cdn.autora.live/videos/test.mp4', 30, '1080x1920', 512, ?)
    `).run(uuidv4(), futureProjId, testVideoPath, now.toISOString());

    // Mock publishingProvider.publishVideo
    const originalPublishVideo = publishingProvider.publishVideo;
    const dispatchedPlatforms: string[] = [];

    publishingProvider.publishVideo = async (params) => {
      dispatchedPlatforms.push(params.platform);
      return {
        status: 'PUBLISHED',
        platform: params.platform,
        platformVideoId: `mock_id_${params.platform}_${Date.now()}`,
        platformUrl: `https://${params.platform.toLowerCase()}.com/mock_video`,
      };
    };

    try {
      console.log('[Test 1] Running scheduler.processScheduledPublishing() for due projects...');
      const runResult = await scheduler.processScheduledPublishing(testUserId);

      assert.strictEqual(runResult.processedCount, 4, 'Scheduler must process exactly 4 due projects');
      assert.strictEqual(runResult.publishedCount, 4, 'Scheduler must publish all 4 projects');
      assert.strictEqual(runResult.failedCount, 0, 'No projects should fail');

      // Verify all 4 platforms were dispatched
      for (const plat of platforms) {
        assert.ok(
          dispatchedPlatforms.includes(plat),
          `Scheduler must have dispatched publishing for ${plat}`
        );

        const projRow = db.prepare('SELECT publishing_status, publish_provider, publish_url FROM content_projects WHERE id = ?').get(pastProjectIds[plat]) as any;
        assert.strictEqual(projRow.publishing_status, 'PUBLISHED', `Project for ${plat} must be marked PUBLISHED`);
        assert.strictEqual(projRow.publish_provider, plat, `Publish provider must be ${plat}`);
      }
      console.log('✓ Test 1 Passed: All 4 platforms (YouTube, TikTok, Instagram, Facebook) dispatched and published on schedule.');

      // Test 2: Verify future project was NOT published
      console.log('\n[Test 2] Verifying future scheduled project remained untouched...');
      const futureRow = db.prepare('SELECT publishing_status FROM content_projects WHERE id = ?').get(futureProjId) as any;
      assert.strictEqual(futureRow.publishing_status, 'SCHEDULED', 'Future project must remain SCHEDULED');
      console.log('✓ Test 2 Passed: Future project correctly held in SCHEDULED status.');
    } finally {
      publishingProvider.publishVideo = originalPublishVideo;
    }

    console.log('\n======================================================');
    console.log('   ALL MULTI-PLATFORM SCHEDULER TESTS PASSED (2/2)');
    console.log('======================================================\n');
  } finally {
    if (fs.existsSync(testVideoPath)) {
      try { fs.unlinkSync(testVideoPath); } catch {}
    }
  }
}

runSchedulerTests().catch((err) => {
  console.error('\n❌ SCHEDULER TESTS FAILED:', err);
  process.exit(1);
});
