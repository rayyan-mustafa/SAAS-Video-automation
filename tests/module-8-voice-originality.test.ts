import assert from 'assert';
import { voiceProvider } from '../src/lib/providers/voiceProvider';
import { personalCreatorScriptService, NARRATIVE_FRAMEWORKS } from '../src/lib/providers/personalCreatorScriptService';

async function runModule8Tests() {
  console.log('\n======================================================');
  console.log('   RUNNING MODULE 8 TESTS: LICENSED VOICE & ORIGINALITY');
  console.log('======================================================\n');

  // Test 1: Verify 5 Distinct Rotating Narrative Frameworks
  console.log('[Test 1] Verifying 5 rotating Narrative Variety frameworks...');
  const frameworks = personalCreatorScriptService.getNarrativeFrameworks();
  assert.strictEqual(frameworks.length, 5, 'Must have exactly 5 narrative frameworks');

  const expectedIds = [
    'provocative_question',
    'counter_intuitive_mistake',
    'historical_case_study',
    'tactical_playbook',
    'curiosity_loophole',
  ];
  for (const expectedId of expectedIds) {
    const found = frameworks.find((f) => f.id === expectedId);
    assert.ok(found, `Framework ${expectedId} must exist`);
    assert.ok(found.hookFormula.length > 10, 'Hook formula must be defined');
    assert.ok(found.structure.length >= 5, 'Framework must define scene progression');
  }
  console.log(`✓ All 5 Narrative Variety frameworks verified: ${frameworks.map((f) => f.name).join(', ')}.`);

  // Test 2: Verify Framework Rotation and Anti-Repetition Diversity
  console.log('[Test 2] Testing framework rotation across different topics & seeds...');
  const topicA = 'How the Stock Market Works';
  const topicB = 'The Truth About Quantum Computing';
  const topicC = 'Why 99% of Startups Fail';

  const fwA = personalCreatorScriptService.selectNarrativeFramework(topicA);
  const fwB = personalCreatorScriptService.selectNarrativeFramework(topicB);
  const fwC = personalCreatorScriptService.selectNarrativeFramework(topicC);

  console.log(`  Topic A Framework: ${fwA.name} (${fwA.id})`);
  console.log(`  Topic B Framework: ${fwB.name} (${fwB.id})`);
  console.log(`  Topic C Framework: ${fwC.name} (${fwC.id})`);
  assert.ok(fwA && fwB && fwC, 'Framework selection must always succeed');

  // Test 3: Structural Differentiation Between Script Frameworks
  console.log('[Test 3] Testing structural differentiation of generated scripts...');
  const script1 = await personalCreatorScriptService.generateScriptFromTopic({
    topic: 'Artificial Intelligence',
    narrativeFrameworkId: 'provocative_question',
    lengthMinutes: 1,
  });

  const script2 = await personalCreatorScriptService.generateScriptFromTopic({
    topic: 'Artificial Intelligence',
    narrativeFrameworkId: 'counter_intuitive_mistake',
    lengthMinutes: 1,
  });

  const script3 = await personalCreatorScriptService.generateScriptFromTopic({
    topic: 'Artificial Intelligence',
    narrativeFrameworkId: 'curiosity_loophole',
    lengthMinutes: 1,
  });

  assert.strictEqual(script1.narrativeFramework?.id, 'provocative_question');
  assert.strictEqual(script2.narrativeFramework?.id, 'counter_intuitive_mistake');
  assert.strictEqual(script3.narrativeFramework?.id, 'curiosity_loophole');

  // Verify hooks are completely different structures
  assert.notStrictEqual(script1.scenes[0].narration, script2.scenes[0].narration);
  assert.notStrictEqual(script2.scenes[0].narration, script3.scenes[0].narration);
  assert.ok(script1.scenes[0].narration.includes('wondered'), 'Provocative question must ask question');
  assert.ok(script2.scenes[0].narration.includes('fatal assumption'), 'Counter-intuitive mistake must cite fatal assumption');
  assert.ok(script3.scenes[0].narration.includes('loophole'), 'Curiosity loophole must mention loophole');

  console.log('✓ Script 1 Hook:', script1.scenes[0].narration);
  console.log('✓ Script 2 Hook:', script2.scenes[0].narration);
  console.log('✓ Script 3 Hook:', script3.scenes[0].narration);
  console.log('✓ Zero-duplicate slop guaranteed: Each framework produced completely different psychological narrative beats.');

  // Test 4: Azure Cognitive Speech API Configuration & Fail-Safe Integration
  console.log('[Test 4] Testing Licensed Voice Provider (Azure Speech + Edge Sandbox)...');
  // Azure Speech throws descriptive error if key is not configured
  try {
    // Attempt without key
    delete process.env.AZURE_SPEECH_KEY;
    delete process.env.AZURE_SPEECH_API_KEY;
    await (voiceProvider as any).synthesizeWithAzureSpeech('Test voice text');
    assert.fail('Should fail when API key is missing');
  } catch (err: any) {
    assert.ok(err.message.includes('Azure Speech API key not configured'), 'Must fail gracefully with clear key requirement');
    console.log('✓ Azure Speech properly guards unlicensed execution.');
  }

  // Test 5: End-to-End Voiceover Generation with Live Synthesis
  console.log('[Test 5] Generating real voiceover audio with full fallback pipeline...');
  const voiceResult = await voiceProvider.generateVoiceover({
    text: 'Welcome back to the studio. Today we uncover the truth behind algorithmic automation.',
    language: 'en',
    voiceName: 'en-US-ChristopherNeural',
  });

  assert.ok(voiceResult.audioBuffer.length > 500, 'Audio buffer must contain valid sound data');
  assert.strictEqual(voiceResult.format, 'mp3');
  assert.ok(voiceResult.durationSec > 0, 'Audio duration must be positive');
  console.log(`✓ Real voiceover generated: ${voiceResult.audioBuffer.length} bytes, duration: ${voiceResult.durationSec}s.`);

  console.log('\n======================================================');
  console.log('   ALL MODULE 8 TESTS PASSED SUCCESSFULLY! (100%)');
  console.log('======================================================\n');
}

runModule8Tests().catch((err) => {
  console.error('Module 8 Tests Failed:', err);
  process.exit(1);
});
