import assert from 'assert';
import {
  getAllModels,
  getModelById,
  selectModelForTier,
  updateModelVerification,
  resetModelRegistry,
  INITIAL_MODEL_REGISTRY,
} from '../src/lib/video/modelRegistry';
import { verifyModel } from '../scripts/verify-models';
import { EngineError } from '../src/lib/video/engineErrors';

async function runWp2Tests() {
  console.log('\n========================================================================');
  console.log('   RUNNING WP2 ACCEPTANCE TESTS: VERIFIED MODEL REGISTRY & ROUTER');
  console.log('========================================================================\n');

  // Reset registry before test run
  resetModelRegistry();

  // -------------------------------------------------------------------------
  // TEST 1: Initial Unverified State & Official Pricing URLs
  // -------------------------------------------------------------------------
  console.log('[Test 1] Validating Initial Unverified State & Pricing URLs...');
  const models = getAllModels();
  assert.ok(models.length >= 4, 'Registry must contain at least 4 video models');

  for (const m of models) {
    assert.strictEqual(
      m.verified,
      false,
      `Model ${m.id} must initialize with verified: false until checked by live probe`
    );
    assert.strictEqual(
      m.pricedAt,
      null,
      `Model ${m.id} must initialize with pricedAt: null until verified`
    );
    assert.ok(
      m.pricingUrl && m.pricingUrl.startsWith('https://'),
      `Model ${m.id} must have a valid HTTPS official pricing URL`
    );
  }

  // Verify Veo 3.1 Lite inclusion
  const veo = getModelById('google/veo-3.1-lite');
  assert.ok(veo, 'Registry must include Google Veo 3.1 Lite');
  assert.strictEqual(veo.tier, 'economy', 'Veo 3.1 Lite must be in economy tier');
  assert.strictEqual(veo.costPerSecUsd, 0.05, 'Veo 3.1 Lite rate must be $0.05/s');
  assert.strictEqual(veo.creditCostPer5s, 10, 'Veo 3.1 Lite 5s clip must be 10 credits');
  assert.strictEqual(veo.nativeAudio, true, 'Veo 3.1 Lite must support native audio');

  // Verify Seedance 2.0 Fast corrected rate estimate
  const seedance = getModelById('seedance-v2/fast');
  assert.ok(seedance, 'Registry must include Seedance 2.0 Fast');
  assert.strictEqual(seedance.costPerSecUsd, 0.24, 'Seedance 2.0 Fast rate must be ~$0.24/s (not made-up $0.08)');
  assert.strictEqual(seedance.creditCostPer5s, 47, 'Seedance 5s clip must be 47 credits');
  console.log('  -> PASS: All models initialized as unverified with valid official pricing URLs.');

  // -------------------------------------------------------------------------
  // TEST 2: Production Router Refuses Unverified Models
  // -------------------------------------------------------------------------
  console.log('[Test 2] Validating Production Router Fail-Closed Behavior on Unverified Models...');

  let prodBlocked = false;
  try {
    selectModelForTier('economy', { enforceProductionCheck: true });
  } catch (err: any) {
    if (err instanceof EngineError && err.code === 'MODEL_UNVERIFIED') {
      prodBlocked = true;
      assert.ok(
        err.message.includes('Production router refused unverified models'),
        'Error message must state production router refusal'
      );
      assert.ok(
        err.message.includes('scripts/verify-models.ts'),
        'Error message must instruct operator to run verification script'
      );
    }
  }
  assert.strictEqual(
    prodBlocked,
    true,
    'Production router MUST throw EngineError(MODEL_UNVERIFIED) when all tier candidates are unverified'
  );
  console.log('  -> PASS: Production router safely rejects unverified models to prevent financial loss.');

  // -------------------------------------------------------------------------
  // TEST 3: Dev Sandbox Mode Permits Selection with Warnings
  // -------------------------------------------------------------------------
  console.log('[Test 3] Validating Dev Sandbox Fallback Behavior...');

  const devSelected = selectModelForTier('economy', {
    enforceProductionCheck: false,
    allowUnverifiedInDev: true,
  });
  assert.ok(devSelected, 'Dev mode must return candidate for local prototyping');
  assert.strictEqual(devSelected.tier, 'economy', 'Returned model must belong to requested tier');
  console.log(`  -> PASS: Dev mode successfully selected candidate "${devSelected.id}" with prominent warning.`);

  // -------------------------------------------------------------------------
  // TEST 4: Live Verification CLI Marks Model as Verified
  // -------------------------------------------------------------------------
  console.log('[Test 4] Validating Model Verification Tool (verifyModel)...');

  const verificationRes = await verifyModel('fal-ai/wan-2.1/t2v-480p', {
    skipLiveCall: true,
    confirmedCostPerSecUsd: 0.05,
  });

  assert.strictEqual(verificationRes.verified, true, 'Model must be marked verified after confirmation');
  assert.ok(verificationRes.pricedAt, 'pricedAt date must be stamped');
  assert.strictEqual(verificationRes.costPerSecUsd, 0.05, 'Confirmed cost must be stamped');

  // Verify updated in registry
  const updatedWan = getModelById('fal-ai/wan-2.1/t2v-480p');
  assert.ok(updatedWan, 'Wan 2.1 must exist in registry');
  assert.strictEqual(updatedWan.verified, true, 'Wan 2.1 must have verified: true');
  assert.ok(updatedWan.pricedAt, 'Wan 2.1 must have pricedAt date set');

  // Now, production router for economy tier should SUCCEED and return the verified Wan 2.1 model!
  const prodAllowed = selectModelForTier('economy', { enforceProductionCheck: true });
  assert.strictEqual(prodAllowed.id, 'fal-ai/wan-2.1/t2v-480p', 'Production router must now select verified model');
  assert.strictEqual(prodAllowed.verified, true, 'Selected model must be verified');
  console.log('  -> PASS: Model verification workflow successfully enabled production router selection.');

  // -------------------------------------------------------------------------
  // TEST 5: 60% Gross Margin Credit Math across all Tiers
  // -------------------------------------------------------------------------
  console.log('[Test 5] Validating 60% Gross Margin Formula Math...');

  // Economy: $0.05/s * 5s = $0.25 / 0.026 = 9.615 -> 10 credits
  const econModel = getModelById('fal-ai/wan-2.1/t2v-480p')!;
  assert.strictEqual(econModel.creditCostPer5s, 10, 'Economy 5s clip must cost 10 credits');

  // Fast: $0.08/s * 5s = $0.40 / 0.026 = 15.38 -> 16 credits
  const klingModel = getModelById('kling-video/v3/standard')!;
  assert.strictEqual(klingModel.creditCostPer5s, 16, 'Kling Fast 5s clip must cost 16 credits');

  // Flagship: $0.20/s * 5s = $1.00 / 0.026 = 38.46 -> 39 credits
  const minimaxModel = getModelById('fal-ai/minimax/video-01')!;
  assert.strictEqual(minimaxModel.creditCostPer5s, 39, 'MiniMax Flagship 5s clip must cost 39 credits');
  console.log('  -> PASS: All tier credit calculations strictly preserve 60% gross margin target.');

  console.log('\n========================================================================');
  console.log('   ALL WP2 ACCEPTANCE TESTS PASSED (5/5 TEST SUITES 100% OK)');
  console.log('========================================================================\n');
}

runWp2Tests().catch((err) => {
  console.error('\n❌ WP2 Acceptance Test Failed:', err);
  process.exit(1);
});
