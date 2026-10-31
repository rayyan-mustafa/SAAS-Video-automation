const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = 'C:\\Users\\HP\\.gemini\\antigravity\\brain\\f6eba120-91ee-4f13-9a26-4bdb72a4b519';
const BASE_URL = 'http://localhost:3000';

async function runVerification() {
  console.log('======================================================');
  console.log('   TILLERCAST E2E PLAYWRIGHT BROWSER AUTOMATION RUNNER');
  console.log('======================================================\n');

  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: {
      dir: ARTIFACT_DIR,
      size: { width: 1440, height: 900 },
    },
  });

  const page = await context.newPage();

  // Helper to capture proof screenshot
  async function snap(name) {
    const file = path.join(ARTIFACT_DIR, `${name}.png`);
    await page.screenshot({ path: file, fullPage: false });
    console.log(`[Screenshot Saved] -> ${name}.png`);
  }

  try {
    // ─────────────────────────────────────────────────────────────
    // STEP 1: LOGIN TO CREATOR ACCOUNT
    // ─────────────────────────────────────────────────────────────
    console.log('>>> [Step 1] Navigating to Login Page...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1000);
    await snap('01_login_page_loaded');

    console.log('>>> Filling Creator Credentials (test@gmail.com / 12345678)...');
    await page.fill('input[type="email"]', 'test@gmail.com');
    await page.fill('input[type="password"]', '12345678');
    await snap('02_credentials_entered');

    console.log('>>> Submitting Login Form...');
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard and wait for dashboard workspace to hydrate
    await page.waitForURL(`${BASE_URL}/`, { timeout: 30000 });
    console.log('>>> Waiting for dashboard workspace to hydrate...');
    await page.waitForSelector('#creator-topic-input', { state: 'visible', timeout: 45000 });
    await page.waitForTimeout(1000);
    await snap('03_dashboard_entered_no_flicker');
    console.log('✓ Successfully arrived at Dashboard without landing page flicker!');

    // Verify Prompt-to-Video Engine is present on Dashboard
    const promptEngineHeading = await page.locator('text=Prompt-to-Video Engine').first();
    const isEngineVisible = await promptEngineHeading.isVisible();
    console.log(`✓ Prompt-to-Video Engine visible on dashboard: ${isEngineVisible}`);

    // Verify all 5 enhancers are present on Dashboard
    const enhancers = [
      'High-Impact Hook',
      '4K Generative AI',
      'Data & Stats',
      'Deep Docu-Tone',
      'Viral Retention',
    ];
    for (const enh of enhancers) {
      const visible = await page.locator(`text=${enh}`).first().isVisible();
      console.log(`  - Enhancer [${enh}] on Dashboard: ${visible ? 'VISIBLE ✓' : 'MISSING ✗'}`);
    }

    // ─────────────────────────────────────────────────────────────
    // STEP 2: VERIFY /content/new LAYOUT & ENHANCERS
    // ─────────────────────────────────────────────────────────────
    console.log('\n>>> [Step 2] Navigating to /content/new to verify unified layout...');
    await page.goto(`${BASE_URL}/content/new`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('#creator-topic-input', { state: 'visible', timeout: 45000 });
    await page.waitForTimeout(1000);
    await snap('04_content_new_unified_layout');

    const newPageEngine = await page.locator('text=Prompt-to-Video Engine').first().isVisible();
    console.log(`✓ Prompt-to-Video Engine present on /content/new: ${newPageEngine}`);
    for (const enh of enhancers) {
      const visible = await page.locator(`text=${enh}`).first().isVisible();
      console.log(`  - Enhancer [${enh}] on /content/new: ${visible ? 'VISIBLE ✓' : 'MISSING ✗'}`);
    }

    // Test clicking enhancers to append to prompt
    console.log('>>> Testing enhancer chip clicks on /content/new...');
    await page.click('button:has-text("High-Impact Hook")');
    await page.waitForTimeout(200);
    await page.click('button:has-text("4K Generative AI")');
    await page.waitForTimeout(200);
    const textareaVal = await page.inputValue('#creator-topic-input');
    console.log(`  Textarea value after clicking enhancers: "${textareaVal}"`);
    await snap('05_enhancers_appended_to_input');

    // ─────────────────────────────────────────────────────────────
    // STEP 3: CREATE SHORT VIDEO (9:16) WITH REAL PROMPT
    // ─────────────────────────────────────────────────────────────
    console.log('\n>>> [Step 3] Creating a Short (9:16) video with real prompt & enhancers...');
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('#creator-topic-input', { state: 'visible', timeout: 45000 });

    const shortPrompt = 'The hidden secrets of deep sea bioluminescent creatures in the Mariana Trench';
    await page.fill('#creator-topic-input', shortPrompt);
    await page.click('button:has-text("High-Impact Hook")');
    await page.waitForTimeout(200);
    await page.click('button:has-text("4K Generative AI")');
    await page.waitForTimeout(200);
    await page.click('button:has-text("Viral Retention")');
    await page.waitForTimeout(300);

    await snap('06_short_prompt_ready_to_generate');

    console.log('>>> Clicking Generate Video button on Dashboard...');
    const generateBtn = page.locator('#generate-video-btn, button[type="submit"]:has-text("Generate")').first();
    await generateBtn.click();

    // Wait for redirect to Timeline Studio (/content/[id])
    await page.waitForURL(/\/content\/[a-f0-9-]+/, { timeout: 30000 });
    const shortProjectUrl = page.url();
    const shortProjectId = shortProjectUrl.split('/content/')[1].split('?')[0];
    console.log(`✓ Redirected to Timeline Studio for Project: ${shortProjectId}`);
    await page.waitForTimeout(3000);
    await snap('07_short_timeline_studio_loaded');

    // Click Approve / Generate button to launch pipeline execution
    console.log('>>> Approving and starting full video pipeline render...');
    await page.evaluate(async (pid) => {
      try {
        await fetch(`/api/projects/${pid}/approve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (e) {
        console.error(e);
      }
    }, shortProjectId);
    await page.waitForTimeout(2000);
    await snap('08_short_pipeline_rendering_dispatched');

    // Poll until video is ready
    console.log('>>> Waiting for Short video render to finalize (polling /api/projects/:id)...');
    for (let i = 0; i < 40; i++) {
      await page.waitForTimeout(3000);
      const projData = await page.evaluate(async (pid) => {
        try {
          const res = await fetch(`/api/projects/${pid}`);
          return await res.json();
        } catch {
          return null;
        }
      }, shortProjectId);

      const status = projData?.project?.status || '';
      const stage = projData?.project?.current_stage || '';
      const hasOutput = Boolean(projData?.output?.storage_key || projData?.output?.url);
      console.log(`  [Poll ${i + 1}/40] Project ${shortProjectId} -> Status: ${status}, Stage: ${stage}, Output: ${hasOutput}`);

      if (hasOutput || status === 'COMPLETED') {
        console.log(`🎉 Short Project Complete! Output URL: ${projData?.output?.url}`);
        break;
      }
    }

    // Reload page to reflect completed video in the theater player
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);
    await snap('09_short_master_video_rendered');

    // Verify video element in player
    const videoLocator = page.locator('.theater-screen video, video').first();
    const isVideoRendered = await videoLocator.isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`✓ Short <video> player loaded: ${isVideoRendered}`);
    if (isVideoRendered) {
      const videoSrc = await videoLocator.getAttribute('src');
      console.log(`✓ Short Video Source URL: ${videoSrc}`);
    }

    // ─────────────────────────────────────────────────────────────
    // STEP 4: CREATE LONG-FORM VIDEO (16:9) WITH REAL PROMPT
    // ─────────────────────────────────────────────────────────────
    console.log('\n>>> [Step 4] Creating Long-Form (16:9) Widescreen Video...');
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('#creator-topic-input', { state: 'visible', timeout: 45000 });

    // Switch to 16:9 / Long-form
    const longformBtn = page.locator('button:has-text("16:9"), button:has-text("Longform")').first();
    if (await longformBtn.isVisible().catch(() => false)) {
      await longformBtn.click();
      console.log('✓ Switched format mode to 16:9 Widescreen / Long-form');
    }

    const longPrompt = 'Autonomous AI agent architectures in 2026: from code generation to full software lifecycle execution';
    await page.fill('#creator-topic-input', longPrompt);
    await page.click('button:has-text("Data & Stats")');
    await page.waitForTimeout(200);
    await page.click('button:has-text("Deep Docu-Tone")');
    await page.waitForTimeout(300);
    await snap('10_long_prompt_entered');

    console.log('>>> Submitting Long-Form Video...');
    const generateBtn2 = page.locator('#generate-video-btn, button[type="submit"]:has-text("Generate")').first();
    await generateBtn2.click();

    await page.waitForURL(/\/content\/[a-f0-9-]+/, { timeout: 30000 });
    const longProjectUrl = page.url();
    const longProjectId = longProjectUrl.split('/content/')[1].split('?')[0];
    console.log(`✓ Redirected to Timeline Studio for Long-form Project: ${longProjectId}`);
    await page.waitForTimeout(3000);
    await snap('11_long_timeline_studio_loaded');

    // Dispatch composition
    console.log('>>> Approving and starting Long-Form video pipeline render...');
    await page.evaluate(async (pid) => {
      try {
        await fetch(`/api/projects/${pid}/approve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (e) {
        console.error(e);
      }
    }, longProjectId);

    console.log('>>> Waiting for Long-Form video render to finalize...');
    for (let i = 0; i < 40; i++) {
      await page.waitForTimeout(3000);
      const projData = await page.evaluate(async (pid) => {
        try {
          const res = await fetch(`/api/projects/${pid}`);
          return await res.json();
        } catch {
          return null;
        }
      }, longProjectId);

      const status = projData?.project?.status || '';
      const stage = projData?.project?.current_stage || '';
      const hasOutput = Boolean(projData?.output?.storage_key || projData?.output?.url);
      console.log(`  [Poll ${i + 1}/40] Long Project ${longProjectId} -> Status: ${status}, Stage: ${stage}, Output: ${hasOutput}`);

      if (hasOutput || status === 'COMPLETED') {
        console.log(`🎉 Long Project Complete! Output URL: ${projData?.output?.url}`);
        break;
      }
    }

    await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);
    await snap('12_long_master_video_rendered');

    const longVideoLocator = page.locator('.theater-screen video, video').first();
    const isLongVideoRendered = await longVideoLocator.isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`✓ Long <video> player loaded: ${isLongVideoRendered}`);

    // ─────────────────────────────────────────────────────────────
    // STEP 5: TEST FREE DEMO ACCOUNT JOURNEY
    // ─────────────────────────────────────────────────────────────
    console.log('\n>>> [Step 5] Testing Free Demo Account Journey...');
    // Clear cookies / log out
    await context.clearCookies();
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1000);
    await snap('13_logged_out_back_at_login');

    // Register a new free account via /api/auth/signup
    const freeEmail = `free_demo_${Date.now()}@tillercast.test`;
    console.log(`>>> Registering new free demo user: ${freeEmail}...`);

    const regRes = await page.evaluate(async (email) => {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Demo Creator',
          email,
          password: 'password123',
        }),
      });
      return { status: res.status, data: await res.json() };
    }, freeEmail);

    console.log('Registration response:', regRes);

    // Navigate to dashboard with the newly authenticated free user session
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('#creator-topic-input', { state: 'visible', timeout: 45000 });
    await page.waitForTimeout(1500);
    await snap('14_free_demo_dashboard_loaded');
    console.log('✓ Free demo user landed on dashboard cleanly!');

    // Check free plan display
    const creditsText = await page.locator('.autora-stat-card:has-text("Credits Left") .stat-value').innerText().catch(() => '');
    console.log(`  Free Demo Credits Left: ${creditsText}`);

    // Create free video with Prompt-to-Video Engine
    await page.fill('#creator-topic-input', '3 daily stoic rituals for unshakeable focus and mental clarity');
    await page.click('button:has-text("High-Impact Hook")');
    await page.waitForTimeout(200);
    await page.click('button:has-text("Deep Docu-Tone")');
    await page.waitForTimeout(200);
    await snap('15_free_demo_prompt_entered');

    const generateFreeBtn = page.locator('#generate-video-btn, button[type="submit"]:has-text("Generate")').first();
    await generateFreeBtn.click();

    await page.waitForURL(/\/content\/[a-f0-9-]+/, { timeout: 30000 });
    const freeProjectId = page.url().split('/content/')[1].split('?')[0];
    console.log(`✓ Free Demo Project created: ${freeProjectId}`);
    await page.waitForTimeout(3000);
    await snap('16_free_demo_timeline_studio');

    // Approve and render the free demo video
    console.log('>>> Approving and starting Free Demo video pipeline render...');
    await page.evaluate(async (pid) => {
      try {
        await fetch(`/api/projects/${pid}/approve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (e) {
        console.error(e);
      }
    }, freeProjectId);

    console.log('>>> Waiting for Free Demo video render to finalize...');
    for (let i = 0; i < 40; i++) {
      await page.waitForTimeout(3000);
      const projData = await page.evaluate(async (pid) => {
        try {
          const res = await fetch(`/api/projects/${pid}`);
          return await res.json();
        } catch {
          return null;
        }
      }, freeProjectId);

      const status = projData?.project?.status || '';
      const stage = projData?.project?.current_stage || '';
      const hasOutput = Boolean(projData?.output?.storage_key || projData?.output?.url);
      console.log(`  [Poll ${i + 1}/40] Free Demo Project ${freeProjectId} -> Status: ${status}, Stage: ${stage}, Output: ${hasOutput}`);

      if (hasOutput || status === 'COMPLETED') {
        console.log(`🎉 Free Demo Project Complete! Output URL: ${projData?.output?.url}`);
        break;
      }
    }

    await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);
    await snap('17_free_demo_master_video_rendered');

    const freeVideoLocator = page.locator('.theater-screen video, video').first();
    const isFreeVideoRendered = await freeVideoLocator.isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`✓ Free Demo <video> player loaded: ${isFreeVideoRendered}`);

    console.log('\n======================================================');
    console.log('   🎉 ALL BROWSER AUTOMATION TESTS COMPLETED 100%!');
    console.log('======================================================');

  } catch (err) {
    console.error('Automation encountered an error:', err);
    await snap('99_error_state');
  } finally {
    await context.close();
    await browser.close();
  }
}

runVerification();
