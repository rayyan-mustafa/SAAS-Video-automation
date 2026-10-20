import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844 });
  
  const loginRaw = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'qatest_final@test.com', password: 'QATest123!' })
  });
  const setCookie = loginRaw.headers.get('set-cookie') || '';
  const match = setCookie.match(/auth_session_token=([^;]+)/);
  if (match) {
    await page.setCookie({ name: 'auth_session_token', value: match[1], url: 'http://localhost:3000' });
  }
  
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  await page.waitForFunction(() => document.body.innerText.length > 100);
  
  const data = await page.evaluate(() => {
    const sb = document.querySelector('aside.sidebar');
    if (!sb) return 'no sidebar';
    const r = sb.getBoundingClientRect();
    const style = window.getComputedStyle(sb);
    return {
      left: r.left,
      right: r.right,
      width: r.width,
      transform: style.transform,
      position: style.position,
      display: style.display,
      isOnScreen: r.right > 0 && r.left < window.innerWidth
    };
  });
  
  console.log('Sidebar bounding box at 390px:', JSON.stringify(data, null, 2));
  await browser.close();
})();
