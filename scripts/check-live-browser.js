const puppeteer = require('puppeteer');

async function checkBrowser() {
  console.log('Launching Puppeteer browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  const consoleLogs = [];
  page.on('console', msg => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => consoleLogs.push(`[PAGE ERROR] ${err.message}`));
  page.on('response', resp => {
    if (resp.status() >= 400) {
      consoleLogs.push(`[HTTP ${resp.status()}] ${resp.url()}`);
    }
  });

  console.log('Navigating to https://video-automation-saas.netlify.app ...');
  await page.goto('https://video-automation-saas.netlify.app', { waitUntil: 'networkidle2', timeout: 30000 });

  await new Promise(r => setTimeout(r, 2000));

  const content = await page.content();
  console.log('Final page title:', await page.title());
  const bodyText = await page.evaluate(() => document.body.innerText);
  console.log('Body text length:', bodyText.length);
  console.log('Body text snippet:', bodyText.substring(0, 300));
  const hasLanding = await page.evaluate(() => !!document.querySelector('.landing-hero') || document.body.innerText.includes('Turn Text Into Viral Videos') || document.body.innerText.includes('Autonomous AI Video Studio'));
  console.log('Has landing page elements:', hasLanding);
  consoleLogs.forEach(l => console.log(' ', l));

  await page.screenshot({ path: 'scripts/live-browser.png' });
  console.log('Screenshot saved to scripts/live-browser.png');

  await browser.close();
}

checkBrowser().catch(e => console.error('Puppeteer error:', e));
