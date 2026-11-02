const puppeteer = require('puppeteer');

async function checkBrowser() {
  console.log('Launching Puppeteer browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const consoleLogs = [];
  page.on('console', msg => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => consoleLogs.push(`[PAGE ERROR] ${err.message}`));
  page.on('response', resp => {
    if (resp.status() >= 400) {
      consoleLogs.push(`[HTTP ${resp.status()}] ${resp.url()}`);
    }
  });

  console.log('Navigating to https://tillercast.netlify.app ...');
  await page.goto('https://tillercast.netlify.app', { waitUntil: 'networkidle2', timeout: 30000 });

  await new Promise(r => setTimeout(r, 2000));

  console.log('Final page title:', await page.title());
  console.log('Console logs count:', consoleLogs.length);
  consoleLogs.forEach(l => console.log(' ', l));

  await page.screenshot({ path: 'scripts/tillercast-live.png' });
  console.log('Screenshot saved to scripts/tillercast-live.png');

  await browser.close();
}

checkBrowser().catch(e => console.error('Puppeteer error:', e));
