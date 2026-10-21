import assert from 'assert';
import { v4 as uuidv4 } from 'uuid';
import {
  getDb,
  getUserCredits,
  grantUserCredits,
  deductUserCredits,
  checkPlanGenerationRateLimit,
  recordPlanGeneration,
  checkUserEligibilityForPlan,
} from '../src/lib/db';
import { validateNarrationModeration } from '../src/lib/video/moderationGuard';
import {
  calculateWorstCaseQuote,
  calculateActualCreditCost,
  reconcilePriceLockRefund,
} from '../src/lib/billing/priceLockEngine';
import { videoWorker } from '../src/lib/queue/worker';

async function runWP8Tests() {
  console.log('\n======================================================');
  console.log('   RUNNING WP8 TESTS: PROMPT-TO-PLAN & PRICE LOCK');
  console.log('======================================================\n');

  const db = getDb();
  const testUserId = `test_user_wp8_${Date.now()}`;
  const now = new Date().toISOString();

  // Initialize test user in users table & user_credits
  db.prepare(`
    INSERT INTO users (id, email, password_hash, salt, name, email_verified, role, status, onboarding_completed, created_at, updated_at)
    VALUES (?, ?, '', '', 'Test Creator', 1, 'CUSTOMER', 'ACTIVE', 1, ?, ?)
  `).run(testUserId, `${testUserId}@example.com`, now, now);

  db.prepare(`
    INSERT INTO user_credits (user_id, balance, tier, subscription_status, monthly_allowance, created_at, updated_at)
    VALUES (?, 100, 'CREATOR', 'ACTIVE', 500, ?, ?)
  `).run(testUserId, now, now);

  // -----------------------------------------------------------------
  // Test 1: Content Moderation Guard (YouTube Inauthentic & Scam Policy)
  // -----------------------------------------------------------------
  console.log('[Test 1] Testing Moderation Guard on Violating and Safe Prompts...');

  const safePrompt = 'Top 5 habit transformations for better cognitive focus';
  const safeCheck = validateNarrationModeration(safePrompt);
  assert.strictEqual(safeCheck.allowed, true, 'Safe prompt must pass moderation');

  const deepfakePrompt = 'Deepfake AI Elon Musk confesses secret crypto strategy';
  const deepfakeCheck = validateNarrationModeration(deepfakePrompt);
  assert.strictEqual(deepfakeCheck.allowed, false, 'Deepfake celebrity prompt must be blocked');
  assert.strictEqual(deepfakeCheck.flaggedCategory, 'DEEPFAKE_CELEBRITY');
  console.log('  ✓ Deepfake celebrity prompt correctly blocked:', deepfakeCheck.reason);

  const scamPrompt = 'Guaranteed 500% profit double your money overnight in crypto';
  const scamCheck = validateNarrationModeration(scamPrompt);
  assert.strictEqual(scamCheck.allowed, false, 'Financial scam prompt must be blocked');
  assert.strictEqual(scamCheck.flaggedCategory, 'SCAM_MISLEADING');
  console.log('  ✓ Scam/misleading prompt correctly blocked:', scamCheck.reason);

  // -----------------------------------------------------------------
  // Test 2: Free Plan Generation Rate Limit (Max 3/hour per user)
  // -----------------------------------------------------------------
  console.log('\n[Test 2] Testing Plan Generation Rate Limiter (Max 3/hr)...');

  // Verify initial eligibility
  const eligibility = checkUserEligibilityForPlan(testUserId);
  assert.strictEqual(eligibility.eligible, true, 'Active user with credits must be eligible');

  // Initial rate limit check
  const rl0 = checkPlanGenerationRateLimit(testUserId);
  assert.strictEqual(rl0.allowed, true);
  assert.strictEqual(rl0.count, 0);

  // Consume 3 plans
  recordPlanGeneration(testUserId);
  recordPlanGeneration(testUserId);
  recordPlanGeneration(testUserId);

  const rl3 = checkPlanGenerationRateLimit(testUserId);
  assert.strictEqual(rl3.allowed, false, '4th plan attempt in rolling hour must be blocked');
  assert.strictEqual(rl3.count, 3);
  assert(rl3.retryAfterSec! > 0, 'Retry after seconds must be positive');
  console.log(`  ✓ Rate limit triggered after 3 plans: retryAfter=${rl3.retryAfterSec}s`);

  // Clear rate limits for subsequent pipeline tests
  db.prepare('DELETE FROM plan_generation_rate_limits WHERE user_id = ?').run(testUserId);

  // -----------------------------------------------------------------
  // Test 3: Worst-Case Price Lock Quoting Engine
  // -----------------------------------------------------------------
  console.log('\n[Test 3] Testing Worst-Case Price Lock Quoting Engine...');

  // Short band (<=60s): Base 25 credits includes $0.47 AI budget
  // 4 scenes with 2 ai_clips (5s each at $0.05/s = $0.50 AI cost)
  // $0.50 cost - $0.47 budget = $0.03 overage -> ceil(0.03 / 0.026) = 2 extra credits
  // Total quote: 25 + 2 = 27 credits
  const quote = calculateWorstCaseQuote({
    targetLengthMinutes: 1,
    scenes: [
      { sceneIndex: 1, visualTier: 'ai_clip', durationSec: 5, modelUsdPerSec: 0.05 },
      { sceneIndex: 2, visualTier: 'motion_still', durationSec: 4 },
      { sceneIndex: 3, visualTier: 'graphic', durationSec: 4 },
      { sceneIndex: 4, visualTier: 'ai_clip', durationSec: 5, modelUsdPerSec: 0.05 },
    ],
  });

  assert.strictEqual(quote.lengthBand, 'short');
  assert.strictEqual(quote.baseCredits, 25);
  assert.strictEqual(quote.includedAiBudgetUsd, 0.47);
  assert.strictEqual(quote.estimatedAiCostUsd, 0.50);
  assert.strictEqual(quote.extraCredits, 2);
  assert.strictEqual(quote.totalQuotedCredits, 27);
  console.log('  ✓ Worst-case quote calculated correctly: Base 25 + Extra 2 = 27 credits');

  // -----------------------------------------------------------------
  // Test 4: Fail-Closed Pipeline Gate (Halt at PLAN before approval)
  // -----------------------------------------------------------------
  console.log('\n[Test 4] Testing Pipeline Fail-Closed Gate at PLAN Stage...');

  const projectId = `proj_wp8_${uuidv4()}`;
  const channelId = `chan_${testUserId.substring(4)}`;

  db.prepare(`
    INSERT INTO channels (id, user_id, name, niche, language, voice, target_duration_minutes, visual_style, subtitle_style, intro_style, outro_cta, publishing_platform, content_rules, created_at, updated_at)
    VALUES (?, ?, 'Creator Studio', 'AI & Tech', 'en', 'en-US-ChristopherNeural', 1, 'Cinematic High-Contrast', 'Modern Clean White', 'High-Impact Hook', 'Subscribe for more', 'YouTube', 'Professional pacing', ?, ?)
  `).run(channelId, testUserId, now, now);

  db.prepare(`
    INSERT INTO content_projects (
      id, user_id, channel_id, topic, target_length_minutes, length_band, preset,
      language, platform, aspect_ratio, visibility, status, current_stage, publishing_status,
      auto_publish, created_at, updated_at
    ) VALUES (?, ?, ?, 'The Future of Quantum Computing', 1, 'short', 'STANDARD', 'en', 'YouTube', '9:16', 'PRIVATE', 'PROCESSING', 'PLAN', 'DRAFT', 0, ?, ?)
  `).run(projectId, testUserId, channelId, now, now);

  // Execute pipeline (unapproved project)
  await videoWorker.processPipeline(projectId, 'PLAN');

  // Verify project state in DB
  const pausedProject = db.prepare('SELECT status, current_stage, quoted_credits, approved_at FROM content_projects WHERE id = ?').get(projectId) as any;
  assert.strictEqual(pausedProject.status, 'PENDING_APPROVAL', 'Project status must halt at PENDING_APPROVAL');
  assert.strictEqual(pausedProject.current_stage, 'PLAN', 'Current stage must remain PLAN');
  assert.strictEqual(pausedProject.approved_at, null, 'approved_at must be null');
  assert(pausedProject.quoted_credits > 0, 'quoted_credits must be stamped and > 0');
  console.log(`  ✓ Pipeline halted at PLAN: status=${pausedProject.status}, quoted_credits=${pausedProject.quoted_credits}`);

  // Verify scenes and previews generated
  const scenes = db.prepare('SELECT scene_index, narration, visual_tier, storyboard_preview_url FROM video_scenes WHERE project_id = ? ORDER BY scene_index ASC').all(projectId) as any[];
  assert(scenes.length >= 3, 'Scenes must be generated');
  for (const s of scenes) {
    assert(s.storyboard_preview_url && s.storyboard_preview_url.length > 0, `Scene ${s.scene_index} must have storyboard preview URL`);
  }
  console.log(`  ✓ Generated ${scenes.length} scenes with storyboard preview cards`);

  // Verify zero voice or video jobs executed
  const voiceJob = db.prepare("SELECT status FROM video_jobs WHERE project_id = ? AND stage = 'VOICE'").get(projectId) as any;
  const videoJob = db.prepare("SELECT status FROM video_jobs WHERE project_id = ? AND stage = 'VIDEO'").get(projectId) as any;
  assert.strictEqual(voiceJob.status, 'PENDING', 'Voice stage must NOT execute before approval');
  assert.strictEqual(videoJob.status, 'PENDING', 'Video stage must NOT execute before approval');
  console.log('  ✓ Verified 0 paid voice and video calls executed before user approval');

  // Verify zero credits deducted so far
  const initialBalance = getUserCredits(testUserId).balance;
  assert.strictEqual(initialBalance, 100, 'User balance must still be untouched (100 credits) before approval');
  console.log('  ✓ Verified user credit balance unchanged (100 credits) during plan generation');

  // -----------------------------------------------------------------
  // Test 5: Storyboard Approval & Price Lock Hold
  // -----------------------------------------------------------------
  console.log('\n[Test 5] Simulating Storyboard Approval with Price Lock Hold...');

  const quotedCredits = pausedProject.quoted_credits;
  deductUserCredits(
    testUserId,
    quotedCredits,
    'PRICE_LOCK_APPROVAL_HOLD',
    `Price Lock Approval Hold (${quotedCredits} credits)`,
    projectId
  );

  const balanceAfterHold = getUserCredits(testUserId).balance;
  assert.strictEqual(balanceAfterHold, 100 - quotedCredits, `Balance must deduct quoted ceiling (${quotedCredits} credits)`);
  console.log(`  ✓ Quoted ceiling deducted on approval: 100 -> ${balanceAfterHold} credits`);

  // Mark project approved
  const approvalTime = new Date().toISOString();
  db.prepare(`UPDATE content_projects SET status = 'PROCESSING', approved_at = ? WHERE id = ?`).run(approvalTime, projectId);

  // -----------------------------------------------------------------
  // Test 6: Price Lock Delta Auto-Refund Reconciliation
  // -----------------------------------------------------------------
  console.log('\n[Test 6] Testing Price Lock Delta Auto-Refund Reconciliation...');

  // Set scene durations to deliver actual shorter duration than worst-case estimate
  // E.g., make all scenes motion_still or short audio duration
  db.prepare(`UPDATE video_scenes SET visual_tier = 'motion_still', audio_duration_sec = 3 WHERE project_id = ?`).run(projectId);

  const reconcileResult = reconcilePriceLockRefund({
    projectId,
    userId: testUserId,
    targetLengthMinutes: 1,
  });

  assert(reconcileResult.actualCredits <= reconcileResult.quotedCredits, 'Delivered cost must be <= quoted ceiling');
  assert(reconcileResult.deltaRefundCredits >= 0, 'Delta refund must be non-negative');

  const finalBalance = getUserCredits(testUserId).balance;
  console.log(`  ✓ Price Lock Delta Reconciliation: Quoted=${reconcileResult.quotedCredits}, Actual=${reconcileResult.actualCredits}, DeltaRefund=+${reconcileResult.deltaRefundCredits}`);
  assert.strictEqual(finalBalance, balanceAfterHold + reconcileResult.deltaRefundCredits, 'Balance must reflect delta refund');
  console.log(`  ✓ Restored delta to user balance: final balance=${finalBalance} credits`);

  // Verify transaction ledger entry
  if (reconcileResult.deltaRefundCredits > 0) {
    const refundTx = db.prepare("SELECT * FROM credit_transactions WHERE project_id = ? AND type = 'PRICE_LOCK_DELTA_REFUND'").get(projectId) as any;
    assert(refundTx !== undefined, 'Delta refund ledger record must exist');
    assert.strictEqual(refundTx.amount, reconcileResult.deltaRefundCredits);
    console.log(`  ✓ Verified PRICE_LOCK_DELTA_REFUND transaction in audit ledger`);
  }

  console.log('\n======================================================');
  console.log('   🎉 ALL WP8 ACCEPTANCE TESTS PASSED SUCCESSFULLY!');
  console.log('======================================================\n');
}

runWP8Tests().catch((err) => {
  console.error('WP8 Test Failed:', err);
  process.exit(1);
});
