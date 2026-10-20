import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 320, height: 568 });
  await page.goto('http://localhost:3000/landing', { waitUntil: 'networkidle2' });
  
  const results = await page.evaluate(() => {
    const docW = window.innerWidth;
    const all = Array.from(document.querySelectorAll('*'));
    const overflowing: any[] = [];
    all.forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.right > docW + 1) {
        overflowing.push({
          tag: el.tagName,
          id: el.id,
          className: el.className,
          right: Math.round(rect.right),
          width: Math.round(rect.width),
          left: Math.round(rect.left),
          text: ((el as HTMLElement).innerText || '').slice(0, 35).replace(/\n/g, ' ')
        });
      }
    });
    return {
      bodyScrollWidth: document.body.scrollWidth,
      docW,
      overflowing: overflowing.slice(0, 15)
    };
  });
  
  console.log(JSON.stringify(results, null, 2));
  await browser.close();
})();
