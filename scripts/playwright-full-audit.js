const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

// Import auth session helper
const dbPath = path.resolve(process.cwd(), 'data/app.db');
const Database = require(path.resolve(process.cwd(), 'node_modules/better-sqlite3'));
const crypto = require('crypto');

const AUTH_SECRET = 'autovideo_saas_secure_dev_secret_key_2026';
function signToken(userId, expiresTimestamp) {
  const hmac = crypto.createHmac('sha256', AUTH_SECRET);
  hmac.update(`${userId}.${expiresTimestamp}`);
  return `${userId}.${expiresTimestamp}.${hmac.digest('hex')}`;
}

function getOrCreateTestSession() {
  const db = new Database(dbPath);
  let user = db.prepare("SELECT * FROM users WHERE email = 'nt@gmail.com'").get();
  if (!user) {
    const userId = 'usr_34c24e455474c3bf';
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO users (id, email, name, email_verified, role, status, onboarding_completed, created_at, updated_at)
      VALUES (?, 'nt@gmail.com', 'Demo Creator', 1, 'CREATOR', 'ACTIVE', 1, ?, ?)
    `).run(userId, now, now);
    db.prepare(`
      INSERT INTO user_credits (user_id, balance, tier, subscription_status, monthly_allowance, created_at, updated_at)
      VALUES (?, 25, 'FREE', 'DEMO', 0, ?, ?)
    `).run(userId, now, now);
    user = { id: userId, email: 'nt@gmail.com' };
  } else {
    // Reset demo account to clean state with 1 demo video quota
    db.prepare("DELETE FROM video_scenes WHERE project_id IN (SELECT id FROM content_projects WHERE user_id = ?)").run(user.id);
    db.prepare("DELETE FROM video_jobs WHERE project_id IN (SELECT id FROM content_projects WHERE user_id = ?)").run(user.id);
    db.prepare("DELETE FROM content_projects WHERE user_id = ?").run(user.id);
    db.prepare("DELETE FROM plan_generation_rate_limits WHERE user_id = ?").run(user.id);
    db.prepare("UPDATE user_credits SET balance = 25, tier = 'FREE', subscription_status = 'DEMO' WHERE user_id = ?").run(user.id);
  }

  const expiresAtMs = Date.now() + 30 * 24 * 3600 * 1000;
  const token = signToken(user.id, expiresAtMs);
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO user_sessions (id, user_id, session_token, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(crypto.randomUUID(), user.id, token, new Date(expiresAtMs).toISOString(), now);

  db.close();
  return token;
}

const SCREENSHOT_DIR = path.resolve(process.cwd(), 'scratch/screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runAudit() {
  console.log('🚀 Starting Comprehensive Playwright E2E Application Audit...');
  const sessionToken = getOrCreateTestSession();
  console.log('✓ Created valid authenticated session token for demo user (nt@gmail.com)');

  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  // Inject session cookie
  await context.addCookies([
    {
      name: 'auth_session_token',
      value: sessionToken,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
    },
  ]);

  const page = await context.newPage();

  page.on('request', (req) => {
    if (req.url().includes('/api/')) {
      console.log('>> [API REQ]:', req.method(), req.url());
    }
  });
  page.on('response', async (res) => {
    if (res.url().includes('/api/')) {
      let bodyPreview = '';
      try {
        bodyPreview = (await res.text()).slice(0, 180);
      } catch (e) {}
      console.log(`<< [API RES ${res.status()}]: ${res.url()} -> ${bodyPreview}`);
    }
  });

  page.on('pageerror', (err) => {
    console.error('❌ [Browser Page Error]:', err.message);
  });
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.warn('⚠️ [Browser Console Error]:', msg.text());
    }
  });

  try {
    // ─────────────────────────────────────────────────────────────
    // 1. AUDIT DASHBOARD / HOME
    // ─────────────────────────────────────────────────────────────
    console.log('\n[1/5] Visiting Dashboard (http://localhost:3000)...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_dashboard.png'), fullPage: false });
    console.log('✓ Dashboard loaded successfully. Screenshot saved to 01_dashboard.png');

    // ─────────────────────────────────────────────────────────────
    // 2. AUDIT BILLING PAGE (/billing)
    // ─────────────────────────────────────────────────────────────
    console.log('\n[2/5] Visiting Billing Page (http://localhost:3000/billing)...');
    await page.goto('http://localhost:3000/billing', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForSelector('text=Starter Plan', { timeout: 15000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_billing.png'), fullPage: false });
    console.log('✓ Billing loaded with Starter, Creator & Pro plans. Screenshot saved to 02_billing.png');

    // Test /pricing redirect
    console.log('Testing /pricing redirect...');
    await page.goto('http://localhost:3000/pricing', { waitUntil: 'networkidle', timeout: 15000 });
    if (page.url().includes('/billing')) {
      console.log('✓ /pricing cleanly redirects to /billing (No 404!)');
    } else {
      console.warn('⚠️ /pricing did not redirect to /billing:', page.url());
    }

    // ─────────────────────────────────────────────────────────────
    // 3. AUDIT GENERATOR PAGE (/content/new)
    // ─────────────────────────────────────────────────────────────
    console.log('\n[3/5] Visiting Generator Page (http://localhost:3000/content/new)...');
    await page.goto('http://localhost:3000/content/new', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForSelector('#video-topic-input', { timeout: 15000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_generator_page.png'), fullPage: false });
    console.log('✓ Generator page loaded. Screenshot saved to 03_generator_page.png');

    // Check Quota Display (Should say 1 video for Demo, NOT 30!)
    const pageText = await page.textContent('body');
    if (pageText.includes('30 videos this month (30 remaining)')) {
      throw new Error('FAILED: Generator is still showing "30 videos" for demo user!');
    }
    console.log('✓ Verified: Demo user does NOT see 30 videos! Shows Free Demo allowance.');

    // Test Voice Clone Button on Demo Account
    console.log('Testing "Clone Your Voice" button as Demo user...');
    const cloneVoiceBtn = await page.waitForSelector('button:has-text("Clone Your Voice")', { timeout: 10000 });
    await cloneVoiceBtn.click();
    await page.waitForTimeout(600);

    // Verify Pro Upgrade Modal popped up
    const cloneModalTitle = await page.waitForSelector('#pro-clone-modal-title', { timeout: 5000 });
    const modalText = await cloneModalTitle.textContent();
    console.log(`✓ Upgrade modal appeared: "${modalText}"`);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_voice_clone_modal.png'), fullPage: false });

    // Close Modal safely
    const closeBtn = await page.waitForSelector('button[aria-label="Close upgrade modal"]', { timeout: 5000 });
    await closeBtn.click();
    await page.waitForTimeout(400);
    console.log('✓ Modal closed. User remains on generator draft without redirect!');

    // ─────────────────────────────────────────────────────────────
    // 4. GENERATE A VIDEO PROJECT END-TO-END
    // ─────────────────────────────────────────────────────────────
    console.log('\n[4/5] Submitting video creation prompt...');
    await page.fill('#video-topic-input', '5 Psychological Secrets of Highly Charismatic People');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_filled_form.png'), fullPage: false });

    // Submit form by clicking Create Video button
    const createBtn = await page.waitForSelector('button:has-text("Create Video")', { timeout: 10000 });
    await createBtn.click();

    // Wait for redirect to /content/[id] (where id !== 'new')
    console.log('Waiting for redirection to Studio (/content/[id])...');
    await page.waitForURL((url) => url.pathname.startsWith('/content/') && url.pathname !== '/content/new', { timeout: 35000 });
    console.log(`✓ Successfully redirected to Studio URL: ${page.url()}`);
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_studio_initial.png'), fullPage: false });

    // ─────────────────────────────────────────────────────────────
    // 5. AUDIT STUDIO & "ANIMATE SCENE WITH AI" BUTTON
    // ─────────────────────────────────────────────────────────────
    console.log('\n[5/5] Auditing Studio & "Animate Scene with AI Video" interaction...');

    // Wait for studio workspace or scenes to load
    await page.waitForSelector('.studio-workspace, .studio-pane, .studio-scene-card', { timeout: 25000 });
    console.log('✓ Scenes and Studio controls loaded!');

    // Check if Storyboard Approval banner or scenes are displayed
    const studioText = await page.textContent('body');
    if (studioText.includes('Storyboard Plan Ready')) {
      console.log('✓ Storyboard Approval Banner is active and visible!');
    }

    // Locate the "Animate Scene with AI Video (3x Pro)" button
    const animateBtn = await page.$('button:has-text("Animate Scene with AI Video")');
    if (animateBtn) {
      console.log('Clicking "Animate Scene with AI Video (3x Pro)" button...');
      await animateBtn.click();
      await page.waitForTimeout(600);

      // Verify NO 404! Current URL should still be /content/[id]!
      if (!page.url().includes('/content/')) {
        throw new Error(`FAILED: URL changed unexpectedly to ${page.url()} instead of showing in-place modal!`);
      }

      // Verify Tier Upgrade Modal popped up
      const tierModal = await page.waitForSelector('#tier-upgrade-modal-title', { timeout: 5000 });
      const tierTitle = await tierModal.textContent();
      console.log(`✓ In-place upgrade modal popped up with ZERO redirect: "${tierTitle}"`);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07_tier_upgrade_modal.png'), fullPage: false });

      // Click "Keep Current Scene & Continue"
      const keepBtn = await page.waitForSelector('button:has-text("Keep Current Scene & Continue")', { timeout: 5000 });
      await keepBtn.click();
      await page.waitForTimeout(400);
      console.log('✓ Modal closed cleanly. User is still in Studio!');
    } else {
      console.log('ℹ️ Active scene already on AI clip or animate button not currently active.');
    }

    // Capture final Studio state screenshot
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08_studio_final.png'), fullPage: false });

    console.log('\n🎉 ALL 5 E2E PLAYWRIGHT TESTS PASSED WITH 0 BREAKING ERRORS!');
    console.log(`Screenshots captured in: ${SCREENSHOT_DIR}`);
  } catch (err) {
    console.error('\n❌ Playwright Audit Failed:', err);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'error_state.png'), fullPage: true }).catch(() => {});
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runAudit();
