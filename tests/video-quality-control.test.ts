/**
 * Video Quality Control (QC) & Global Visual Style Test Suite
 * Validates the 8 quality control validation criteria, project-wide visual style inheritance,
 * storyboard-narration sync, and automated per-scene self-healing regeneration.
 */

import assert from 'assert';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { getDb, DEFAULT_USER_ID, ContentProject, VideoScene } from '../src/lib/db';
import { aiProvider } from '../src/lib/providers/aiProvider';
import { resolveGlobalVisualStyle, applyGlobalStyleToPrompt, VISUAL_STYLE_PRESETS } from '../src/lib/video/visualStyles';
import { sceneQualityChecker, QualityReport } from '../src/lib/video/qualityControl';
import { PIPELINE_STAGES } from '../src/lib/queue/worker';
import { videoProvider } from '../src/lib/providers/videoProvider';
import { storage } from '../src/lib/storage';

let testsPassed = 0;
let testsFailed = 0;

async function test(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    console.log(`  ✅ PASS: ${name}`);
    testsPassed++;
  } catch (err: any) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${err.message}`);
    testsFailed++;
  }
}

async function runQualityControlTests() {
  console.log('🛡️ AutoVideo Video Quality Control (QC) & Visual Style Verification Suite\n');

  const testProjectId = `test_qc_${uuidv4().substring(0, 8)}`;
  const testChannelId = `chan_qc_${uuidv4().substring(0, 8)}`;
  const testTopic = 'How Dopamine Affects Focus';

  const db = getDb();
  const now = new Date().toISOString();

  // Create test channel with global visual style
  db.prepare(`
    INSERT OR IGNORE INTO channels (id, user_id, name, niche, language, voice, target_duration_minutes, visual_style, subtitle_style, intro_style, outro_cta, publishing_platform, content_rules, created_at, updated_at)
    VALUES (?, ?, 'Mind Science', 'Neuroscience & Psychology', 'en', 'en-US-ChristopherNeural', 1, 'Cinematic Documentary', 'Modern Clean White', 'High-Impact Hook', 'Subscribe for more breakdowns', 'YouTube', 'High retention mobile pacing', ?, ?)
  `).run(testChannelId, DEFAULT_USER_ID, now, now);

  // Create test project
  db.prepare(`
    INSERT OR IGNORE INTO content_projects (id, user_id, channel_id, topic, target_length_minutes, preset, language, platform, status, current_stage, created_at, updated_at)
    VALUES (?, ?, ?, ?, 1, 'SHORTS', 'en', 'YouTube', 'PENDING', 'SCRIPT', ?, ?)
  `).run(testProjectId, DEFAULT_USER_ID, testChannelId, testTopic, now, now);

  try {
    // -----------------------------------------------------------------------
    // Test 1: Global Visual Style Configuration & Presets
    // -----------------------------------------------------------------------
    console.log('▶ Test 1: Global Visual Style Configuration & Presets');
    await test('Resolves built-in style presets and custom visual styles correctly', () => {
      const defaultStyle = resolveGlobalVisualStyle();
      assert.strictEqual(defaultStyle.id, 'cinematic-documentary', 'Default style should be cinematic-documentary');
      assert(defaultStyle.dna.renderStyle.includes('cinematic'), 'Render style must contain cinematic DNA');
      assert(defaultStyle.dna.lighting.includes('lighting'), 'Lighting DNA must be specified');
      assert(defaultStyle.dna.cameraSpecs.includes('9:16'), 'Camera specs must enforce 9:16 vertical composition');

      // Test preset resolution
      const moodyStyle = resolveGlobalVisualStyle('moody-dark-cinematic');
      assert.strictEqual(moodyStyle.id, 'moody-dark-cinematic');

      const studioStyle = resolveGlobalVisualStyle('hyper-realistic-studio');
      assert.strictEqual(studioStyle.id, 'hyper-realistic-studio');

      // Test custom style resolution
      const custom = resolveGlobalVisualStyle('cyber-noir anime realistic fusion');
      assert.strictEqual(custom.id, 'custom-style');
      assert(custom.dna.renderStyle.includes('cyber-noir'), 'Custom style must preserve user parameters');
    });

    // -----------------------------------------------------------------------
    // Test 2: Global Visual Style Prompt Inheritance & Hook Cues
    // -----------------------------------------------------------------------
    console.log('▶ Test 2: Prompt Style Inheritance & Hook Cues');
    await test('Injects style DNA into scene prompts with 9:16 framing and hook emphasis', () => {
      const style = resolveGlobalVisualStyle('Cinematic Documentary');
      const basePrompt = 'Microscopic visualization of dopamine neurotransmitters firing across synaptic cleft';

      // Scene 1: Hook scene
      const hookPrompt = applyGlobalStyleToPrompt(basePrompt, style, {
        isHook: true,
        niche: 'Neuroscience',
        environment: 'Neural biological space',
        cameraMovement: 'Slow forward push-in',
      });

      assert(hookPrompt.includes('High-impact cinematic visual hook'), 'Hook scene must include hook cues');
      assert(hookPrompt.includes(style.dna.lighting), 'Prompt must inherit lighting DNA');
      assert(hookPrompt.includes(style.dna.cameraSpecs), 'Prompt must enforce 9:16 vertical camera specs');

      // Scene 2: Standard scene
      const regularPrompt = applyGlobalStyleToPrompt(basePrompt, style, {
        isHook: false,
        niche: 'Neuroscience',
      });
      assert(!regularPrompt.includes('High-impact cinematic visual hook'), 'Regular scenes should not force opening hook cue');
      assert(regularPrompt.includes(style.dna.colorPalette), 'Regular scenes must inherit color grade DNA');
    });

    // -----------------------------------------------------------------------
    // Test 3: Storyboard-to-Narration 1:1 Mapping
    // -----------------------------------------------------------------------
    console.log('▶ Test 3: Storyboard-to-Narration 1:1 Synchronized Mapping');
    await test('Generates storyboard scenes with non-overlapping narration segments inheriting global style', async () => {
      const { script } = await aiProvider.generateScript({
        channelName: 'Mind Science',
        niche: 'Neuroscience & Psychology',
        language: 'en',
        topic: testTopic,
        targetLengthMinutes: 1,
        visualStyle: 'Cinematic Documentary',
      });

      const scenes = await aiProvider.generateScenes({
        script,
        niche: 'Neuroscience & Psychology',
        language: 'en',
        targetLengthMinutes: 1,
        visualStyle: 'Cinematic Documentary',
      });

      assert(scenes.length >= 5, 'Must generate at least 5 scenes');

      // Scene 1 must correspond to script.hook
      assert.strictEqual(scenes[0].narration, script.hook, 'Scene 1 narration must match script hook');
      assert(scenes[0].visualPrompt.includes('High-impact'), 'Scene 1 visual prompt must have hook cues');

      // Scene 2 must correspond to script.introduction
      assert.strictEqual(scenes[1].narration, script.introduction, 'Scene 2 narration must match script introduction');

      // Every scene must inherit the global visual style
      const globalStyle = resolveGlobalVisualStyle('Cinematic Documentary');
      for (const scene of scenes) {
        assert(scene.visualPrompt.includes(globalStyle.dna.lighting), 'All scenes must inherit global style lighting');
        assert(scene.visualPrompt.includes('9:16'), 'All scenes must enforce 9:16 framing');
        assert(scene.estimatedDurationSec >= 4, 'Scene duration must be >= 4s');
      }
    });

    // -----------------------------------------------------------------------
    // Test 4: Video Quality Control (QC) — 8 Evaluation Criteria
    // -----------------------------------------------------------------------
    console.log('▶ Test 4: Video Quality Control (QC) 8 Validation Criteria');
    await test('Evaluates all 8 production criteria and passes compliant scene', async () => {
      const globalStyle = resolveGlobalVisualStyle('Cinematic Documentary');

      // Create a valid test clip file
      const clipKey = `clips/${testProjectId}/scene_1_clip_1.mp4`;
      const clipPath = storage.getFilePath(clipKey);
      const clipDir = path.dirname(clipPath);
      if (!fs.existsSync(clipDir)) fs.mkdirSync(clipDir, { recursive: true });

      // Generate a compliant 9:16 clip
      const realImg = 'C:/Users/Nabeel Abbas/.gemini/antigravity/brain/67a470fa-6862-40be-b8ba-5bb7f3a65b56/scene_1_dopamine_hook_1789853552203.jpg';
      if (fs.existsSync(realImg)) {
        const { execFile } = require('child_process');
        const util = require('util');
        const execFileAsync = util.promisify(execFile);
        const { getFfmpegPath } = require('../src/lib/providers/videoProvider');
        await execFileAsync(getFfmpegPath(), [
          '-y',
          '-loop', '1',
          '-i', realImg,
          '-an',
          '-vf', "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,zoompan=z='min(zoom+0.0008,1.12)':d=120:s=1080x1920:fps=30",
          '-r', '30',
          '-c:v', 'libx264',
          '-pix_fmt', 'yuv420p',
          '-preset', 'fast',
          '-t', '4',
          clipPath,
        ]);
      } else {
        await videoProvider.generateVideoClip({
          prompt: 'High-impact cinematic opening visual for brain dopamine receptors, cinematic lighting, 9:16 vertical',
          durationSec: 4,
          outputPath: clipPath,
          sceneIndex: 1,
          clipIndex: 1,
          niche: 'Neuroscience',
          visualStyle: 'Cinematic Documentary',
          cameraMovement: 'Slow forward dolly push-in',
          aspectRatio: '9:16',
          projectId: testProjectId,
        });
      }

      const report = await sceneQualityChecker.validateSceneClip({
        scene: {
          scene_index: 1,
          narration: 'Dopamine is the primary neurotransmitter controlling your focus and motivation.',
          visual_prompt: applyGlobalStyleToPrompt(
            'Microscopic visualization of dopamine neurotransmitters firing across synaptic cleft, dopamine receptors',
            globalStyle,
            { isHook: true, cameraMovement: 'Slow forward dolly push-in' }
          ),
          visual_subject: 'Dopamine neurotransmitters and synaptic receptors',
          camera_movement: 'Slow forward dolly push-in',
          estimated_duration_sec: 4,
        },
        clipPath,
        globalStyle,
        previousScene: null,
        attempt: 1,
      });

      assert(report, 'Quality report must be generated');
      assert.strictEqual(typeof report.overallScore, 'number', 'Overall score must be numeric');
      assert(report.overallScore >= 75, `Expected score >= 75, got ${report.overallScore}`);
      assert.strictEqual(report.passed, true, 'Compliant scene must pass Quality Control');

      // Check all 8 criteria exist in report
      assert(report.checks.visualMatchesNarration, 'Must check visualMatchesNarration');
      assert(report.checks.correctSubjectAndObjects, 'Must check correctSubjectAndObjects');
      assert(report.checks.noAiArtifactsOrDistortions, 'Must check noAiArtifactsOrDistortions');
      assert(report.checks.naturalLookingMotion, 'Must check naturalLookingMotion');
      assert(report.checks.correct916Framing, 'Must check correct916Framing');
      assert(report.checks.consistentVisualStyle, 'Must check consistentVisualStyle');
      assert(report.checks.sceneDifferentiation, 'Must check sceneDifferentiation');
      assert(report.checks.strongVisualHook, 'Must check strongVisualHook');

      assert.strictEqual(report.checks.correct916Framing.passed, true, '9:16 framing check must pass');
      assert.strictEqual(report.checks.naturalLookingMotion.passed, true, 'Natural motion check must pass');
    });

    // -----------------------------------------------------------------------
    // Test 5: Automated Per-Scene Self-Healing & Prompt Adjustment
    // -----------------------------------------------------------------------
    console.log('▶ Test 5: Automated Per-Scene Self-Healing & Prompt Refinement');
    await test('Detects deficient scene, flags failure, and generates targeted prompt adjustments', async () => {
      const globalStyle = resolveGlobalVisualStyle('Cinematic Documentary');

      // Simulate a deficient scene (chaotic motion, missing subject, horizontal prompt)
      const deficientScene = {
        scene_index: 2,
        narration: 'When dopamine surges, your prefrontal cortex enters deep flow state.',
        visual_prompt: 'erratic shaky camera, blurry mutated elements, abstract shapes, 16:9 widescreen letterbox',
        visual_subject: '',
        camera_movement: 'erratic shaky jump cuts',
        estimated_duration_sec: 4,
      };

      const report = await sceneQualityChecker.validateSceneClip({
        scene: deficientScene,
        clipPath: 'non_existent_file.mp4',
        globalStyle,
        previousScene: {
          scene_index: 1,
          visual_prompt: 'erratic shaky camera, blurry mutated elements, abstract shapes, 16:9 widescreen letterbox', // duplicate prompt
        },
        attempt: 1,
      });

      assert.strictEqual(report.passed, false, 'Deficient scene must fail Quality Control');
      assert(report.failedChecks.length > 0, 'Must identify failed checks');
      assert(report.retryPromptAdjustment, 'Must generate retryPromptAdjustment');

      console.log(`     Identified failed checks: ${report.failedChecks.join(', ')}`);
      console.log(`     Generated prompt adjustment: ${report.retryPromptAdjustment}`);

      // Verify prompt adjustment includes corrective instructions
      assert(
        report.retryPromptAdjustment.includes('9:16') ||
        report.retryPromptAdjustment.includes('vertical') ||
        report.retryPromptAdjustment.includes('smooth') ||
        report.retryPromptAdjustment.includes('precision'),
        'Retry adjustment must contain corrective guidance'
      );
    });

    // -----------------------------------------------------------------------
    // Test 6: Pipeline Execution Order
    // -----------------------------------------------------------------------
    console.log('▶ Test 6: Updated Pipeline Execution Order');
    await test('Enforces Topic → Script → Storyboard → Video (QC Loop) → Voiceover → Captions → Final Composition order', () => {
      const expectedOrder = [
        'SCRIPT',
        'SCENES',
        'VIDEO',
        'VOICE',
        'SUBTITLES',
        'FINAL_VIDEO',
        'THUMBNAIL',
      ];

      assert.deepStrictEqual(PIPELINE_STAGES, expectedOrder, 'PIPELINE_STAGES must match required execution order');
      const scenesIdx = PIPELINE_STAGES.indexOf('SCENES');
      const videoIdx = PIPELINE_STAGES.indexOf('VIDEO');
      const voiceIdx = PIPELINE_STAGES.indexOf('VOICE');

      assert(scenesIdx < videoIdx, 'Storyboard (SCENES) must precede VIDEO generation');
      assert(videoIdx < voiceIdx, 'VIDEO (with QC loop) must precede final VOICE / composition');
    });

  } finally {
    // Cleanup test records
    try {
      db.prepare('DELETE FROM content_projects WHERE id = ?').run(testProjectId);
      db.prepare('DELETE FROM channels WHERE id = ?').run(testChannelId);
      db.prepare('DELETE FROM video_scenes WHERE project_id = ?').run(testProjectId);
      db.prepare('DELETE FROM generated_assets WHERE project_id = ?').run(testProjectId);
    } catch {}
  }

  console.log('\n========================================');
  console.log(`Results: ${testsPassed} passed, ${testsFailed} failed`);
  console.log('========================================\n');

  if (testsFailed > 0) {
    throw new Error(`${testsFailed} test(s) failed in Video Quality Control suite`);
  }
}

runQualityControlTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
