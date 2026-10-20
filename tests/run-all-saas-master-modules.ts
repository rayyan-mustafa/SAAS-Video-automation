import { execSync } from 'child_process';

const testFiles = [
  'tests/module-1-security-pricing.test.ts',
  'tests/module-2-auto-refund.test.ts',
  'tests/module-3-ai-video-pipeline.test.ts',
  'tests/module-4-competitor-intelligence.test.ts',
  'tests/module-5-own-channel-iq.test.ts',
  'tests/module-6-multi-platform-publishing.test.ts',
  'tests/module-7-analytics-dashboard.test.ts',
  'tests/module-8-voice-originality.test.ts',
];

console.log('================================================================');
console.log('   AUTORA SAAS PRODUCTION MASTER PLAN: COMPLETE AUDIT RUNNER   ');
console.log('================================================================\n');

let passedCount = 0;

for (const file of testFiles) {
  console.log(`>>> EXECUTING: ${file} ...`);
  try {
    const output = execSync(`npx tsx "${file}"`, { stdio: 'pipe' }).toString();
    console.log(output);
    console.log(`[PASS] ${file}\n----------------------------------------------------------------\n`);
    passedCount++;
  } catch (err: any) {
    console.error(`[FAIL] ${file}:`, err.stdout?.toString() || err.message);
    process.exit(1);
  }
}

console.log('================================================================');
console.log(`   ALL ${passedCount}/${testFiles.length} MASTER MODULES VERIFIED & PASSING (100%)!`);
console.log('================================================================');
