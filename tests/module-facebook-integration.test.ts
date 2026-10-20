import assert from 'assert';
import { v4 as uuidv4 } from 'uuid';
import { getDb, OAuthConnection } from '../src/lib/db';
import { publishingProvider } from '../src/lib/providers/publishingProvider';
import { facebookProvider } from '../src/lib/providers/facebookProvider';
import { personalCreatorScriptService, NARRATIVE_FRAMEWORKS, FACEBOOK_NARRATIVE_FRAMEWORKS } from '../src/lib/providers/personalCreatorScriptService';

async function runFacebookIntegrationTests() {
  console.log('\n========================================================================');
  console.log('   RUNNING FACEBOOK VIDEO & HOOK ADAPTATION INTEGRATION TESTS');
  console.log('========================================================================\n');

  const db = getDb();
  const testUserId = `user_fb_${Date.now()}`;
  const now = new Date().toISOString();

  // Test 1: Facebook Status Check (Unconnected State)
  console.log('[Test 1] Testing Facebook connection status when disconnected...');
  const fbStatus = await publishingProvider.getPlatformStatus('Facebook', testUserId);
  assert.strictEqual(fbStatus.status, 'NOT_CONNECTED');
  assert(fbStatus.message.includes('Facebook'), 'Should specify Facebook in status message');
  console.log('✓ Disconnected Facebook status properly verified.');

  // Test 2: Connecting Facebook Page OAuth Connection
  console.log('[Test 2] Connecting Facebook Page OAuth credentials...');
  const fbConnId = `oauth_fb_${uuidv4()}`;
  db.prepare(`
    INSERT INTO oauth_connections (
      id, user_id, platform, account_email, channel_id, channel_title,
      access_token, token_expiry, scope, created_at, updated_at
    ) VALUES (?, ?, 'FACEBOOK', 'pageadmin@facebook.com', '109876543210', 'Autora Creator Page', 'EAAG_fake_facebook_token', ?, 'pages_show_list,pages_read_engagement,pages_manage_posts', ?, ?)
  `).run(fbConnId, testUserId, new Date(Date.now() + 3600000).toISOString(), now, now);

  const fbStatusConnected = await publishingProvider.getPlatformStatus('Facebook', testUserId);
  assert.strictEqual(fbStatusConnected.status, 'CONNECTED');
  assert.strictEqual(fbStatusConnected.channelTitle, 'Autora Creator Page');
  console.log('✓ Facebook Page connection recognized via Meta Graph integration.');

  // Test 3: Facebook Video Publishing - Missing File Guard
  console.log('[Test 3] Testing missing file guard for Facebook video publishing...');
  const missingFileRes = await facebookProvider.publishVideo({
    userId: testUserId,
    videoFilePath: 'd:/nonexistent/fb_video.mp4',
    title: 'Facebook Viral Video',
    description: 'Breakdown of AI Tech',
    aspectRatio: '16:9',
  });
  assert.strictEqual(missingFileRes.success, false);
  assert(missingFileRes.error?.includes('not found'), 'Must return clean error on missing file');
  console.log('✓ Facebook missing file guard validated.');

  // Test 4: Facebook Reels (9:16 Vertical) vs Feed/Watch (16:9 Horizontal) Provider API
  console.log('[Test 4] Testing Facebook provider methods for vertical Reels & horizontal Watch...');
  assert.strictEqual(typeof facebookProvider.publishVideo, 'function');
  assert.strictEqual(typeof facebookProvider.publishReel, 'function');
  console.log('✓ Facebook provider exports both publishVideo (horizontal & vertical feed) and publishReel.');

  // Test 5: Platform-Specific Hook Adaptation Engine for Facebook, TikTok, Instagram & YouTube
  console.log('[Test 5] Testing Platform-Specific Hook Adaptation Engine...');
  const topic = 'Artificial Intelligence & The Future of Work';

  // A. Facebook Hook Adaptation
  const fbHook = personalCreatorScriptService.adaptHookForPlatform(topic, 'Facebook', 3);
  assert.strictEqual(fbHook.platform, 'Facebook');
  assert(fbHook.hookNarration.includes('stop scrolling'), 'Facebook hook must address silent scrolling');
  assert(fbHook.visualCaptionOverlay.includes('THE UNCOMFORTABLE TRUTH'), 'Must generate high-contrast silent caption');
  assert.strictEqual(fbHook.pacingWordsPerMinute, 145, 'Facebook pacing should be empathetic & conversational (145 WPM)');
  assert(fbHook.callToAction.includes('comments'), 'Facebook CTA must drive comment thread discussion');
  assert(fbHook.monetizationTip.includes('In-Stream mid-roll'), 'Must include 3+ min In-Stream monetization tips');
  console.log('✓ Facebook hook correctly adapted:');
  console.log('    Hook Narration:', fbHook.hookNarration);
  console.log('    Visual Overlay:', fbHook.visualCaptionOverlay);
  console.log('    CTA:', fbHook.callToAction);

  // B. TikTok Hook Adaptation
  const ttHook = personalCreatorScriptService.adaptHookForPlatform(topic, 'TikTok', 3);
  assert.strictEqual(ttHook.platform, 'TikTok');
  assert(ttHook.hookNarration.includes('Wait, stop scrolling!'), 'TikTok hook must use fast sensory pattern interrupt');
  assert.strictEqual(ttHook.pacingWordsPerMinute, 170, 'TikTok pacing should be fast (170 WPM)');
  assert(ttHook.monetizationTip.includes('Creator Rewards'), 'TikTok hook includes Creator Rewards tip');
  console.log('✓ TikTok hook correctly adapted (170 WPM, pattern interrupt).');

  // C. Instagram Hook Adaptation
  const igHook = personalCreatorScriptService.adaptHookForPlatform(topic, 'Instagram', 1.5);
  assert.strictEqual(igHook.platform, 'Instagram');
  assert(igHook.hookNarration.includes('Save this breakdown'), 'Instagram hook must drive Saves');
  assert.strictEqual(igHook.pacingWordsPerMinute, 155, 'Instagram pacing calibrated at 155 WPM');
  console.log('✓ Instagram hook correctly adapted (Save & Share trigger).');

  // D. YouTube Hook Adaptation
  const ytHook = personalCreatorScriptService.adaptHookForPlatform(topic, 'YouTube', 5);
  assert.strictEqual(ytHook.platform, 'YouTube');
  assert(ytHook.callToAction.includes('subscribe'), 'YouTube CTA must drive subscribers');
  console.log('✓ YouTube hook correctly adapted.');

  // Test 6: Verify Facebook Narrative Frameworks
  console.log('[Test 6] Verifying Facebook-specific Narrative Frameworks registered in engine...');
  const fbFrameworkEmpathy = FACEBOOK_NARRATIVE_FRAMEWORKS.find((f) => f.id === 'facebook_viral_empathy');
  const fbFrameworkMonetize = FACEBOOK_NARRATIVE_FRAMEWORKS.find((f) => f.id === 'facebook_in_stream_monetization');

  assert(fbFrameworkEmpathy, 'Facebook Viral Empathy framework must exist');
  assert(fbFrameworkMonetize, 'Facebook In-Stream Monetization framework must exist');
  assert(fbFrameworkEmpathy.structure.some((s) => s.includes('Silent-Autoplay')), 'Empathy framework must include silent autoplay step');
  assert(fbFrameworkMonetize.structure.some((s) => s.includes('Mid-Roll')), 'Monetization framework must include mid-roll turning point');
  console.log('✓ Facebook Narrative Frameworks verified in rotation engine.');

  // Clean up
  db.prepare('DELETE FROM oauth_connections WHERE id = ?').run(fbConnId);

  console.log('\n========================================================================');
  console.log('   🎉 ALL FACEBOOK INTEGRATION & HOOK ADAPTATION TESTS PASSED 100%!');
  console.log('========================================================================\n');
}

runFacebookIntegrationTests().catch((err) => {
  console.error('Test run failed:', err);
  process.exit(1);
});
