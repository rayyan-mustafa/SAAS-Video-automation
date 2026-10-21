import assert from 'assert';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../src/lib/db';
import { originalityRadar } from '../src/lib/video/originalityRadar';
import { verifyPexelsApiCompliance } from '../src/lib/providers/stockVideoProvider';

async function runOriginalityComplianceTests() {
  console.log('\n======================================================');
  console.log('   RUNNING WP6 TESTS: ORIGINALITY RADAR & COMPLIANCE');
  console.log('======================================================\n');

  const db = getDb();
  const testUserId = `test_user_orig_${Date.now()}`;
  const now = new Date().toISOString();

  // Insert user
  db.prepare(`
    INSERT INTO users (id, email, password_hash, salt, name, email_verified, role, status, onboarding_completed, created_at, updated_at)
    VALUES (?, ?, '', '', 'Radar Tester', 1, 'CUSTOMER', 'ACTIVE', 1, ?, ?)
  `).run(testUserId, `${testUserId}@example.com`, now, now);

  const chanId = `chan_${uuidv4().substring(0, 8)}`;
  db.prepare(`
    INSERT INTO channels (id, user_id, name, niche, language, voice, target_duration_minutes, visual_style, subtitle_style, intro_style, outro_cta, publishing_platform, content_rules, created_at, updated_at)
    VALUES (?, ?, 'Tech Frontier', 'Tech', 'en', 'en-US-ChristopherNeural', 1, 'Style', 'Style', 'Intro', 'Outro', 'YouTube', 'Rules', ?, ?)
  `).run(chanId, testUserId, now, now);

  // Insert past published videos
  const pastProj1 = uuidv4();
  db.prepare(`
    INSERT INTO content_projects (
      id, user_id, channel_id, topic, target_length_minutes, preset,
      language, platform, visibility, status, current_stage,
      publishing_status, metadata_json, created_at, updated_at
    ) VALUES (?, ?, ?, 'The Shocking Truth About Solid-State Batteries', 1, 'STANDARD', 'en', 'YouTube', 'PUBLIC', 'COMPLETED', 'FINAL_VIDEO', 'PUBLISHED', ?, ?, ?)
  `).run(
    pastProj1,
    testUserId,
    chanId,
    JSON.stringify({
      youtubeTitle: 'The Shocking Truth About Solid-State Batteries',
      hookNarration: 'Everything you thought you knew about electric vehicle battery life is completely dead.',
      framework: 'CURIOSITY_GAP',
    }),
    now,
    now
  );

  // Test 1: High similarity detection (>80%) triggers alert
  console.log('[Test 1] Testing repetitive title and hook similarity alert...');
  const repResult = originalityRadar.checkOriginality({
    userId: testUserId,
    channelId: chanId,
    proposedTitle: 'The Shocking Truth About Solid-State Batteries',
    proposedHook: 'Everything you thought you knew about electric vehicle battery life is completely dead.',
    proposedFramework: 'CURIOSITY_GAP',
  });

  assert.strictEqual(repResult.passed, false, 'Identical/repetitive video must fail originality radar');
  assert.ok(repResult.maxSimilarity >= 0.80, `Similarity must be >= 80%: actual=${repResult.maxSimilarity}`);
  assert.strictEqual(repResult.matchedProjectId, pastProj1);
  assert.ok(repResult.alert && repResult.alert.includes('Originality Alert'));
  console.log('✓ Test 1 Passed: Repetitive title/hook flagged with alert (similarity: ' + repResult.maxSimilarity + ').');

  // Test 2: Novel, distinct topic passes originality radar
  console.log('\n[Test 2] Testing distinct and novel video topic...');
  const novelResult = originalityRadar.checkOriginality({
    userId: testUserId,
    channelId: chanId,
    proposedTitle: 'Why Quantum Computing Decrypts Everything By 2030',
    proposedHook: 'Inside IBM hidden lab, scientists just broke 1000 qubits.',
    proposedFramework: 'PROBLEM_AGITATION_SOLUTION',
  });

  assert.strictEqual(novelResult.passed, true, 'Original video must pass radar');
  assert.ok(novelResult.maxSimilarity < 0.80, `Similarity must be < 80%: actual=${novelResult.maxSimilarity}`);
  assert.strictEqual(novelResult.alert, undefined);
  console.log('✓ Test 2 Passed: Novel topic passed originality check with low similarity (' + novelResult.maxSimilarity + ').');

  // Test 3: Framework rotation recommendation
  console.log('\n[Test 3] Verifying framework rotation tracker...');
  assert.ok(novelResult.frameworkRotation.isWellRotated, 'Fresh framework must be marked well-rotated');
  assert.ok(Array.isArray(novelResult.frameworkRotation.recommendedFrameworks));
  console.log('✓ Test 3 Passed: Framework rotation tracker operational.');

  // Test 4: Pexels API compliance terms verification
  console.log('\n[Test 4] Verifying Pexels API terms compliance verification...');
  const pexelsCompliance = verifyPexelsApiCompliance();
  assert.strictEqual(pexelsCompliance.allowed, true);
  assert.strictEqual(pexelsCompliance.redistributionAllowed, false, 'Raw redistribution must be strictly disallowed per Pexels API terms');
  assert.ok(pexelsCompliance.licenseSummary.includes('Pexels media may only be used in derivative video compositions'));
  console.log('✓ Test 4 Passed: Pexels API terms compliance confirmed for derivative video compositions only.');

  console.log('\n======================================================');
  console.log('   ALL ORIGINALITY & COMPLIANCE TESTS PASSED (4/4)');
  console.log('======================================================\n');
}

runOriginalityComplianceTests().catch((err) => {
  console.error('\n❌ ORIGINALITY & COMPLIANCE TESTS FAILED:', err);
  process.exit(1);
});
