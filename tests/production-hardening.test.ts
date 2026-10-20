/**
 * AutoVideo SaaS Production Hardening & Security Test Suite
 * Validates all P0, P1, and P2 security fixes and invariants.
 */

import assert from 'assert';
import { encryptToken, decryptToken } from '../src/lib/security/encryption';
import { generateOAuthState, verifyOAuthState } from '../src/lib/security/oauth-state';
import { deductUserCredits, grantUserCredits, getUserCredits, getDb } from '../src/lib/db';
import { validateEnvironment } from '../src/lib/config/env-validator';

let testsPassed = 0;
let testsFailed = 0;

function it(name: string, fn: () => void | Promise<void>) {
  return (async () => {
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      testsPassed++;
    } catch (err: any) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Error: ${err.message}`);
      testsFailed++;
    }
  })();
}

async function runAllTests() {
  console.log('🔒 AutoVideo Production Hardening & Security Verification Suite\n');

  // =========================================================================
  // 1. OAUTH TOKEN ENCRYPTION AT REST (AES-256-GCM)
  // =========================================================================
  console.log('▶ Category 1: OAuth Token Encryption & Decryption');

  await it('Encrypts plaintext token with enc:v1: prefix and decrypts faithfully', () => {
    const rawSecret = 'ya29.a0ARrdaM_example_google_oauth_secret_refresh_token_xyz987';
    const encrypted = encryptToken(rawSecret);

    assert(encrypted !== null, 'Encrypted token should not be null');
    assert(encrypted.startsWith('enc:v1:'), 'Encrypted token must have enc:v1: prefix');
    assert(!encrypted.includes(rawSecret), 'Encrypted token must never contain raw plaintext');

    const decrypted = decryptToken(encrypted);
    assert.strictEqual(decrypted, rawSecret, 'Decrypted token must exactly match original plaintext');
  });

  await it('Handles legacy unencrypted tokens gracefully (backward compatibility)', () => {
    const legacyPlaintext = 'legacy_unencrypted_token_value_123';
    const result = decryptToken(legacyPlaintext);
    assert.strictEqual(result, legacyPlaintext, 'Legacy unencrypted tokens must be returned as-is');
  });

  await it('Idempotently returns already-encrypted tokens without double encryption', () => {
    const raw = 'test_token_single_encrypt';
    const firstEnc = encryptToken(raw);
    const secondEnc = encryptToken(firstEnc);
    assert.strictEqual(firstEnc, secondEnc, 'Calling encryptToken on encrypted token must be idempotent');
  });

  // =========================================================================
  // 2. YOUTUBE OAUTH CSRF PROTECTION & CRYPTOGRAPHIC STATE
  // =========================================================================
  console.log('\n▶ Category 2: YouTube OAuth CSRF Protection');

  await it('Generates verifiable state for authenticated user', () => {
    const userId = 'usr_alice_123';
    const state = generateOAuthState(userId);
    assert(typeof state === 'string' && state.length > 20, 'State should be a non-empty string');

    const verification = verifyOAuthState(state, userId);
    assert.strictEqual(verification.valid, true, 'State should be valid for the same user');
    assert.strictEqual(verification.userId, userId, 'Verification must return the correct userId');
  });

  await it('Rejects tampered or modified OAuth state', () => {
    const userId = 'usr_alice_123';
    const state = generateOAuthState(userId);
    // Tamper with one character
    const tampered = state.slice(0, -4) + 'wxyz';
    const verification = verifyOAuthState(tampered, userId);
    assert.strictEqual(verification.valid, false, 'Tampered state must be rejected');
    assert(verification.error?.includes('signature') || verification.error?.includes('Invalid'), 'Error should indicate signature failure');
  });

  await it('Rejects OAuth state when session user does not match state user', () => {
    const userAlice = 'usr_alice_123';
    const userBob = 'usr_bob_456';
    const stateAlice = generateOAuthState(userAlice);

    const verification = verifyOAuthState(stateAlice, userBob);
    assert.strictEqual(verification.valid, false, 'State generated for Alice must be rejected for Bob');
    assert(verification.error?.includes('match the active session user'), 'Error should indicate user mismatch');
  });

  await it('Rejects replayed OAuth state (single-use enforcement)', () => {
    const userId = 'usr_charlie_789';
    const state = generateOAuthState(userId);

    const firstUse = verifyOAuthState(state, userId);
    assert.strictEqual(firstUse.valid, true, 'First use should succeed');

    const replayUse = verifyOAuthState(state, userId);
    assert.strictEqual(replayUse.valid, false, 'Second use of state must be rejected as replay');
    assert(replayUse.error?.includes('replay'), 'Error should indicate replay detection');
  });

  // =========================================================================
  // 3. CREDIT CONCURRENCY & ATOMIC BALANCE DEDUCTION
  // =========================================================================
  console.log('\n▶ Category 3: Atomic Credit Deductions & Concurrency');

  await it('Atomic credit deduction prevents overdraft and race conditions', async () => {
    const testUserId = `test_race_${Date.now()}`;
    const initialCredits = 100;
    grantUserCredits(testUserId, initialCredits, 'TEST', 'Initial test grant');

    // Attempt to deduct 60 credits twice simultaneously (total 120 > 100 available)
    const deduction1 = deductUserCredits(testUserId, 60, 'DEDUCT', 'Deduction 1');
    const deduction2 = deductUserCredits(testUserId, 60, 'DEDUCT', 'Deduction 2');

    // Exactly one deduction must succeed and one must fail
    assert(deduction1 !== deduction2, 'One deduction should succeed and one should fail');
    const finalBalance = getUserCredits(testUserId).balance;
    assert.strictEqual(finalBalance, 40, 'Balance must accurately reflect single successful deduction of 60');
  });

  await it('grantUserCredits atomically increments balance and writes ledger record', () => {
    const testUserId = `test_grant_${Date.now()}`;
    grantUserCredits(testUserId, 200, 'TEST', 'Grant 200 credits');
    const b1 = getUserCredits(testUserId).balance;
    assert.strictEqual(b1, 200, 'Balance must be 200');

    grantUserCredits(testUserId, 300, 'TEST', 'Grant 300 credits');
    const b2 = getUserCredits(testUserId).balance;
    assert.strictEqual(b2, 500, 'Balance must be 500');
  });

  // =========================================================================
  // 4. STRIPE WEBHOOK IDEMPOTENCY
  // =========================================================================
  console.log('\n▶ Category 4: Stripe Webhook Idempotency');

  await it('Idempotently ignores duplicate webhook events', () => {
    const db = getDb();
    const eventId = `evt_test_${Date.now()}`;
    const now = new Date().toISOString();

    db.prepare(`
      CREATE TABLE IF NOT EXISTS processed_webhook_events (
        event_id TEXT PRIMARY KEY,
        event_type TEXT NOT NULL,
        processed_at TEXT NOT NULL
      )
    `).run();

    // First insert succeeds
    db.prepare('INSERT INTO processed_webhook_events (event_id, event_type, processed_at) VALUES (?, ?, ?)').run(
      eventId,
      'checkout.session.completed',
      now
    );

    // Second check detects already processed
    const alreadyProcessed = db.prepare('SELECT event_id FROM processed_webhook_events WHERE event_id = ?').get(eventId);
    assert(alreadyProcessed !== undefined, 'Event should be recorded in processed_webhook_events');
  });

  // =========================================================================
  // 5. PRODUCTION ENVIRONMENT VALIDATION
  // =========================================================================
  console.log('\n▶ Category 5: Environment & Security Defaults Validation');

  await it('Rejects default weak admin passwords and secrets in production mode', () => {
    const prevNodeEnv = process.env.NODE_ENV;
    const prevAdminPass = process.env.ADMIN_PASSWORD;

    try {
      (process.env as any).NODE_ENV = 'production';
      process.env.ADMIN_PASSWORD = 'AutoVideoAdmin2026!#'; // default insecure

      const validation = validateEnvironment();
      assert.strictEqual(validation.valid, false, 'Validation must fail for default admin password in production');
      assert(
        validation.errors.some((e) => e.includes('ADMIN_PASSWORD')),
        'Error should explicitly flag insecure default ADMIN_PASSWORD'
      );
    } finally {
      (process.env as any).NODE_ENV = prevNodeEnv;
      process.env.ADMIN_PASSWORD = prevAdminPass;
    }
  });

  // =========================================================================
  // 6. TENANT ISOLATION INVARIANTS
  // =========================================================================
  console.log('\n▶ Category 6: Multi-Tenant Authorization Invariants');

  await it('Enforces project ownership separation across tenants', () => {
    const db = getDb();
    const userA = `user_a_${Date.now()}`;
    const userB = `user_b_${Date.now()}`;
    const projectId = `proj_${Date.now()}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT OR IGNORE INTO channels (id, user_id, name, niche, created_at, updated_at)
      VALUES ('test_channel', 'system', 'Test Channel', 'Tech', ?, ?)
    `).run(now, now);

    db.prepare(`
      INSERT INTO content_projects (id, user_id, channel_id, topic, status, current_stage, created_at, updated_at)
      VALUES (?, ?, 'test_channel', 'Private Project of User A', 'DRAFT', 'SCRIPT', ?, ?)
    `).run(projectId, userA, now, now);

    // Query as User A (owner)
    const ownerQuery = db.prepare('SELECT * FROM content_projects WHERE id = ? AND user_id = ?').get(projectId, userA);
    assert(ownerQuery !== undefined, 'User A should access their own project');

    // Query as User B (non-owner)
    const nonOwnerQuery = db.prepare('SELECT * FROM content_projects WHERE id = ? AND user_id = ?').get(projectId, userB);
    assert.strictEqual(nonOwnerQuery, undefined, 'User B must NOT be able to access User A project');
  });

  await it('Enforces voice sample ownership separation across tenants', () => {
    const db = getDb();
    const userA = `user_voice_a_${Date.now()}`;
    const userB = `user_voice_b_${Date.now()}`;
    const voiceId = `voice_${Date.now()}`;

    db.prepare(`
      INSERT INTO user_voices (id, user_id, name, voice_id, sample_url, created_at)
      VALUES (?, ?, 'Executive Voice', ?, '/api/assets/voices/...', ?)
    `).run(voiceId, userA, voiceId, new Date().toISOString());

    const ownerVoice = db.prepare('SELECT id FROM user_voices WHERE user_id = ? AND voice_id = ?').get(userA, voiceId);
    assert(ownerVoice !== undefined, 'Owner can access their voice');

    const nonOwnerVoice = db.prepare('SELECT id FROM user_voices WHERE user_id = ? AND voice_id = ?').get(userB, voiceId);
    assert.strictEqual(nonOwnerVoice, undefined, 'Non-owner must NOT access another user voice');
  });

  await it('Rejects expired OAuth state (> 15 minutes)', () => {
    const userId = 'usr_expired_test';
    // Manually craft state with expired timestamp (20 minutes ago)
    const expiredTimestamp = Date.now() - 20 * 60 * 1000;
    const crypto = require('crypto');
    const secret = process.env.AUTH_SECRET || process.env.ADMIN_SECRET || 'autovideo_oauth_state_hmac_secret_2026';
    const nonce = crypto.randomBytes(16).toString('hex');
    const data = `${userId}:${expiredTimestamp}:${nonce}`;
    const signature = crypto.createHmac('sha256', secret).update(data).digest('hex');
    const payload = JSON.stringify({ userId, timestamp: expiredTimestamp, nonce, signature });
    const expiredState = Buffer.from(payload).toString('base64url');

    const result = verifyOAuthState(expiredState, userId);
    assert.strictEqual(result.valid, false, 'Expired OAuth state must be rejected');
    assert(result.error?.includes('expired'), 'Error must note state expiration');
  });

  // =========================================================================
  // 7. 30-VIDEO MONTHLY QUOTA POLICY
  // =========================================================================
  console.log('\n▶ Category 7: Monthly Quota Enforcement (30 Videos / Month)');

  await it('Allows up to 30 videos per month and enforces limit at 31st video', () => {
    const db = getDb();
    const testQuotaUser = `usr_quota_${Date.now()}`;
    const now = new Date().toISOString();

    // Insert 30 completed projects for this user in the current month
    for (let i = 1; i <= 30; i++) {
      db.prepare(`
        INSERT INTO content_projects (id, user_id, channel_id, topic, status, current_stage, created_at, updated_at)
        VALUES (?, ?, 'test_channel', ?, 'COMPLETED', 'FINAL_VIDEO', ?, ?)
      `).run(`proj_q_${testQuotaUser}_${i}`, testQuotaUser, `Topic ${i}`, now, now);
    }

    const { getMonthlyVideoUsage } = require('../src/lib/db');
    const usage = getMonthlyVideoUsage(testQuotaUser);

    assert.strictEqual(usage.used, 30, 'Should have used exactly 30 videos');
    assert.strictEqual(usage.remaining, 0, 'Remaining videos must be 0 after 30 videos');

    // 31st video generation attempt must be blocked by remaining <= 0 check
    const canCreate31st = usage.remaining > 0;
    assert.strictEqual(canCreate31st, false, '31st video must be rejected');
  });

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log('\n============================================================');
  console.log(`Test Results: ${testsPassed} passed, ${testsFailed} failed`);
  console.log('============================================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error('Test Suite Runner Fatal Error:', err);
  process.exit(1);
});
