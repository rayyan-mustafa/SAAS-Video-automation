const { chromium } = require('playwright');
const path = require('path');

async function testInVideoStudio() {
  const browser = await chromium.launch({
    headless: true,
    channel: 'msedge',
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  const page = await context.newPage();

  // Log all console logs and network errors
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.error('PAGE ERROR:', err.message));

  // 1. Login as test@gmail.com
  console.log('Logging in as test@gmail.com...');
  await page.goto('http://localhost:3000/login');
  await page.fill('input[type="email"]', 'test@gmail.com');
  await page.fill('input[type="password"]', '12345678');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);

  // 2. Navigate directly to the completed project
  const projectId = '09d91ba7-b834-40f3-8084-fd55b889d391';
  console.log(`Navigating to project studio: http://localhost:3000/content/${projectId}`);
  await page.goto(`http://localhost:3000/content/${projectId}`);

  // Wait for video element
  await page.waitForSelector('video', { timeout: 15000 });
  await page.waitForTimeout(2000);

  // Inspect video element state
  const videoState = await page.evaluate(() => {
    const v = document.querySelector('video');
    if (!v) return { exists: false };
    return {
      exists: true,
      src: v.src,
      currentSrc: v.currentSrc,
      readyState: v.readyState,
      videoWidth: v.videoWidth,
      videoHeight: v.videoHeight,
      duration: v.duration,
      paused: v.paused,
      muted: v.muted,
      hasControls: v.hasAttribute('controls'),
      error: v.error ? { code: v.error.code, message: v.error.message } : null,
    };
  });

  console.log('Video element state:', videoState);

  // Take screenshot 1: Loaded studio with InVideo layout
  const screenshotPath1 = path.resolve('C:/Users/HP/.gemini/antigravity/brain/f6eba120-91ee-4f13-9a26-4bdb72a4b519/01_invideo_studio_clean.png');
  await page.screenshot({ path: screenshotPath1, fullPage: false });
  console.log('Saved screenshot 1:', screenshotPath1);

  // Play the video and check time progression
  console.log('Playing video...');
  await page.evaluate(() => {
    const v = document.querySelector('video');
    if (v) return v.play();
  });

  await page.waitForTimeout(2500);

  const playingState = await page.evaluate(() => {
    const v = document.querySelector('video');
    return {
      currentTime: v ? v.currentTime : 0,
      paused: v ? v.paused : true,
      readyState: v ? v.readyState : 0,
    };
  });
  console.log('Playing state after 2.5s:', playingState);

  // Take screenshot 2: Active playback
  const screenshotPath2 = path.resolve('C:/Users/HP/.gemini/antigravity/brain/f6eba120-91ee-4f13-9a26-4bdb72a4b519/02_invideo_studio_playing.png');
  await page.screenshot({ path: screenshotPath2, fullPage: false });
  console.log('Saved screenshot 2:', screenshotPath2);

  // Check right tab switching: Switch to AI Copilot
  console.log('Testing Copilot tab...');
  await page.click('button:has-text("⚡ AI Copilot")');
  await page.waitForTimeout(1000);
  const screenshotPath3 = path.resolve('C:/Users/HP/.gemini/antigravity/brain/f6eba120-91ee-4f13-9a26-4bdb72a4b519/03_invideo_copilot_tab.png');
  await page.screenshot({ path: screenshotPath3, fullPage: false });
  console.log('Saved screenshot 3:', screenshotPath3);

  // Switch to Publish tab
  console.log('Testing Publish tab...');
  await page.click('button:has-text("🚀 Publish")');
  await page.waitForTimeout(1000);
  const screenshotPath4 = path.resolve('C:/Users/HP/.gemini/antigravity/brain/f6eba120-91ee-4f13-9a26-4bdb72a4b519/04_invideo_publish_tab.png');
  await page.screenshot({ path: screenshotPath4, fullPage: false });
  console.log('Saved screenshot 4:', screenshotPath4);

  await browser.close();
  console.log('All InVideo verification steps completed successfully!');
}

testInVideoStudio().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});

