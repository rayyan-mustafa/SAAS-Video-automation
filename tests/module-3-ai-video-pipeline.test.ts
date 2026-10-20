import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { videoProvider, inspectMedia, getFfmpegPath } from '../src/lib/providers/videoProvider';
import { falVideoProvider } from '../src/lib/providers/falVideoProvider';
import { cloudflareVideoProvider } from '../src/lib/providers/cloudflareVideoProvider';
import { veoVideoProvider } from '../src/lib/providers/veoVideoProvider';

async function runModule3Tests() {
  console.log('\n======================================================');
  console.log('   RUNNING MODULE 3 TESTS: AI VIDEO PIPELINE ENGINE');
  console.log('======================================================\n');

  // Test 1: Provider interface verification
  console.log('[Test 1] Verifying AI Video Providers Configuration API...');
  assert.strictEqual(typeof falVideoProvider.isConfigured, 'function');
  assert.strictEqual(typeof cloudflareVideoProvider.isConfigured, 'function');
  assert.strictEqual(typeof veoVideoProvider.isConfigured, 'function');
  console.log(`✓ FAL.ai configured: ${falVideoProvider.isConfigured()}`);
  console.log(`✓ Cloudflare MiniMax configured: ${cloudflareVideoProvider.isConfigured()}`);
  console.log(`✓ Google Veo 3.1 configured: ${veoVideoProvider.isConfigured()}`);

  // Test 2: FFmpeg installation and binary check
  console.log('[Test 2] Verifying FFmpeg engine availability...');
  const ffmpegPath = getFfmpegPath();
  assert(typeof ffmpegPath === 'string' && ffmpegPath.length > 0, 'FFmpeg binary path must be resolved');
  console.log(`✓ FFmpeg binary available at: ${ffmpegPath}`);

  // Test 3: Generate and Validate Real Scene Video Clip (9:16 Vertical Short)
  console.log('[Test 3] Rendering 3-second test clip through tiered videoProvider...');
  const testOutputDir = path.join(process.cwd(), 'data', 'test-output');
  if (!fs.existsSync(testOutputDir)) {
    fs.mkdirSync(testOutputDir, { recursive: true });
  }

  const testClipPath = path.join(testOutputDir, `test_scene_clip_${Date.now()}.mp4`);

  await videoProvider.generateVideoClip({
    prompt: 'Futuristic AI neural network computing data streams in dark cyberpunk server room',
    durationSec: 3,
    outputPath: testClipPath,
    sceneIndex: 1,
    clipIndex: 1,
    niche: 'AI & Technology',
    visualStyle: 'Cinematic Cyberpunk High-Contrast',
    aspectRatio: '9:16',
    cameraMovement: 'slow dramatic push-in',
  });

  assert(fs.existsSync(testClipPath), 'Generated video clip must exist on disk');
  const stats = fs.statSync(testClipPath);
  assert(stats.size > 10000, `Video file size (${stats.size} bytes) must be substantial and not empty`);
  console.log(`✓ Generated video clip size: ${(stats.size / 1024).toFixed(1)} KB`);

  // Test 4: Inspect Media Quality & Resolution
  console.log('[Test 4] Inspecting rendered media metadata with inspectMedia()...');
  const mediaMeta = await inspectMedia(testClipPath);
  assert.strictEqual(mediaMeta.isValid, true, 'Rendered clip must be a valid playable video');
  assert(mediaMeta.durationSec >= 2.5, `Duration must be ~3s (got ${mediaMeta.durationSec}s)`);
  assert(mediaMeta.resolution?.includes('1080x1920'), `Resolution must be 1080x1920 (got ${mediaMeta.resolution})`);
  assert.strictEqual(mediaMeta.videoCodec?.toLowerCase().includes('h264'), true, 'Codec must be H.264');
  console.log(`✓ Validated video: Duration=${mediaMeta.durationSec}s, Resolution=${mediaMeta.resolution}, Codec=${mediaMeta.videoCodec}`);

  // Clean up test file
  try {
    fs.unlinkSync(testClipPath);
  } catch {}

  console.log('\n======================================================');
  console.log('   🎉 ALL MODULE 3 TESTS PASSED SUCCESSFULLY!');
  console.log('======================================================\n');
}

runModule3Tests().catch((err) => {
  console.error('Module 3 test failed:', err);
  process.exit(1);
});
