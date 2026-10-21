import assert from 'assert';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { getDb, deductUserCredits, getUserCredits } from '../src/lib/db';
import { EngineError } from '../src/lib/video/engineErrors';
import {
  calculateCreditCost,
  calculatePriceDeltaRefund,
  issuePriceDeltaRefund,
  getQcDowngradeRefundRate,
} from '../src/lib/billing/refundEngine';
import { inspectMedia, getFfmpegPath } from '../src/lib/providers/videoProvider';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

async function runWp0Tests() {
  console.log('\n========================================================================');
  console.log('   RUNNING WP0 ACCEPTANCE TESTS: HONEST FAILURES & SECURITY AUDIT');
  console.log('========================================================================\n');

  const db = getDb();
  const now = new Date().toISOString();
  const testUserId = `user_wp0_${Date.now()}`;
  const testEmail = `wp0_${Date.now()}@autora.live`;

  // Setup test user
  db.prepare(`
    INSERT INTO users (id, email, password_hash, salt, name, created_at, updated_at)
    VALUES (?, ?, 'hash', 'salt', 'WP0 Tester', ?, ?)
  `).run(testUserId, testEmail, now, now);

  db.prepare(`
    INSERT INTO user_credits (user_id, balance, tier, subscription_status, monthly_allowance, created_at, updated_at)
    VALUES (?, 100, 'CREATOR', 'ACTIVE', 500, ?, ?)
  `).run(testUserId, now, now);

  // -------------------------------------------------------------------------
  // TEST 1: Price-Delta Refund Formula & Tier Costs
  // -------------------------------------------------------------------------
  console.log('[Test 1] Validating 60% Gross Margin Pricing Formula & Price-Delta Engine...');
  
  // Formula: ceil((usdPerSec * durationSec) / 0.026)
  const costEconomy = calculateCreditCost(0.05, 5); // 0.25 / 0.026 = 9.615 -> 10
  assert.strictEqual(costEconomy, 10, 'Economy 5s clip at $0.05/s must equal 10 credits');

  const costFast = calculateCreditCost(0.08, 5); // 0.40 / 0.026 = 15.38 -> 16
  assert.strictEqual(costFast, 16, 'Fast 5s clip at $0.08/s must equal 16 credits');

  const costFlagship = calculateCreditCost(0.20, 5); // 1.00 / 0.026 = 38.46 -> 39
  assert.strictEqual(costFlagship, 39, 'Flagship 5s clip at $0.20/s must equal 39 credits');

  // Price-delta refunds
  const deltaFlagshipToStill = calculatePriceDeltaRefund('flagship', 'motion_still');
  assert.strictEqual(deltaFlagshipToStill, 50, 'Flagship to motion still refund must be 50 credits');

  const deltaFastToStill = calculatePriceDeltaRefund('fast', 'motion_still');
  assert.strictEqual(deltaFastToStill, 15, 'Fast to motion still refund must be 15 credits');

  const deltaFlagshipToFast = calculatePriceDeltaRefund('flagship', 'fast');
  assert.strictEqual(deltaFlagshipToFast, 35, 'Flagship to fast refund must be 35 credits');

  console.log('✓ Credit pricing formula and delta calculations passed.');

  // -------------------------------------------------------------------------
  // TEST 2: Price-Delta Itemized Refund Execution & Telemetry
  // -------------------------------------------------------------------------
  console.log('[Test 2] Testing issuePriceDeltaRefund and downgrade telemetry...');
  const testProjectId = `proj_wp0_${uuidv4()}`;

  // Deduct initial credits
  deductUserCredits(testUserId, 25, 'VIDEO_GENERATION', 'Video generation started', testProjectId);
  assert.strictEqual(getUserCredits(testUserId).balance, 75, 'Balance must be 75 after deduction');

  // Issue price-delta refund for a scene downgraded from fast (15) to motion_still (0)
  const refundResult = issuePriceDeltaRefund({
    userId: testUserId,
    projectId: testProjectId,
    sceneIndex: 2,
    plannedTier: 'fast',
    deliveredTier: 'motion_still',
    refundCredits: 15,
  });

  assert.strictEqual(refundResult.refundCredits, 15, 'Refunded amount must be 15 credits');
  assert.strictEqual(getUserCredits(testUserId).balance, 90, 'Balance must increase from 75 to 90');

  // Verify itemized row in credit_transactions
  const deltaTx = db.prepare(`
    SELECT * FROM credit_transactions 
    WHERE project_id = ? AND type = 'REFUND'
    ORDER BY created_at DESC LIMIT 1
  `).get(testProjectId) as any;

  assert(deltaTx !== undefined, 'Refund transaction must exist in database');
  assert.strictEqual(deltaTx.amount, 15, 'Transaction amount must be 15');
  assert.strictEqual(deltaTx.balance_after, 90, 'Transaction balance_after must be 90');
  assert(deltaTx.description.includes('Scene 2 downgraded'), 'Description must note scene and downgrade tiers');

  // Check telemetry calculation
  const telemetry = getQcDowngradeRefundRate(7);
  assert(telemetry.totalBilled >= 25, 'Total billed must include the 25 credit deduction');
  assert(telemetry.totalRefunded >= 15, 'Total refunded must include the 15 credit refund');
  assert(typeof telemetry.refundRate === 'number', 'Refund rate must be numeric');
  console.log(`✓ Price-delta ledger entry verified. Refund rate: ${(telemetry.refundRate * 100).toFixed(1)}% (Alert: ${telemetry.alert})`);

  // -------------------------------------------------------------------------
  // TEST 3: Zero Fake Success in Worker FINAL_VIDEO
  // -------------------------------------------------------------------------
  console.log('[Test 3] Verifying FINAL_VIDEO stage throws honest EngineError when assets missing...');
  
  // Create channel for project
  const testChannelId = `chan_wp0_${uuidv4()}`;
  db.prepare(`
    INSERT INTO channels (
      id, user_id, name, niche, language, voice, voice_speed,
      target_duration_minutes, visual_style, subtitle_style, intro_style, outro_cta,
      publishing_platform, content_rules, publishing_days, publishing_time, timezone,
      default_visibility, auto_publish, created_at, updated_at
    ) VALUES (?, ?, 'WP0 Test Channel', 'Tech', 'en', 'en-US-ChristopherNeural', '1.0x', 1, 'Cinematic', 'Modern', 'Hook', 'CTA', 'YouTube', 'pacing', '["Monday"]', '12:00', 'UTC', 'PRIVATE', 0, ?, ?)
  `).run(testChannelId, testUserId, now, now);

  // Create dummy project in DB with NO clips
  const emptyProjectId = `proj_empty_${uuidv4()}`;
  db.prepare(`
    INSERT INTO content_projects (
      id, user_id, channel_id, topic, target_length_minutes, preset,
      language, platform, aspect_ratio, visibility, status, current_stage,
      publishing_status, created_at, updated_at
    ) VALUES (?, ?, ?, 'Empty Project Test', 1, 'STANDARD', 'en', 'YouTube', '9:16', 'PRIVATE', 'PROCESSING', 'FINAL_VIDEO', 'DRAFT', ?, ?)
  `).run(emptyProjectId, testUserId, testChannelId, now, now);

  const { videoWorker } = await import('../src/lib/queue/worker');

  // Execute FINAL_VIDEO stage directly via private method or simulated execution
  let clipErrorThrown = false;
  try {
    // Calling private executeStage via reflect
    await (videoWorker as any).executeStage('FINAL_VIDEO', { id: emptyProjectId, user_id: testUserId, topic: 'Test' }, { visual_style: 'Cinematic' });
  } catch (err: any) {
    clipErrorThrown = true;
    assert(err instanceof EngineError || err.name === 'EngineError', 'Error must be an instance of EngineError');
    assert.strictEqual(err.code, 'NO_VALID_CLIPS', 'Error code must be NO_VALID_CLIPS');
  }

  assert(clipErrorThrown, 'FINAL_VIDEO must throw when no clips exist, rather than creating fake minimal MP4s');

  // Verify NO 32-byte minimal MP4 headers exist on disk in the storage directory
  const fallbackClipPath = path.join(process.cwd(), 'storage', 'clips', emptyProjectId, 'scene_1_clip_1.mp4');
  assert(!fs.existsSync(fallbackClipPath), 'Fallback 32-byte clip must NEVER be created on disk');
  console.log('✓ FINAL_VIDEO honest failure verified: threw NO_VALID_CLIPS, zero fake files created.');

  // -------------------------------------------------------------------------
  // TEST 4: Probed Media Duration with inspectMedia (FFmpeg / FFprobe)
  // -------------------------------------------------------------------------
  console.log('[Test 4] Verifying inspectMedia actual duration probing with FFmpeg...');
  const tempDir = path.join(process.cwd(), 'temp', 'wp0_tests');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  const testClipPath = path.join(tempDir, `test_probe_${Date.now()}.mp4`);
  const ffmpegPath = getFfmpegPath();

  try {
    // Generate a 2.50 second test clip using FFmpeg lavfi testsrc
    await execFileAsync(ffmpegPath, [
      '-y',
      '-f', 'lavfi',
      '-i', 'testsrc=duration=2.5:size=320x240:rate=30',
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      testClipPath
    ]);

    assert(fs.existsSync(testClipPath), 'Test clip should be generated');

    const mediaInfo = await inspectMedia(testClipPath);
    console.log(`Probed Duration: ${mediaInfo.durationSec}s, Resolution: ${mediaInfo.resolution}, Codec: ${mediaInfo.videoCodec}`);

    assert(mediaInfo.isValid, 'Media must be valid');
    assert(Math.abs(mediaInfo.durationSec - 2.5) <= 0.1, `Probed duration (${mediaInfo.durationSec}) must match 2.5s within 0.1s tolerance`);
    console.log('✓ Media duration probing verified within +/- 0.1s tolerance.');
  } finally {
    if (fs.existsSync(testClipPath)) {
      try { await fs.promises.unlink(testClipPath); } catch {}
    }
    if (fs.existsSync(tempDir)) {
      try { await fs.promises.rm(tempDir, { recursive: true }); } catch {}
    }
  }

  // -------------------------------------------------------------------------
  // TEST 5: Security Fail-Closed Audit Verification
  // -------------------------------------------------------------------------
  console.log('[Test 5] Verifying security fail-closed configuration in next.config.js & oauth-state.ts...');
  
  // Verify next.config.js has ignoreBuildErrors: false
  const nextConfigContent = fs.readFileSync(path.join(process.cwd(), 'next.config.js'), 'utf8');
  assert(nextConfigContent.includes('ignoreBuildErrors: false'), 'next.config.js must enforce ignoreBuildErrors: false');
  assert(nextConfigContent.includes('ignoreDuringBuilds: false'), 'next.config.js must enforce ignoreDuringBuilds: false');
  console.log('✓ next.config.js strict build and typecheck settings verified.');

  // Verify oauth-state.ts fail-closed without hardcoded secrets
  const oauthStateContent = fs.readFileSync(path.join(process.cwd(), 'src', 'lib', 'security', 'oauth-state.ts'), 'utf8');
  assert(!oauthStateContent.includes('autovideo_oauth_state_hmac_secret_2026'), 'Hardcoded OAuth state secret must be completely deleted');
  console.log('✓ oauth-state.ts fail-closed secret verified.');

  console.log('\n========================================================================');
  console.log('   🎉 ALL WP0 ACCEPTANCE TESTS PASSED SUCCESSFULLY');
  console.log('========================================================================\n');
}

runWp0Tests().catch((err) => {
  console.error('\n❌ WP0 TEST FAILURE:', err);
  process.exit(1);
});
