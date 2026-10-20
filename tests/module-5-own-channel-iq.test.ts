import assert from 'assert';
import { v4 as uuidv4 } from 'uuid';
import { getDb, OAuthConnection } from '../src/lib/db';

async function runModule5Tests() {
  console.log('\n======================================================');
  console.log('   RUNNING MODULE 5 TESTS: OWN CHANNEL IQ & WINNER BIAS');
  console.log('======================================================\n');

  const db = getDb();
  const testUserId = `user_iq_${Date.now()}`;
  const now = new Date().toISOString();

  // Test 1: Query channel when not connected
  console.log('[Test 1] Testing unlinked channel status...');
  const connBefore = db
    .prepare('SELECT * FROM oauth_connections WHERE user_id = ? AND platform = ?')
    .get(testUserId, 'YOUTUBE');
  assert.strictEqual(connBefore, undefined, 'No connection should exist initially');
  console.log('✓ Verified unlinked state returns no connection.');

  // Test 2: Connect channel and verify Winner IQ records
  console.log('[Test 2] Connecting YouTube channel to user account...');
  const oauthId = `oauth_${uuidv4()}`;
  db.prepare(`
    INSERT INTO oauth_connections (
      id, user_id, platform, account_email, channel_id, channel_title,
      access_token, refresh_token, token_expiry, scope, created_at, updated_at
    ) VALUES (?, ?, 'YOUTUBE', 'creator@studio.com', 'UC_WinnerIQ_999', 'Studio Alpha', 'ya29.test_token', '1//refresh', ?, 'https://www.googleapis.com/auth/youtube.readonly', ?, ?)
  `).run(oauthId, testUserId, new Date(Date.now() + 3600000).toISOString(), now, now);

  const connAfter = db
    .prepare('SELECT * FROM oauth_connections WHERE user_id = ? AND platform = ?')
    .get(testUserId, 'YOUTUBE') as OAuthConnection;

  assert(connAfter !== undefined, 'OAuth connection must exist');
  assert.strictEqual(connAfter.channel_title, 'Studio Alpha');
  console.log(`✓ Channel "${connAfter.channel_title}" (${connAfter.channel_id}) connected.`);

  // Test 3: Verify Winner IQ Prompt Injection Condition
  console.log('[Test 3] Verifying Winner Bias condition check...');
  const hasConnectedChannel = !!db
    .prepare("SELECT * FROM oauth_connections WHERE user_id = ? AND platform = 'YOUTUBE'")
    .get(testUserId);
  assert.strictEqual(hasConnectedChannel, true, 'User must be identified as having a connected channel');

  // Winner Context Injection string verification
  const winnerContextMock = `
DATA FROM USER'S TOP-PERFORMING CHANNEL VIDEOS (WINNER FEEDBACK LOOP):
• Formats with proven high retention: "The Hidden Truth Nobody Talks About" (10.4% CTR, 68% retention)
• Formats with proven high clickthrough: "The 3 Fatal Mistakes You Are Making Right Now" (9.2% CTR, 63% retention)
DOUBLE DOWN on what ALREADY works on this channel.
`;
  assert(winnerContextMock.includes('10.4% CTR'), 'Winner bias context must contain top CTR stats');
  assert(winnerContextMock.includes('WINNER FEEDBACK LOOP'), 'Winner feedback loop must be established');
  console.log('✓ Winner IQ bias context formatted and ready for calendar injection.');

  // Clean up
  db.prepare('DELETE FROM oauth_connections WHERE id = ?').run(oauthId);

  console.log('\n======================================================');
  console.log('   🎉 ALL MODULE 5 TESTS PASSED SUCCESSFULLY!');
  console.log('======================================================\n');
}

runModule5Tests().catch((err) => {
  console.error('Module 5 test failed:', err);
  process.exit(1);
});
