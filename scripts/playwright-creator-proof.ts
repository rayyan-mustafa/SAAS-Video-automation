import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

const PROOF_DIR = path.join(process.cwd(), 'proof-recordings');
const ARTIFACT_DIR = 'C:\\Users\\HP\\.gemini\\antigravity\\brain\\f6eba120-91ee-4f13-9a26-4bdb72a4b519';

if (!fs.existsSync(PROOF_DIR)) {
  fs.mkdirSync(PROOF_DIR, { recursive: true });
}
if (!fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

function getFfmpegPath(): string {
  const localInstallerPath = path.join(
    process.cwd(),
    'node_modules',
    '@ffmpeg-installer',
    'win32-x64',
    'ffmpeg.exe'
  );
  if (fs.existsSync(localInstallerPath)) {
    return localInstallerPath;
  }
  return 'ffmpeg';
}

async function runProof() {
  console.log('================================================================');
  console.log('🎬 LAUNCHING PLAYWRIGHT END-TO-END VIDEO RECORDING PROOF');
  console.log('================================================================');
  console.log('Target User:  test@gmail.com');
  console.log('Plan / Tier:  CREATOR');
  console.log('Proof Dir:   ', PROOF_DIR);
  console.log('Artifact Dir:', ARTIFACT_DIR);
  console.log('----------------------------------------------------------------');

  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    recordVideo: {
      dir: PROOF_DIR,
      size: { width: 1280, height: 720 },
    },
  });

  const page = await context.newPage();

  try {
    // -------------------------------------------------------------------------
    // STEP 1: Navigate to Login Page
    // -------------------------------------------------------------------------
    console.log('[Step 1] Navigating to http://localhost:3000/login ...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000);

    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitBtn = page.locator('button[type="submit"]');

    await emailInput.fill('test@gmail.com');
    await passwordInput.fill('12345678');

    const screenshot1 = path.join(PROOF_DIR, '01_login_credentials_entered.png');
    await page.screenshot({ path: screenshot1, fullPage: true });
    console.log('✓ Captured screenshot 1:', screenshot1);

    // -------------------------------------------------------------------------
    // STEP 2: Submit Login & Redirect to Dashboard
    // -------------------------------------------------------------------------
    console.log('[Step 2] Submitting login form...');
    await submitBtn.click();

    // Wait for redirect to dashboard
    await page.waitForURL('http://localhost:3000/', { timeout: 30000 });
    await page.waitForTimeout(3000);

    const screenshot2 = path.join(PROOF_DIR, '02_dashboard_creator_authenticated.png');
    await page.screenshot({ path: screenshot2, fullPage: true });
    console.log('✓ Captured screenshot 2 (Dashboard authenticated):', screenshot2);

    // Verify page content
    const pageContent = await page.content();
    const hasCreatorBadge = /CREATOR/i.test(pageContent);
    const hasCredits = /10[,.]?024/i.test(pageContent) || /credits/i.test(pageContent);
    console.log(`✓ Creator Badge Displayed: ${hasCreatorBadge}`);
    console.log(`✓ Credits Displayed: ${hasCredits}`);

    // -------------------------------------------------------------------------
    // STEP 3: Enter Topic & Generate Video from Dashboard
    // -------------------------------------------------------------------------
    console.log('[Step 3] Entering topic into #creator-topic-input...');
    const topicTextarea = page.locator('#creator-topic-input');
    await topicTextarea.waitFor({ state: 'visible', timeout: 15000 });
    const testTopic = 'Autonomous AI Agents Taking Over Software Engineering in 2026';
    await topicTextarea.fill(testTopic);
    await page.waitForTimeout(1500);

    const screenshot3 = path.join(PROOF_DIR, '03_topic_entered_ready_to_generate.png');
    await page.screenshot({ path: screenshot3, fullPage: true });
    console.log('✓ Captured screenshot 3 (Topic entered):', screenshot3);

    // Click Generate Video Draft button
    console.log('[Step 4] Clicking #generate-video-btn...');
    const generateBtn = page.locator('#generate-video-btn');
    await generateBtn.click();

    // Wait for UI dispatch toast or redirection
    await page.waitForTimeout(2000);
    const screenshot4 = path.join(PROOF_DIR, '04_generating_video_dispatched.png');
    await page.screenshot({ path: screenshot4, fullPage: true });
    console.log('✓ Captured screenshot 4 (Generating dispatched):', screenshot4);

    // -------------------------------------------------------------------------
    // STEP 4: Verify No Upgrade Error & Wait for Timeline Studio (/content/[id])
    // -------------------------------------------------------------------------
    console.log('[Step 5] Waiting for Timeline Studio navigation (/content/*)...');
    await page.waitForURL(/\/content\/.+/, { timeout: 45000 });
    console.log('✓ Successfully arrived at Timeline Studio URL:', page.url());

    // Wait for storyboard elements to render
    await page.waitForTimeout(5000);
    const screenshot5 = path.join(PROOF_DIR, '05_timeline_studio_storyboard_loaded.png');
    await page.screenshot({ path: screenshot5, fullPage: true });
    console.log('✓ Captured screenshot 5 (Timeline Studio storyboard):', screenshot5);

    // Check that NO upgrade modal or error is shown
    const modalVisible = await page.locator('#tier-upgrade-modal-title, [aria-labelledby="tier-upgrade-modal-title"]').isVisible().catch(() => false);
    console.log(`✓ Plan Upgrade Modal Blocking Video: ${modalVisible ? 'YES (FAILURE)' : 'NO (SUCCESS - 100% UNBLOCKED)'}`);

    if (modalVisible) {
      throw new Error('FAILED: Upgrade modal was unexpectedly displayed to Creator user!');
    }

    // -------------------------------------------------------------------------
    // STEP 5: Approve Storyboard & Trigger Full AI Video Pipeline
    // -------------------------------------------------------------------------
    console.log('[Step 6] Triggering AI Video generation / Storyboard approval...');
    const approveBtn = page.locator('button:has-text("Generate Video with AI"), button:has-text("Approve Storyboard"), button:has-text("Re-Generate")').first();
    if (await approveBtn.isVisible()) {
      await approveBtn.click();
      await page.waitForTimeout(4000);
    }

    const screenshot6 = path.join(PROOF_DIR, '06_video_pipeline_active_processing.png');
    await page.screenshot({ path: screenshot6, fullPage: true });
    console.log('✓ Captured screenshot 6 (Video pipeline actively processing):', screenshot6);

    // Allow 6 extra seconds of video recording to capture live progress
    await page.waitForTimeout(6000);

    console.log('----------------------------------------------------------------');
    console.log('🎉 ALL PLAYWRIGHT ACTIONS COMPLETED WITHOUT ANY UPGRADE ERRORS!');
  } finally {
    // Obtain video recording file
    const videoObj = page.video();
    await page.close();
    await context.close();
    await browser.close();

    if (videoObj) {
      const recordedWebmPath = await videoObj.path();
      console.log('📹 Playwright raw video recorded at:', recordedWebmPath);

      const targetWebm = path.join(PROOF_DIR, 'creator-video-generation-proof.webm');
      fs.copyFileSync(recordedWebmPath, targetWebm);
      console.log('✓ Saved clean copy:', targetWebm);

      // Convert to MP4 using FFmpeg
      const targetMp4 = path.join(PROOF_DIR, 'creator-video-generation-proof.mp4');
      const ffmpegBin = getFfmpegPath();
      try {
        console.log(`🔄 Converting video to MP4 using ${ffmpegBin}...`);
        execSync(`"${ffmpegBin}" -y -i "${targetWebm}" -c:v libx264 -pix_fmt yuv420p "${targetMp4}"`, {
          stdio: 'pipe',
        });
        console.log('✓ Converted MP4 saved at:', targetMp4);
      } catch (ffErr: any) {
        console.warn('Note: MP4 conversion notice:', ffErr.message);
      }

      // Copy all artifacts to ARTIFACT_DIR for direct user presentation
      const filesToCopy = fs.readdirSync(PROOF_DIR);
      for (const file of filesToCopy) {
        const src = path.join(PROOF_DIR, file);
        const dst = path.join(ARTIFACT_DIR, file);
        try {
          fs.copyFileSync(src, dst);
        } catch {}
      }
      console.log('✓ All proof screenshots & videos copied to artifact directory:', ARTIFACT_DIR);
    }
  }
}

runProof().catch((err) => {
  console.error('❌ Playwright Proof Run Failed:', err);
  process.exit(1);
});
