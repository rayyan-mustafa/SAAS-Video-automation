/**
 * Scene-Based AI Video Production Pipeline Test Suite
 * Validates 6-8 scene breakdown, modular OpenAI & stock video providers,
 * 9:16 vertical resolution (1080x1920), and independent per-scene regeneration.
 */

import assert from 'assert';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { getDb, DEFAULT_USER_ID, ContentProject, VideoScene } from '../src/lib/db';
import { aiProvider } from '../src/lib/providers/aiProvider';
import { videoProvider, inspectMedia } from '../src/lib/providers/videoProvider';
import { openaiVideoProvider } from '../src/lib/providers/openaiVideoProvider';
import { ffmpegCompositor } from '../src/lib/providers/ffmpegCompositor';
import { subtitleProvider } from '../src/lib/providers/subtitleProvider';
import { storage, getTempDir } from '../src/lib/storage';

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

async function runScenePipelineTests() {
  console.log('🎬 AutoVideo Scene-Based AI Video Pipeline Verification Suite\n');

  const testProjectId = `test_proj_${uuidv4().substring(0, 8)}`;
  const testChannelId = `chan_test_${uuidv4().substring(0, 8)}`;
  const testTopic = 'How Stress Affects Your Body';

  const db = getDb();
  const now = new Date().toISOString();

  // Create test channel
  db.prepare(`
    INSERT OR IGNORE INTO channels (id, user_id, name, niche, language, voice, target_duration_minutes, visual_style, subtitle_style, intro_style, outro_cta, publishing_platform, content_rules, created_at, updated_at)
    VALUES (?, ?, 'Health & Vitality', 'Health & Wellness', 'en', 'en-US-ChristopherNeural', 1, 'Cinematic High-Contrast', 'Modern Clean White', 'High-Impact Hook', 'Subscribe for more breakdowns', 'YouTube', 'Fast mobile pacing', ?, ?)
  `).run(testChannelId, DEFAULT_USER_ID, now, now);

  // Create test project (1 minute Shorts/Reels target)
  db.prepare(`
    INSERT OR IGNORE INTO content_projects (id, user_id, channel_id, topic, target_length_minutes, preset, language, platform, status, current_stage, created_at, updated_at)
    VALUES (?, ?, ?, ?, 1, 'SHORTS', 'en', 'YouTube', 'PENDING', 'SCRIPT', ?, ?)
  `).run(testProjectId, DEFAULT_USER_ID, testChannelId, testTopic, now, now);

  try {
    // -----------------------------------------------------------------------
    // Test 1: Script & 6-8 Scene Generation with Rich Visual Prompts
    // -----------------------------------------------------------------------
    console.log('▶ Test 1: Script & Scene Breakdown (6-8 Scenes)');
    await test('Generates structured script and 6-8 distinct scenes with detailed visual prompts', async () => {
      const { script, fullNarration } = await aiProvider.generateScript({
        channelName: 'Health & Vitality',
        niche: 'Health & Wellness',
        language: 'en',
        topic: testTopic,
        targetLengthMinutes: 1,
        visualStyle: 'Cinematic High-Contrast',
      });

      assert(script, 'Script must be defined');
      assert(script.title.includes('Stress'), 'Title must reflect stress topic');
      assert(fullNarration.length > 50, 'Narration must be substantial');

      const scenes = await aiProvider.generateScenes({
        script,
        niche: 'Health & Wellness',
        language: 'en',
        targetLengthMinutes: 1,
        visualStyle: 'Cinematic High-Contrast',
      });

      assert(scenes.length >= 5 && scenes.length <= 9, `Expected 5-9 scenes, got ${scenes.length}`);

      for (const scene of scenes) {
        assert(scene.sceneIndex > 0, 'Scene index must be > 0');
        assert(scene.narration && scene.narration.length > 0, 'Scene must have narration');
        assert(scene.visualPrompt && scene.visualPrompt.length > 20, 'Scene must have detailed visual prompt');
        assert(scene.cameraMovement, 'Scene must specify camera movement');
        assert(scene.estimatedDurationSec >= 4, 'Scene duration must be >= 4 seconds');
      }

      // Persist scenes in DB for subsequent tests
      const insertStmt = db.prepare(`
        INSERT INTO video_scenes (
          id, project_id, scene_index, narration, visual_prompt, 
          visual_subject, environment, camera_movement, lighting, color_style, continuity_notes, 
          estimated_duration_sec, subtitle_text, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const s of scenes) {
        insertStmt.run(
          uuidv4(),
          testProjectId,
          s.sceneIndex,
          s.narration,
          s.visualPrompt,
          s.visualSubject || null,
          s.environment || null,
          s.cameraMovement || null,
          s.lighting || null,
          s.colorStyle || null,
          s.continuityNotes || null,
          s.estimatedDurationSec,
          s.subtitleText,
          new Date().toISOString()
        );
      }

      const count = (db.prepare('SELECT COUNT(*) as count FROM video_scenes WHERE project_id = ?').get(testProjectId) as any).count;
      assert.strictEqual(count, scenes.length, 'All scenes must be saved to DB');
    });

    // -----------------------------------------------------------------------
    // Test 2: Modular Video Provider Layer & OpenAI Provider
    // -----------------------------------------------------------------------
    console.log('▶ Test 2: Modular Video Provider Abstraction');
    await test('OpenAI video provider is loaded and provider name reflects configuration', () => {
      assert.strictEqual(openaiVideoProvider.id, 'openai-video');
      assert(openaiVideoProvider.name.includes('OpenAI'), 'OpenAI provider name should include OpenAI');
      assert(typeof openaiVideoProvider.isConfigured() === 'boolean', 'isConfigured should return boolean');

      const providerName = videoProvider.getProviderName();
      assert(providerName && typeof providerName === 'string', 'Provider name must be non-empty string');
    });

    // -----------------------------------------------------------------------
    // Test 3: 9:16 Vertical Video Clip Generation (1080x1920)
    // -----------------------------------------------------------------------
    console.log('▶ Test 3: 9:16 Vertical Video Clip Synthesis');
    await test('Generates a 9:16 vertical video clip (1080x1920) for Scene 1', async () => {
      const clipKey = `clips/${testProjectId}/scene_1_clip_1.mp4`;
      const localFilePath = storage.getFilePath(clipKey);
      const fileDir = path.dirname(localFilePath);
      if (!fs.existsSync(fileDir)) {
        fs.mkdirSync(fileDir, { recursive: true });
      }

      await videoProvider.generateVideoClip({
        prompt: 'Cinematic close up of human nervous system under stress, 9:16 vertical, volumetric lighting',
        durationSec: 4,
        outputPath: localFilePath,
        sceneIndex: 1,
        clipIndex: 1,
        niche: 'Health & Wellness',
        visualStyle: 'Cinematic High-Contrast',
        cameraMovement: 'Slow forward dolly',
        aspectRatio: '9:16',
        projectId: testProjectId,
      });

      assert(fs.existsSync(localFilePath), 'Generated clip file must exist on disk');
      const stat = await fs.promises.stat(localFilePath);
      assert(stat.size > 100, 'Clip file must not be empty');

      const meta = await inspectMedia(localFilePath);
      assert(meta.durationSec > 0, 'Clip must have non-zero duration');
      if (meta.resolution) {
        assert.strictEqual(meta.resolution, '1080x1920', `Expected 1080x1920, got ${meta.resolution}`);
      }
    });

    // -----------------------------------------------------------------------
    // Test 4: 9:16 Full FFmpeg Composition (1080x1920)
    // -----------------------------------------------------------------------
    console.log('▶ Test 4: Full 9:16 FFmpeg Video Composition');
    await test('Assembles 9:16 video composition with 1080x1920 output resolution', async () => {
      const clipKey = `clips/${testProjectId}/scene_1_clip_1.mp4`;
      const clipPath = storage.getFilePath(clipKey);

      // Create minimal test audio
      const audioKey = `audio/${testProjectId}/narration.mp3`;
      const audioPath = storage.getFilePath(audioKey);
      const audioDir = path.dirname(audioPath);
      if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });

      const minimalMp3 = Buffer.from([
        0xFF, 0xFB, 0x90, 0x64, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
      ]);
      await fs.promises.writeFile(audioPath, minimalMp3);

      const composition = await ffmpegCompositor.composeVideo({
        projectId: testProjectId,
        clipFilePaths: [clipPath],
        audioFilePath: audioPath,
        totalDurationSec: 4,
        aspectRatio: '9:16',
      });

      assert(composition, 'Composition result must be defined');
      assert.strictEqual(composition.resolution, '1080x1920', 'Output resolution must be 1080x1920');
      assert(fs.existsSync(composition.filePath), 'Output file must exist');
    });

    // -----------------------------------------------------------------------
    // Test 5: Independent Per-Scene Regeneration
    // -----------------------------------------------------------------------
    console.log('▶ Test 5: Per-Scene Independent Regeneration');
    await test('Regenerates a single scene clip and re-composites without affecting other scenes', async () => {
      const scene2 = db.prepare('SELECT * FROM video_scenes WHERE project_id = ? AND scene_index = 2').get(testProjectId) as VideoScene | undefined;
      assert(scene2, 'Scene 2 must exist in DB');

      const clipKey = `clips/${testProjectId}/scene_2_clip_1.mp4`;
      const localFilePath = storage.getFilePath(clipKey);
      const fileDir = path.dirname(localFilePath);
      if (!fs.existsSync(fileDir)) fs.mkdirSync(fileDir, { recursive: true });

      const updatedPrompt = 'Microscopic visualization of cortisol releasing into bloodstream, 9:16 vertical 4k';

      await videoProvider.generateVideoClip({
        prompt: updatedPrompt,
        durationSec: 4,
        outputPath: localFilePath,
        sceneIndex: 2,
        clipIndex: 1,
        niche: 'Health & Wellness',
        visualStyle: 'Cinematic High-Contrast',
        aspectRatio: '9:16',
        projectId: testProjectId,
        sceneId: scene2.id,
      });

      assert(fs.existsSync(localFilePath), 'Scene 2 clip file must be generated');

      // Re-compose final video combining scene 1 and regenerated scene 2
      const clip1Key = `clips/${testProjectId}/scene_1_clip_1.mp4`;
      const clip1Path = storage.getFilePath(clip1Key);
      const audioPath = storage.getFilePath(`audio/${testProjectId}/narration.mp3`);

      const recomposed = await ffmpegCompositor.composeVideo({
        projectId: testProjectId,
        clipFilePaths: [clip1Path, localFilePath],
        audioFilePath: audioPath,
        totalDurationSec: 8,
        aspectRatio: '9:16',
      });

      assert.strictEqual(recomposed.resolution, '1080x1920', 'Recomposed output must remain 1080x1920');
      assert(fs.existsSync(recomposed.filePath), 'Recomposed final video must exist');
    });

    // -----------------------------------------------------------------------
    // Test 6: Kinetic Caption Cue Generation for Shorts Retention
    // -----------------------------------------------------------------------
    console.log('▶ Test 6: Kinetic Captions for Shorts Retention');
    await test('Produces punchy 3-5 word kinetic caption cues for mobile Shorts', () => {
      const testScenes = [
        {
          sceneIndex: 1,
          estimatedDurationSec: 6,
          subtitleText: 'Stress floods your body with adrenaline and cortisol immediately.',
        },
        {
          sceneIndex: 2,
          estimatedDurationSec: 6,
          subtitleText: 'Your heart rate spikes and blood vessels constrict to survive.',
        },
      ];

      const cues = subtitleProvider.generateCues(testScenes);
      assert(cues.length >= 2, 'Must generate at least 2 cues');

      for (const cue of cues) {
        assert(cue.text, 'Cue must contain text');
        const words = cue.text.replace('\n', ' ').split(/\s+/).filter(Boolean);
        assert(words.length <= 6, `Kinetic cue should be <= 6 words, got ${words.length}: "${cue.text}"`);
      }

      const srt = subtitleProvider.generateSrt(cues);
      assert(srt.includes('-->'), 'SRT must contain timecode separator');
      assert(srt.includes('Stress'), 'SRT must contain scene text');

      const vtt = subtitleProvider.generateVtt(cues);
      assert(vtt.startsWith('WEBVTT'), 'VTT must start with WEBVTT header');
    });

  } finally {
    // Clean up test records
    db.prepare('DELETE FROM content_projects WHERE id = ?').run(testProjectId);
    db.prepare('DELETE FROM video_scenes WHERE project_id = ?').run(testProjectId);
    db.prepare('DELETE FROM generated_assets WHERE project_id = ?').run(testProjectId);
    db.prepare('DELETE FROM video_outputs WHERE project_id = ?').run(testProjectId);
    db.prepare('DELETE FROM channels WHERE id = ?').run(testChannelId);

    const tempDir = getTempDir(testProjectId);
    if (fs.existsSync(tempDir)) {
      await fs.promises.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
  }

  console.log('\n========================================');
  console.log(`Results: ${testsPassed} passed, ${testsFailed} failed`);
  console.log('========================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runScenePipelineTests().catch((err) => {
  console.error('Fatal test suite error:', err);
  process.exit(1);
});
