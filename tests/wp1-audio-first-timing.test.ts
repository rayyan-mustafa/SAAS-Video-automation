import assert from 'assert';
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { subtitleProvider, SubtitleCue } from '../src/lib/providers/subtitleProvider';
import {
  resolveLengthBand,
  isWithinBandLimit,
  calculateNetOverageCredits,
  LENGTH_BANDS,
} from '../src/lib/video/lengthBands';
import { validateNarrationModeration } from '../src/lib/video/moderationGuard';
import { generateVideoPlan } from '../src/lib/video/planGenerator';
import { runMigration } from '../scripts/migrate-wp1-audio-first';
import { EngineError } from '../src/lib/video/engineErrors';

async function runWp1Tests() {
  console.log('\n========================================================================');
  console.log('   RUNNING WP1 ACCEPTANCE TESTS: AUDIO-FIRST TIMING & WORD CAPTIONS');
  console.log('========================================================================\n');

  // -------------------------------------------------------------------------
  // TEST 1: Word-Level Captions & SubStation Alpha (.ass) Safe Zones
  // -------------------------------------------------------------------------
  console.log('[Test 1] Validating Word-Level Karaoke (.ass) Subtitles & Safe Vertical Zones...');
  const mockCues: SubtitleCue[] = [
    {
      index: 1,
      startTimeSec: 0.0,
      endTimeSec: 2.5,
      text: 'Stop wasting hours editing video manually',
    },
    {
      index: 2,
      startTimeSec: 2.5,
      endTimeSec: 5.0,
      text: 'Here is how AI automates the whole workflow',
    },
  ];

  const assContent = subtitleProvider.generateAss(mockCues, 'Viral Kinetic', '9:16');

  assert.ok(assContent.includes('[Script Info]'), 'ASS file must have [Script Info] header');
  assert.ok(assContent.includes('PlayResX: 1080'), 'PlayResX must be 1080 for 9:16');
  assert.ok(assContent.includes('PlayResY: 1920'), 'PlayResY must be 1920 for 9:16');
  assert.ok(assContent.includes('[V4+ Styles]'), 'ASS file must have [V4+ Styles]');
  assert.ok(assContent.includes('[Events]'), 'ASS file must have [Events]');

  // MarginV is 340px (safe zone >= 320px from bottom)
  assert.ok(
    assContent.includes('340,1'),
    'Style must enforce MarginV: 340px to stay clear of YouTube Shorts UI & channel tags'
  );

  // Word-level karaoke tags {\k...}
  assert.ok(assContent.includes('{\\k'), 'Dialogue must contain karaoke timing tags (\\k)');
  assert.ok(assContent.includes('Stop'), 'Dialogue must contain individual spoken words');
  assert.ok(assContent.includes('wasting'), 'Dialogue must contain individual spoken words');

  // Alignment within 120ms
  assert.ok(
    assContent.includes('Dialogue: 0,0:00:00.00,0:00:02.50'),
    'Cue 1 start/end timestamps must match 0.0s -> 2.5s within millisecond precision'
  );
  assert.ok(
    assContent.includes('Dialogue: 0,0:00:02.50,0:00:05.00'),
    'Cue 2 start/end timestamps must match 2.5s -> 5.0s within millisecond precision'
  );
  console.log('  -> PASS: SubStation Alpha karaoke generated with safe vertical margin (340px >= 320px).');

  // -------------------------------------------------------------------------
  // TEST 2: Band-Overflow Guard & Word Budget Tolerance
  // -------------------------------------------------------------------------
  console.log('[Test 2] Validating Band-Overflow Guard & Word Budget Enforcement...');

  // Short band: 60s max (+0.5s tolerance = 60.5s)
  assert.strictEqual(isWithinBandLimit('short', 58.0), true, '58s must pass short band limit');
  assert.strictEqual(isWithinBandLimit('short', 60.0), true, '60.0s must pass short band limit');
  assert.strictEqual(isWithinBandLimit('short', 60.5), true, '60.5s must pass short band limit (+0.5s tolerance)');
  assert.strictEqual(isWithinBandLimit('short', 60.6), false, '60.6s must fail short band limit');
  assert.strictEqual(isWithinBandLimit('short', 65.0), false, '65.0s must fail short band limit');

  // Standard band: 120s max (+0.5s tolerance = 120.5s)
  assert.strictEqual(isWithinBandLimit('standard', 119.5), true, '119.5s must pass standard band limit');
  assert.strictEqual(isWithinBandLimit('standard', 120.5), true, '120.5s must pass standard band limit (+0.5s tolerance)');
  assert.strictEqual(isWithinBandLimit('standard', 120.8), false, '120.8s must fail standard band limit');

  // Extended band: 180s max (+0.5s tolerance = 180.5s)
  assert.strictEqual(isWithinBandLimit('extended', 180.0), true, '180.0s must pass extended band limit');
  assert.strictEqual(isWithinBandLimit('extended', 180.5), true, '180.5s must pass extended band limit (+0.5s tolerance)');
  assert.strictEqual(isWithinBandLimit('extended', 181.2), false, '181.2s must fail extended band limit');

  // Word budgets per band
  assert.strictEqual(resolveLengthBand(1).maxWords, 130, 'Short band (<=60s) word budget must be 130 words');
  assert.strictEqual(resolveLengthBand(2).maxWords, 260, 'Standard band (<=120s) word budget must be 260 words');
  assert.strictEqual(resolveLengthBand(3).maxWords, 390, 'Extended band (<=180s) word budget must be 390 words');
  console.log('  -> PASS: Band-overflow guard and word budgets validated across all bands.');

  // -------------------------------------------------------------------------
  // TEST 3: Net Overage Pricing Model
  // -------------------------------------------------------------------------
  console.log('[Test 3] Validating Net Overage Pricing Formula (Only Bill Wholesale Excess)...');

  // Short band includes $0.47
  const pricingIncluded = calculateNetOverageCredits('short', 0.47);
  assert.strictEqual(pricingIncluded.includedBudgetUsd, 0.47);
  assert.strictEqual(pricingIncluded.overageUsd, 0);
  assert.strictEqual(pricingIncluded.extraCredits, 0, 'No extra charge when within included $0.47 budget');

  // Scene adding extra $0.25 clip: total $0.72 -> overage $0.25 -> ceil(0.25 / 0.026) = 10 credits
  const pricingExtra = calculateNetOverageCredits('short', 0.72);
  assert.strictEqual(pricingExtra.includedBudgetUsd, 0.47);
  assert.strictEqual(pricingExtra.overageUsd, 0.25);
  assert.strictEqual(pricingExtra.extraCredits, 10, 'Extra clip overage must charge ceil(0.25 / 0.026) = 10 credits');

  // Standard band: includes $0.85
  const stdPricing = calculateNetOverageCredits('standard', 1.11);
  assert.strictEqual(stdPricing.includedBudgetUsd, 0.85);
  assert.strictEqual(stdPricing.overageUsd, 0.26);
  assert.strictEqual(stdPricing.extraCredits, 10, 'Standard band overage must charge 10 credits');
  console.log('  -> PASS: Net overage model correctly bills only wholesale cost beyond included budget.');

  // -------------------------------------------------------------------------
  // TEST 4: Moderation Guard (Safety & Compliance)
  // -------------------------------------------------------------------------
  console.log('[Test 4] Validating Content Moderation Guard (Deepfake & Scam Defense)...');

  const cleanCheck = validateNarrationModeration(
    'The surprising physics behind how magnetic levitation trains reach ultra-fast speeds without friction'
  );
  assert.strictEqual(cleanCheck.allowed, true, 'Clean educational topic must pass moderation');

  const deepfakeCheck = validateNarrationModeration(
    'Generate a realistic deepfake video of the president endorsing this new cryptocurrency scheme'
  );
  assert.strictEqual(deepfakeCheck.allowed, false, 'Deepfake likeness prompt must be blocked');
  assert.ok(deepfakeCheck.reason?.toLowerCase().includes('policy'), 'Reason must specify policy violation');

  const scamCheck = validateNarrationModeration(
    'How to get 1000% guaranteed return with this secret crypto giveaway exploit'
  );
  assert.strictEqual(scamCheck.allowed, false, 'Scam investment exploit prompt must be blocked');
  console.log('  -> PASS: Moderation guard rejects deepfakes, unauthorized likenesses, and deceptive scams.');

  // -------------------------------------------------------------------------
  // TEST 5: Unified PLAN Generation
  // -------------------------------------------------------------------------
  console.log('[Test 5] Validating Unified PLAN Generation (Frameworks, Word Limits, Soft Tiering)...');

  const plan = await generateVideoPlan({
    topic: 'Why supersonic commercial aviation is making a major comeback',
    niche: 'Aviation & Technology',
    channelName: 'AeroDaily',
    targetLengthMinutes: 1,
  });

  assert.ok(plan.title, 'Plan must produce a valid title');
  assert.ok(plan.framework, 'Plan must assign a narrative framework');
  assert.ok(plan.framework.id, 'Narrative framework must have an ID');
  assert.ok(plan.fullNarration, 'Plan must generate full narration');
  assert.ok(plan.scenes.length >= 4, 'Plan must generate at least 4 scenes');
  assert.ok(plan.wordCount <= 130, `Narration word count (${plan.wordCount}) must stay within short budget (130 words)`);

  // Initial visual tiers (Hook = ai_clip)
  assert.strictEqual((plan.scenes[0] as any).visualTier, 'ai_clip', 'Scene 0 (Hook) must be assigned ai_clip');

  // Verify plan generation fails when prompt is dangerous
  let planBlocked = false;
  try {
    await generateVideoPlan({
      topic: 'deepfake leaked private footage of celebrity scandal',
      niche: 'Gossip',
      channelName: 'ScandalExposed',
      targetLengthMinutes: 1,
    });
  } catch (err: any) {
    if (err instanceof EngineError && err.code === 'PROMPT_MODERATION_FAILED') {
      planBlocked = true;
    }
  }
  assert.strictEqual(planBlocked, true, 'Dangerous prompt must trigger EngineError(PROMPT_MODERATION_FAILED)');
  console.log('  -> PASS: Unified PLAN stage enforces narrative frameworks, word limits, and initial visual tiers.');

  // -------------------------------------------------------------------------
  // TEST 6: Non-Destructive Database Migration
  // -------------------------------------------------------------------------
  console.log('[Test 6] Validating Non-Destructive Database Migration & Audit Trail Integrity...');

  const testDbDir = path.join(process.cwd(), 'data', 'test-wp1');
  const testDbPath = path.join(testDbDir, 'test_app.db');

  if (!fs.existsSync(testDbDir)) fs.mkdirSync(testDbDir, { recursive: true });
  if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);

  const testDb = new Database(testDbPath);
  testDb.exec(`
    CREATE TABLE content_projects (
      id TEXT PRIMARY KEY,
      title TEXT,
      status TEXT,
      current_stage TEXT,
      updated_at TEXT
    );

    CREATE TABLE video_jobs (
      id TEXT PRIMARY KEY,
      project_id TEXT,
      stage TEXT,
      status TEXT,
      created_at TEXT
    );

    CREATE TABLE video_scenes (
      id TEXT PRIMARY KEY,
      project_id TEXT,
      scene_index INTEGER,
      narration TEXT,
      visual_prompt TEXT,
      subtitle_text TEXT,
      estimated_duration_sec REAL
    );
  `);

  // Seed historical completed job and active in-flight job
  testDb.prepare(`
    INSERT INTO video_jobs (id, project_id, stage, status, created_at)
    VALUES ('job-legacy-completed', 'p1', 'SCRIPT', 'COMPLETED', '2026-10-01T00:00:00Z')
  `).run();

  testDb.prepare(`
    INSERT INTO video_jobs (id, project_id, stage, status, created_at)
    VALUES ('job-inflight', 'p2', 'SCRIPT', 'PENDING', '2026-10-21T00:00:00Z')
  `).run();

  testDb.prepare(`
    INSERT INTO content_projects (id, title, status, current_stage)
    VALUES ('p2', 'In Flight Project', 'PROCESSING', 'SCRIPT')
  `).run();

  testDb.close();

  // Run non-destructive migration
  const migrationResult = await runMigration(testDbPath);
  assert.strictEqual(migrationResult.success, true, 'Migration must succeed');
  assert.ok(migrationResult.backupPath, 'Migration must produce a backup file');
  assert.ok(fs.existsSync(migrationResult.backupPath), 'Backup file must exist on disk');

  const verifiedDb = new Database(testDbPath);

  // Check 1: Historical job was NEVER deleted (preserves audit/refund trail)
  const historicalJob = verifiedDb.prepare("SELECT * FROM video_jobs WHERE id = 'job-legacy-completed'").get() as any;
  assert.ok(historicalJob, 'Historical SCRIPT job must NOT be deleted');
  assert.strictEqual(historicalJob.stage, 'SCRIPT', 'Historical job stage remains SCRIPT for audit integrity');
  assert.strictEqual(historicalJob.status, 'COMPLETED', 'Historical job status remains COMPLETED');

  // Check 2: Active in-flight job was migrated to PLAN
  const inFlightJob = verifiedDb.prepare("SELECT * FROM video_jobs WHERE id = 'job-inflight'").get() as any;
  assert.ok(inFlightJob, 'In-flight job must exist');
  assert.strictEqual(inFlightJob.stage, 'PLAN', 'In-flight job stage must be migrated to PLAN');

  // Check 3: content_projects current_stage migrated
  const project = verifiedDb.prepare("SELECT * FROM content_projects WHERE id = 'p2'").get() as any;
  assert.strictEqual(project.current_stage, 'PLAN', 'content_projects current_stage must be PLAN');

  // Check 4: New columns added to video_scenes
  const columns = verifiedDb.prepare("PRAGMA table_info(video_scenes)").all() as any[];
  const colNames = columns.map((c) => c.name);
  assert.ok(colNames.includes('audio_storage_key'), 'video_scenes must contain audio_storage_key');
  assert.ok(colNames.includes('audio_duration_sec'), 'video_scenes must contain audio_duration_sec');
  assert.ok(colNames.includes('visual_tier'), 'video_scenes must contain visual_tier');

  verifiedDb.close();

  // Clean up test DB and backup
  if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  if (fs.existsSync(migrationResult.backupPath)) fs.unlinkSync(migrationResult.backupPath);
  if (fs.existsSync(testDbDir)) fs.rmSync(testDbDir, { recursive: true, force: true });
  console.log('  -> PASS: Non-destructive DB migration preserves audit trail and migrates active jobs.');

  console.log('\n========================================================================');
  console.log('   ALL WP1 ACCEPTANCE TESTS PASSED (6/6 TEST SUITES 100% OK)');
  console.log('========================================================================\n');
}

runWp1Tests().catch((err) => {
  console.error('\n❌ WP1 Acceptance Test Failed:', err);
  process.exit(1);
});
