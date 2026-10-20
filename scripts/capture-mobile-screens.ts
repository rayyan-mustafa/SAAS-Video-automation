import puppeteer from 'puppeteer-core';
import path from 'path';

async function main() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  // Register or login
  const regRes = await fetch('http://localhost:3000/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `test_mobile_${Date.now()}@autovideo.ai`,
      password: 'Password123!Secure',
      name: 'Mobile Tester',
    }),
  });
  const cookieHeader = regRes.headers.get('set-cookie');
  let token = '';
  if (cookieHeader) {
    const match = cookieHeader.match(/auth_session_token=([^;]+)/);
    if (match) token = match[1];
  }

  if (token) {
    await page.setCookie({
      name: 'auth_session_token',
      value: token,
      domain: 'localhost',
      path: '/',
    });
  }

  // 1. Laptop Dashboard (1366x768) - matches user dashboard screenshot
  await page.setViewport({ width: 1366, height: 768, isMobile: false });
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForSelector('.dashboard-main-grid', { timeout: 15000 });
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: path.join(process.cwd(), 'screenshot-laptop-dashboard.png'), fullPage: false });
  console.log('Captured screenshot-laptop-dashboard.png');

  // 2. Laptop Workflow (1366x768) - matches user workflow screenshot
  await page.goto('http://localhost:3000/workflow', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForSelector('.workflow-canvas-scroll-container', { timeout: 15000 });
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: path.join(process.cwd(), 'screenshot-laptop-workflow.png'), fullPage: false });
  console.log('Captured screenshot-laptop-workflow.png');

  // 3. Mobile Dashboard (375x812)
  await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForSelector('.dashboard-main-grid', { timeout: 15000 });
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: path.join(process.cwd(), 'screenshot-mobile-dashboard.png'), fullPage: false });
  console.log('Captured screenshot-mobile-dashboard.png');

  // 4. Mobile Dashboard Scrolled Down (375x812)
  await page.evaluate(() => window.scrollBy(0, 500));
  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({ path: path.join(process.cwd(), 'screenshot-mobile-dashboard-scrolled.png'), fullPage: false });
  console.log('Captured screenshot-mobile-dashboard-scrolled.png');

  // 5. Mobile Sidebar Open (375x812)
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise((r) => setTimeout(r, 300));
  const menuBtn = await page.$('.mobile-menu-btn');
  if (menuBtn) {
    await menuBtn.click();
    await new Promise((r) => setTimeout(r, 500));
    await page.screenshot({ path: path.join(process.cwd(), 'screenshot-mobile-sidebar.png'), fullPage: false });
    console.log('Captured screenshot-mobile-sidebar.png');
    // close sidebar
    await menuBtn.click();
    await new Promise((r) => setTimeout(r, 400));
  }

  // 6. Mobile Workflow (375x812)
  await page.goto('http://localhost:3000/workflow', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForSelector('.workflow-canvas-scroll-container', { timeout: 15000 });
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: path.join(process.cwd(), 'screenshot-mobile-workflow.png'), fullPage: false });
  console.log('Captured screenshot-mobile-workflow.png');

  await browser.close();
}

main().catch(console.error);
