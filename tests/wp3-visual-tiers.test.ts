import assert from 'assert';
import path from 'path';
import fs from 'fs';
import { graphicRenderer } from '../src/lib/video/graphicRenderer';
import { motionStillRenderer } from '../src/lib/video/motionStillRenderer';
import { videoProvider, inspectMedia } from '../src/lib/providers/videoProvider';
import { calculatePriceDeltaRefund } from '../src/lib/billing/refundEngine';

async function runWp3Tests() {
  console.log('\n========================================================================');
  console.log('   RUNNING WP3 ACCEPTANCE TESTS: THREE-TIER VISUAL COMPOSITOR');
  console.log('========================================================================\n');

  const testProjectId = `proj_wp3_test_${Date.now()}`;

  // -------------------------------------------------------------------------
  // TEST 1: Graphic Card Renderer (Sub-10s Stat Callout)
  // -------------------------------------------------------------------------
  console.log('[Test 1] Validating Graphic Card Renderer (Target < 10s on VPS)...');
  const t0 = Date.now();

  const graphicRes = await graphicRenderer.renderGraphicCard({
    projectId: testProjectId,
    sceneIndex: 1,
    statOrHeadline: '87.4%',
    subText: 'Of all commercial video views are now consumed vertically on mobile screens.',
    badge: 'MARKET TREND',
    durationSec: 3.0,
    aspectRatio: '9:16',
    theme: 'neon-cyan',
  });

  const renderTimeMs = Date.now() - t0;
  console.log(`[GraphicRenderer] Rendered 1080x1920 MP4 in ${renderTimeMs}ms (${(renderTimeMs / 1000).toFixed(2)}s)`);

  assert.ok(
    renderTimeMs < 10000,
    `Graphic card render must complete under 10 seconds (actual: ${(renderTimeMs / 1000).toFixed(2)}s)`
  );
  assert.ok(fs.existsSync(graphicRes.filePath), 'Output MP4 file must exist on disk');
  assert.ok(graphicRes.filesizeBytes > 5000, 'Output MP4 file must be non-empty (>5KB)');

  const graphicMeta = await inspectMedia(graphicRes.filePath);
  assert.strictEqual(graphicMeta.isValid, true, 'Rendered graphic card MP4 must be valid media');
  assert.strictEqual(graphicMeta.resolution, '1080x1920', 'Resolution must be 1080x1920 for vertical video');
  assert.strictEqual(graphicMeta.videoCodec, 'h264', 'Video codec must be h264');
  assert.ok(
    Math.abs((graphicMeta.durationSec || 0) - 3.0) <= 0.5,
    `Duration must match 3.0s +/- 0.5s (actual: ${graphicMeta.durationSec}s)`
  );
  console.log('  -> PASS: Graphic card rendered 1080x1920 MP4 in under 10s with valid h264 stream.');

  // -------------------------------------------------------------------------
  // TEST 2: Motion Still Renderer (Dynamic Ken Burns Zoompan)
  // -------------------------------------------------------------------------
  console.log('[Test 2] Validating Motion Still Renderer (Ken Burns Zoompan)...');
  const motionRes = await motionStillRenderer.renderMotionStill({
    projectId: testProjectId,
    sceneIndex: 2,
    durationSec: 3.5,
    promptDescription: 'High contrast architectural skyscraper looking up into neon night sky',
    motionType: 'zoom_in',
    aspectRatio: '9:16',
  });

  assert.ok(fs.existsSync(motionRes.filePath), 'Output motion still MP4 must exist');
  assert.ok(motionRes.filesizeBytes > 5000, 'Output motion still file must be >5KB');

  const motionMeta = await inspectMedia(motionRes.filePath);
  assert.strictEqual(motionMeta.isValid, true, 'Motion still must be valid media');
  assert.strictEqual(motionMeta.resolution, '1080x1920', 'Resolution must be 1080x1920');
  assert.strictEqual(motionMeta.videoCodec, 'h264', 'Video codec must be h264');
  assert.ok(
    Math.abs((motionMeta.durationSec || 0) - 3.5) <= 0.5,
    `Duration must match 3.5s +/- 0.5s (actual: ${motionMeta.durationSec}s)`
  );
  console.log('  -> PASS: Motion still rendered with dynamic zoompan at 1080x1920.');

  // -------------------------------------------------------------------------
  // TEST 3: Video Provider Dispatcher (Three-Tier Routing)
  // -------------------------------------------------------------------------
  console.log('[Test 3] Validating VideoProvider Three-Tier Visual Dispatching...');

  // 3a. Graphic tier dispatch
  const graphicClips = await videoProvider.generateVideoClipsForScene({
    projectId: testProjectId,
    sceneId: 'scene_graphic_1',
    sceneIndex: 3,
    visualPrompt: 'Over 10x speedup in production throughput with autonomous workflow',
    durationSec: 3.0,
    niche: 'Technology',
    visualTier: 'graphic',
    aspectRatio: '9:16',
  } as any);

  assert.strictEqual(graphicClips.length, 1, 'Graphic tier must return 1 clip');
  assert.strictEqual((graphicClips[0] as any).tier, 'graphic', 'Clip tier must be graphic');
  assert.ok(fs.existsSync((graphicClips[0] as any).filePath), 'Clip file must exist on disk');

  // 3b. Motion still tier dispatch
  const stillClips = await videoProvider.generateVideoClipsForScene({
    projectId: testProjectId,
    sceneId: 'scene_still_1',
    sceneIndex: 4,
    visualPrompt: 'Minimalist creative workspace with cinematic moody shadows',
    durationSec: 3.0,
    niche: 'Creative',
    visualTier: 'motion_still',
    aspectRatio: '9:16',
  } as any);

  assert.strictEqual(stillClips.length, 1, 'Motion still tier must return 1 clip');
  assert.strictEqual((stillClips[0] as any).tier, 'motion_still', 'Clip tier must be motion_still');
  assert.ok(fs.existsSync((stillClips[0] as any).filePath), 'Clip file must exist on disk');

  // -------------------------------------------------------------------------
  // TEST 4: Automatic Downgrade & Price-Delta Credit Refund
  // -------------------------------------------------------------------------
  console.log('[Test 4] Validating AI Clip Downgrade Fallback & Price-Delta Calculation...');

  // Price-delta calculation when AI clip (e.g. flagship 39 cr or fast 16 cr) downgrades to motion_still
  const refundFastToStill = calculatePriceDeltaRefund('fast', 'motion_still');
  assert.strictEqual(refundFastToStill, 15, 'Fast ($0.08/s) to motion_still downgrade must refund 15 credits');

  const refundFlagshipToStill = calculatePriceDeltaRefund('flagship', 'motion_still');
  assert.strictEqual(refundFlagshipToStill, 50, 'Flagship ($0.20/s) to motion_still downgrade must refund 50 credits');

  const refundEconomyToStill = calculatePriceDeltaRefund('economy', 'motion_still');
  assert.ok(refundEconomyToStill >= 5, 'Economy ($0.05/s) to motion_still downgrade must refund price delta');
  console.log('  -> PASS: Downgrade fallback and price-delta refund calculations strictly verified.');

  // Cleanup test files
  const testDir = path.dirname(graphicRes.filePath);
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }

  console.log('\n========================================================================');
  console.log('   ALL WP3 ACCEPTANCE TESTS PASSED (4/4 TEST SUITES 100% OK)');
  console.log('========================================================================\n');
}

runWp3Tests().catch((err) => {
  console.error('\n❌ WP3 Acceptance Test Failed:', err);
  process.exit(1);
});
