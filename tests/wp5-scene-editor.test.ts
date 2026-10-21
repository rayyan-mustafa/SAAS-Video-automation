import assert from 'assert';
import { v4 as uuidv4 } from 'uuid';
import {
  getDb,
  getUserCredits,
  grantUserCredits,
  saveSceneHistory,
  revertSceneFromHistory,
  checkAndConsumeFreeEdit,
  VideoScene,
} from '../src/lib/db';
import { validateNarrationModeration } from '../src/lib/video/moderationGuard';
import { videoProvider } from '../src/lib/providers/videoProvider';

async function runWP5Tests() {
  console.log('\n======================================================');
  console.log('   RUNNING WP5 TESTS: SCENE EDITOR-LITE & UNDO');
  console.log('======================================================\n');

  const db = getDb();
  const testUserId = `test_user_wp5_${Date.now()}`;
  const now = new Date().toISOString();

  // 1. Setup user & credits
  db.prepare(`
    INSERT INTO users (id, email, password_hash, salt, name, email_verified, role, status, onboarding_completed, created_at, updated_at)
    VALUES (?, ?, '', '', 'Editor Creator', 1, 'CUSTOMER', 'ACTIVE', 1, ?, ?)
  `).run(testUserId, `${testUserId}@example.com`, now, now);

  db.prepare(`
    INSERT INTO user_credits (user_id, balance, tier, subscription_status, monthly_allowance, created_at, updated_at)
    VALUES (?, 100, 'CREATOR', 'ACTIVE', 500, ?, ?)
  `).run(testUserId, now, now);

  const projectId = `proj_wp5_${uuidv4()}`;
  const channelId = `chan_${testUserId.substring(4)}`;

  db.prepare(`
    INSERT INTO channels (id, user_id, name, niche, language, voice, target_duration_minutes, visual_style, subtitle_style, intro_style, outro_cta, publishing_platform, content_rules, created_at, updated_at)
    VALUES (?, ?, 'Creator Studio', 'AI & Tech', 'en', 'en-US-ChristopherNeural', 1, 'Cinematic High-Contrast', 'Modern Clean White', 'High-Impact Hook', 'Subscribe for more', 'YouTube', 'Professional pacing', ?, ?)
  `).run(channelId, testUserId, now, now);

  db.prepare(`
    INSERT INTO content_projects (
      id, user_id, channel_id, topic, target_length_minutes, length_band, preset,
      language, platform, aspect_ratio, visibility, status, current_stage, publishing_status,
      free_edits_used, created_at, updated_at
    ) VALUES (?, ?, ?, 'Solid State Battery Breakdown', 1, 'short', 'STANDARD', 'en', 'YouTube', '9:16', 'PRIVATE', 'COMPLETED', 'FINAL_VIDEO', 'READY', 0, ?, ?)
  `).run(projectId, testUserId, channelId, now, now);

  // Setup 3 scenes
  const scene1Id = uuidv4();
  const scene2Id = uuidv4();
  const scene3Id = uuidv4();

  db.prepare(`
    INSERT INTO video_scenes (id, project_id, scene_index, narration, visual_prompt, estimated_duration_sec, subtitle_text, visual_tier, created_at)
    VALUES (?, ?, 1, 'Every EV battery today suffers from one fatal vulnerability.', 'Lithium ion battery burning dramatic macro shot', 5, 'Every EV battery today suffers from one fatal vulnerability.', 'ai_clip', ?)
  `).run(scene1Id, projectId, now);

  db.prepare(`
    INSERT INTO video_scenes (id, project_id, scene_index, narration, visual_prompt, estimated_duration_sec, subtitle_text, visual_tier, created_at)
    VALUES (?, ?, 2, 'Liquid electrolytes form dendrites that pierce the separator.', 'Microscopic dendrite needles growing inside battery cell', 5, 'Liquid electrolytes form dendrites that pierce the separator.', 'motion_still', ?)
  `).run(scene2Id, projectId, now);

  db.prepare(`
    INSERT INTO video_scenes (id, project_id, scene_index, narration, visual_prompt, estimated_duration_sec, subtitle_text, visual_tier, created_at)
    VALUES (?, ?, 3, 'Solid-state ceramic separators eliminate fire risk completely.', 'Solid state ceramic separator glowing safe blue clean energy', 5, 'Solid-state ceramic separators eliminate fire risk completely.', 'graphic', ?)
  `).run(scene3Id, projectId, now);

  console.log('✓ Initialized test project with 3 scenes across 3 visual tiers.');

  // -----------------------------------------------------------------
  // Test 1: Single-Scene Narration Moderation Check
  // -----------------------------------------------------------------
  console.log('\n[Test 1] Testing Moderation on Scene Narration Edits...');

  const safeEdit = 'Ceramic solid state electrolytes operate safely even at extreme temperatures.';
  const safeCheck = validateNarrationModeration(safeEdit);
  assert.strictEqual(safeCheck.allowed, true);

  const violatingEdit = 'Deepfake AI Joe Biden exposed the secret government battery conspiracy';
  const violatingCheck = validateNarrationModeration(violatingEdit);
  assert.strictEqual(violatingCheck.allowed, false);
  assert.strictEqual(violatingCheck.flaggedCategory, 'DEEPFAKE_CELEBRITY');
  console.log('  ✓ Moderation guard blocks deepfake likeness during scene narration edit.');

  // -----------------------------------------------------------------
  // Test 2: 1-Click Undo History (`history_json`)
  // -----------------------------------------------------------------
  console.log('\n[Test 2] Testing 1-Click Scene History Snapshots & Undo...');

  // Save history snapshot of Scene 2 before edit
  saveSceneHistory(scene2Id);

  // Edit Scene 2 narration
  db.prepare(`
    UPDATE video_scenes 
    SET narration = ?, subtitle_text = ?, visual_tier = 'graphic'
    WHERE id = ?
  `).run('NEW EDITED TEXT: Dendrites trigger short circuits instantly.', 'NEW EDITED TEXT: Dendrites trigger short circuits instantly.', scene2Id);

  const editedScene = db.prepare('SELECT narration, visual_tier, history_json FROM video_scenes WHERE id = ?').get(scene2Id) as any;
  assert.strictEqual(editedScene.narration, 'NEW EDITED TEXT: Dendrites trigger short circuits instantly.');
  assert.strictEqual(editedScene.visual_tier, 'graphic');
  assert(editedScene.history_json && editedScene.history_json.length > 0, 'history_json must be populated');
  console.log('  ✓ Scene 2 updated with snapshot stored in history_json.');

  // Trigger 1-click Undo
  const undoResult = revertSceneFromHistory(scene2Id);
  assert.strictEqual(undoResult.reverted, true, 'Undo must succeed');
  assert.strictEqual(undoResult.previousState?.narration, 'Liquid electrolytes form dendrites that pierce the separator.');
  assert.strictEqual(undoResult.previousState?.visual_tier, 'motion_still');

  const restoredScene = db.prepare('SELECT narration, visual_tier FROM video_scenes WHERE id = ?').get(scene2Id) as any;
  assert.strictEqual(restoredScene.narration, 'Liquid electrolytes form dendrites that pierce the separator.');
  assert.strictEqual(restoredScene.visual_tier, 'motion_still');
  console.log('  ✓ 1-Click Undo accurately restored prior narration and visual tier.');

  // -----------------------------------------------------------------
  // Test 3: Free Edits Ceiling (5 Free Edits per project, then credits)
  // -----------------------------------------------------------------
  console.log('\n[Test 3] Testing 5 Free Edits Quota and Overage Billing...');

  // Edit 1: Free
  const e1 = checkAndConsumeFreeEdit(projectId, testUserId, 10);
  assert.strictEqual(e1.isFree, true);
  assert.strictEqual(e1.creditsDeducted, 0);
  assert.strictEqual(e1.remainingFreeEdits, 4);

  // Edits 2, 3, 4, 5: Free
  checkAndConsumeFreeEdit(projectId, testUserId, 10);
  checkAndConsumeFreeEdit(projectId, testUserId, 10);
  checkAndConsumeFreeEdit(projectId, testUserId, 10);
  const e5 = checkAndConsumeFreeEdit(projectId, testUserId, 10);
  assert.strictEqual(e5.isFree, true);
  assert.strictEqual(e5.remainingFreeEdits, 0);
  console.log('  ✓ First 5 edits consumed 0 credits (Free Edits Quota).');

  // Edit 6: Overage! Should deduct 10 credits
  const initialBalance = getUserCredits(testUserId).balance;
  assert.strictEqual(initialBalance, 100);

  const e6 = checkAndConsumeFreeEdit(projectId, testUserId, 10);
  assert.strictEqual(e6.isFree, false);
  assert.strictEqual(e6.creditsDeducted, 10);
  assert.strictEqual(e6.remainingFreeEdits, 0);

  const balanceAfterOverage = getUserCredits(testUserId).balance;
  assert.strictEqual(balanceAfterOverage, 90, 'Balance must deduct 10 credits for 6th edit');
  console.log(`  ✓ 6th edit charged overage: 100 -> ${balanceAfterOverage} credits.`);

  // -----------------------------------------------------------------
  // Test 4: Scene Reordering (Drag-and-Drop Sequence)
  // -----------------------------------------------------------------
  console.log('\n[Test 4] Testing Scene Reordering...');

  // Reorder sequence: Scene 3 becomes #1, Scene 1 becomes #2, Scene 2 becomes #3
  const newOrder = [scene3Id, scene1Id, scene2Id];
  const updateStmt = db.prepare('UPDATE video_scenes SET scene_index = ? WHERE id = ?');
  newOrder.forEach((id, idx) => {
    updateStmt.run(idx + 1, id);
  });

  const reordered1 = db.prepare('SELECT scene_index FROM video_scenes WHERE id = ?').get(scene3Id) as any;
  const reordered2 = db.prepare('SELECT scene_index FROM video_scenes WHERE id = ?').get(scene1Id) as any;
  const reordered3 = db.prepare('SELECT scene_index FROM video_scenes WHERE id = ?').get(scene2Id) as any;

  assert.strictEqual(reordered1.scene_index, 1);
  assert.strictEqual(reordered2.scene_index, 2);
  assert.strictEqual(reordered3.scene_index, 3);
  console.log('  ✓ Scenes reordered cleanly: [3, 1, 2] -> indices [1, 2, 3].');

  // -----------------------------------------------------------------
  // Test 5: Visual Tier Swap Dispatch
  // -----------------------------------------------------------------
  console.log('\n[Test 5] Testing Tier Dispatch for Scene Swap...');

  const clips = await videoProvider.generateVideoClipsForScene({
    projectId,
    sceneId: scene3Id,
    sceneIndex: 1,
    visualPrompt: 'Key stat 98% efficiency with solid-state electrolytes',
    durationSec: 3,
    niche: 'AI & Tech',
    visualStyle: 'Cinematic High-Contrast',
    aspectRatio: '9:16',
    visualMediaMode: 'graphic' as any,
  } as any);

  assert(clips.length > 0, 'Clip must be generated');
  assert.strictEqual(clips[0].visualTier, 'graphic', 'Generated clip must have tier graphic');
  console.log(`  ✓ Generated graphic card swap clip: ${clips[0].storageKey} (${clips[0].durationSec}s)`);

  console.log('\n======================================================');
  console.log('   🎉 ALL WP5 ACCEPTANCE TESTS PASSED SUCCESSFULLY!');
  console.log('======================================================\n');
}

runWP5Tests().catch((err) => {
  console.error('WP5 Test Failed:', err);
  process.exit(1);
});
