import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { checkRateLimit, resetRateLimit } from '../src/lib/security/rateLimit';
import { getPlanById, PLANS, calculateEntitlements } from '../src/lib/billing';

async function runModule1Tests() {
  console.log('\n======================================================');
  console.log('   RUNNING MODULE 1 TESTS: SECURITY, RATE LIMIT, PRICING');
  console.log('======================================================\n');

  // Test 1: Rate Limiter
  console.log('[Test 1] Testing Sliding-Window Rate Limiter...');
  const testIp = '192.168.1.99';
  resetRateLimit(`admin_auth_${testIp}`);

  for (let i = 1; i <= 5; i++) {
    const res = checkRateLimit(`admin_auth_${testIp}`, 5, 60000);
    assert.strictEqual(res.limited, false, `Attempt ${i} should be allowed`);
    assert.strictEqual(res.remaining, 5 - i, `Remaining attempts should be ${5 - i}`);
  }

  // 6th attempt should be blocked
  const blocked = checkRateLimit(`admin_auth_${testIp}`, 5, 60000);
  assert.strictEqual(blocked.limited, true, '6th attempt must be blocked');
  assert.strictEqual(blocked.remaining, 0, 'Remaining attempts must be 0');
  console.log('✓ Rate Limiter blocks after 5 attempts correctly.');

  // Test 2: Admin Sitemap and Robots.txt Leak Prevention
  console.log('[Test 2] Verifying Admin Sitemap Deletion & Robots.txt...');
  const adminSitemapPath = path.join(process.cwd(), 'public', 'admin-sitemap.xml');
  assert.strictEqual(fs.existsSync(adminSitemapPath), false, 'public/admin-sitemap.xml must be deleted');

  const robotsPath = path.join(process.cwd(), 'public', 'robots.txt');
  if (fs.existsSync(robotsPath)) {
    const robotsContent = fs.readFileSync(robotsPath, 'utf8');
    assert.strictEqual(robotsContent.includes('admin-sitemap.xml'), false, 'robots.txt must NOT leak admin sitemap');
  }
  console.log('✓ Admin sitemap purged and excluded from robots.txt.');

  // Test 3: Pricing Reconciling ($49 Creator / $99 Pro)
  console.log('[Test 3] Verifying 2-Tier Pricing Reconciling...');
  assert.strictEqual(PLANS.length, 2, 'Exactly 2 production tiers must exist');
  
  const creatorPlan = getPlanById('creator');
  assert(creatorPlan !== null, 'Creator plan must exist');
  assert.strictEqual(creatorPlan!.price_monthly, 49, 'Creator plan price must be $49/mo');
  assert.strictEqual(creatorPlan!.credits_monthly, 750, 'Creator plan must have 750 credits/mo');
  assert.strictEqual(creatorPlan!.estimated_videos, 30, 'Creator plan must provide 30 videos/mo');

  const proPlan = getPlanById('pro');
  assert(proPlan !== null, 'Pro plan must exist');
  assert.strictEqual(proPlan!.price_monthly, 99, 'Pro plan price must be $99/mo');
  assert.strictEqual(proPlan!.credits_monthly, 2250, 'Pro plan must have 2,250 credits/mo');
  assert.strictEqual(proPlan!.estimated_videos, 90, 'Pro plan must provide 90 videos/mo');

  const entitlements = calculateEntitlements('pro', 2250);
  assert.strictEqual(entitlements.can_generate_video, true);
  assert.strictEqual(entitlements.max_channels, 5);
  console.log('✓ Pricing reconciled to $49 Creator and $99 Pro with verified quotas.');

  // Test 4: Fail-Closed Admin Token Verification
  console.log('[Test 4] Verifying Admin Token Functions...');
  const prevSecret = process.env.ADMIN_SECRET;
  const prevUser = process.env.ADMIN_USER;
  const prevPass = process.env.ADMIN_PASSWORD;

  try {
    process.env.ADMIN_SECRET = 'test_secret_for_unit_tests_2026';
    process.env.ADMIN_USER = 'testadmin';
    process.env.ADMIN_PASSWORD = 'TestPassword123!';

    const { signAdminToken, verifyAdminToken } = await import('../src/lib/security/adminAuth');
    const token = signAdminToken('testadmin');
    assert(token.includes('.'), 'Signed token must contain dots');
    assert.strictEqual(verifyAdminToken(token), true, 'Valid token must verify');

    assert.strictEqual(verifyAdminToken('tampered.token.signature'), false, 'Tampered token must fail');
    assert.strictEqual(verifyAdminToken(''), false, 'Empty token must fail');
  } finally {
    process.env.ADMIN_SECRET = prevSecret;
    process.env.ADMIN_USER = prevUser;
    process.env.ADMIN_PASSWORD = prevPass;
  }
  console.log('✓ Admin token signing and tamper-proof verification validated.');

  console.log('\n======================================================');
  console.log('   🎉 ALL MODULE 1 TESTS PASSED SUCCESSFULLY!');
  console.log('======================================================\n');
}

runModule1Tests().catch((err) => {
  console.error('Module 1 test failed:', err);
  process.exit(1);
});
