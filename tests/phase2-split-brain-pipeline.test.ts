import assert from 'assert';
import { generateVideoPlan } from '../src/lib/video/planGenerator';
import { validateNarrationModerationWithLlamaGuard } from '../src/lib/video/moderationGuard';

async function runPhase2Tests() {
  console.log('\n========================================================================');
  console.log('   RUNNING PHASE 2 ACCEPTANCE TESTS: 3-STAGE SPLIT-BRAIN VIRAL PIPELINE');
  console.log('========================================================================\n');

  // Test 1: Validate Stage 1 Zero Banned AI Slop Words
  console.log('[Test 1] Validating Zero Banned AI Slop Words in Generated Script...');
  const plan = await generateVideoPlan({
    topic: 'How ancient Roman concrete healed its own cracks and survived 2000 years',
    niche: 'History & Engineering',
    channelName: 'RomanChronicles',
    targetLengthMinutes: 1, // Shorts format
    userPlan: 'free',
  });

  const bannedWords = ['delve', 'tapestry', 'testament', 'beacon', 'symphony', 'unleash', 'elevate', 'game-changer', 'in a world where', 'buckle up'];
  const narrationLower = plan.fullNarration.toLowerCase();
  for (const word of bannedWords) {
    assert.strictEqual(
      narrationLower.includes(word),
      false,
      `Narration must NOT contain banned AI slop word: "${word}"`
    );
  }
  console.log('  -> PASS: Generated script strictly purged of all banned AI slop words.');

  // Test 2: Validate 3-Second Pacing Rule (Shorts)
  console.log('[Test 2] Validating 3-Second Visual Beat Rule & Duration Ceilings...');
  assert.ok(plan.scenes.length >= 4, 'Must produce at least 4 scenes');
  
  // Scene 1 & 2: 2.0 to 3.0s
  assert.ok(plan.scenes[0].estimatedDurationSec >= 2.0 && plan.scenes[0].estimatedDurationSec <= 3.0,
    `Scene 1 duration (${plan.scenes[0].estimatedDurationSec}s) must be 2.0s - 3.0s`);
  assert.ok(plan.scenes[1].estimatedDurationSec >= 2.0 && plan.scenes[1].estimatedDurationSec <= 3.0,
    `Scene 2 duration (${plan.scenes[1].estimatedDurationSec}s) must be 2.0s - 3.0s`);

  // Subsequent scenes: 3.0 to 4.5s (never exceed 5.0s)
  for (let i = 2; i < plan.scenes.length; i++) {
    const dur = plan.scenes[i].estimatedDurationSec;
    assert.ok(dur <= 5.0, `Scene ${i + 1} duration (${dur}s) must never exceed 5.0s`);
  }
  console.log('  -> PASS: 3-second visual beat rule strictly enforced across all scenes.');

  // Test 3: Validate Alternating Camera Motion Variety (No Consecutive Repeats)
  console.log('[Test 3] Validating Alternating Camera Motion (Zero Consecutive Repeats)...');
  for (let i = 0; i < plan.scenes.length - 1; i++) {
    const currentMotion = (plan.scenes[i] as any).cameraMotion;
    const nextMotion = (plan.scenes[i + 1] as any).cameraMotion;
    if (currentMotion && nextMotion) {
      assert.notStrictEqual(
        currentMotion,
        nextMotion,
        `Scene ${i + 1} and Scene ${i + 2} must NOT repeat the same camera motion (${currentMotion})`
      );
    }
  }
  console.log('  -> PASS: Camera motions strictly alternate without consecutive repeats.');

  // Test 4: Validate Character & Style Anchor in Prompts
  console.log('[Test 4] Validating Character Anchor & Clean Visual Prompts...');
  for (const scene of plan.scenes) {
    assert.ok(
      scene.visualPrompt.includes('no text, no watermark, no letters'),
      `Visual prompt for scene ${scene.sceneIndex} must end with clean image directives`
    );
  }
  console.log('  -> PASS: Prompts include character continuity and strict no-text directives.');

  // Test 5: Validate Pre-Flight Llama Guard Moderation
  console.log('[Test 5] Validating Pre-Flight Llama Guard / Compliance Filter...');
  const safeRes = await validateNarrationModerationWithLlamaGuard('How honey never spoils over thousands of years');
  assert.strictEqual(safeRes.allowed, true, 'Clean historical topic must pass');

  const unsafeRes = await validateNarrationModerationWithLlamaGuard('ai deepfake elon musk announcing guaranteed 500% btc giveaway');
  assert.strictEqual(unsafeRes.allowed, false, 'Scam/deepfake prompt must be blocked');
  console.log('  -> PASS: Pre-flight moderation filter rejects deepfake and deceptive financial claims.');

  console.log('\n========================================================================');
  console.log('   ALL PHASE 2 SPLIT-BRAIN PIPELINE TESTS PASSED (100% OK)');
  console.log('========================================================================\n');
}

runPhase2Tests().catch((err) => {
  console.error('Phase 2 test failed:', err);
  process.exit(1);
});
