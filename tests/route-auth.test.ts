/**
 * Route & Security Unit Tests (Offline, No Live Keys/Browser Required)
 * Tests core security invariants:
 * 1. Admin HMAC token signing & timing-safe verification
 * 2. Fail-closed behavior on missing secrets
 * 3. Random salt generation & legacy salt verification
 * 4. Persistent SQLite-backed rate limiter & nonce tracking
 * 5. Billing plan consistency & credit allocations
 */

import { signAdminToken, verifyAdminToken } from '../src/lib/security/adminAuth';
import { hashPassword, verifyPassword, checkRateLimit } from '../src/lib/auth';
import { generateOAuthState, verifyOAuthState } from '../src/lib/security/oauth-state';
import { PLANS } from '../src/lib/billing';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n🔒 Starting Route & Auth Offline Security Tests...\n');

  // Test 1: Admin Token Signing & Verification (Fail closed if secret is unset)
  const prevAdminSecret = process.env.ADMIN_SECRET;
  delete process.env.ADMIN_SECRET;
  let threwWithoutSecret = false;
  try {
    signAdminToken('admin');
  } catch {
    threwWithoutSecret = true;
  }
  assert(threwWithoutSecret, 'signAdminToken fails closed when ADMIN_SECRET is unset');
  assert(verifyAdminToken('fake-token') === false, 'verifyAdminToken returns false without ADMIN_SECRET');

  // Test 2: Admin Token with valid secret
  process.env.ADMIN_SECRET = 'unit-test-secure-admin-secret-32-chars-long';
  const token = signAdminToken('admin_user');
  assert(typeof token === 'string' && token.includes('.'), 'signAdminToken generates valid HMAC payload.signature');
  assert(verifyAdminToken(token) === true, 'verifyAdminToken verifies genuine signed token');
  const [ts, uname, sig] = token.split('.');
  const tamperedToken = `${ts}.${uname}.${sig.slice(0, -2)}ff`;
  assert(verifyAdminToken(tamperedToken) === false, 'verifyAdminToken rejects tampered token');
  assert(verifyAdminToken('invalid-format') === false, 'verifyAdminToken rejects malformed token');

  // Test 3: Password Random Salt and Hash Verification
  process.env.ENCRYPTION_KEY = 'unit-test-encryption-key-32-bytes-long';
  process.env.JWT_SECRET = 'unit-test-jwt-secret-at-least-32-characters';

  const testPass = 'SuperSecret123!';
  const { hash: hash1, salt: salt1 } = hashPassword(testPass);
  const { hash: hash2, salt: salt2 } = hashPassword(testPass);

  assert(salt1 !== salt2, 'hashPassword generates unique cryptographically random salts per user');
  assert(verifyPassword(testPass, hash1, salt1), 'verifyPassword validates correct password with random salt');
  assert(!verifyPassword('WrongPass', hash1, salt1), 'verifyPassword rejects incorrect password');

  // Test 4: Persistent SQLite Rate Limiter
  const ip = `test-ip-${Date.now()}`;
  const action = 'test_login';
  const limit = 3;
  const windowMs = 10000;

  const res1 = checkRateLimit(`${ip}:${action}`, limit, windowMs);
  const res2 = checkRateLimit(`${ip}:${action}`, limit, windowMs);
  const res3 = checkRateLimit(`${ip}:${action}`, limit, windowMs);
  const res4 = checkRateLimit(`${ip}:${action}`, limit, windowMs);

  assert(res1.allowed && res1.remaining === 2, 'Rate limiter allows 1st request');
  assert(res2.allowed && res2.remaining === 1, 'Rate limiter allows 2nd request');
  assert(res3.allowed && res3.remaining === 0, 'Rate limiter allows 3rd request (threshold)');
  assert(!res4.allowed && res4.remaining === 0, 'Rate limiter blocks 4th request (exceeds limit)');

  // Test 5: Persistent OAuth Nonce Storage & One-Time Consumption
  process.env.AUTH_SECRET = 'unit-test-oauth-secret-32-chars-long';
  const testUserId = 'test-user-123';
  const oauthState = generateOAuthState(testUserId);
  const verifyRes1 = verifyOAuthState(oauthState, testUserId);
  const verifyRes2 = verifyOAuthState(oauthState, testUserId);

  assert(verifyRes1.valid === true, 'verifyOAuthState validates authentic state and consumes nonce');
  assert(verifyRes2.valid === false, 'verifyOAuthState rejects replayed/consumed state nonce');

  // Test 6: Billing Plans Consistency (2-Tier Production Model)
  const creator = PLANS.find((p) => p.id === 'creator');
  const pro = PLANS.find((p) => p.id === 'pro');

  assert(creator?.price_monthly === 49, 'Creator monthly price is $49');
  assert(creator?.credits_monthly === 750, 'Creator monthly credits are 750');
  assert(pro?.price_monthly === 99, 'Pro monthly price is $99');
  assert(pro?.credits_monthly === 2250, 'Pro monthly credits are 2250');

  // Restore env
  if (prevAdminSecret) {
    process.env.ADMIN_SECRET = prevAdminSecret;
  } else {
    delete process.env.ADMIN_SECRET;
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed.\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
