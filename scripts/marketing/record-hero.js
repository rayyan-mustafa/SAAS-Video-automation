// Records scripts/marketing/hero-demo.html to public/media/hero-walkthrough.{mp4,webm} + poster.
// Usage: node scripts/marketing/record-hero.js
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..', '..');
const out = path.join(root, 'public', 'media');
const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'hero-'));
const ffmpeg = fs.existsSync('/usr/local/bin/ffmpeg') ? '/usr/local/bin/ffmpeg' : require('@ffmpeg-installer/ffmpeg').path;

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir: tmp, size: { width: 1280, height: 720 } } });
  const page = await ctx.newPage();
  await page.goto('file://' + path.join(__dirname, 'hero-demo.html'));
  await page.waitForTimeout(25200);
  await page.screenshot({ path: path.join(tmp, 'poster-src.png') });
  await ctx.close();
  await browser.close();
  const webm = fs.readdirSync(tmp).find((f) => f.endsWith('.webm'));
  const src = path.join(tmp, webm);
  // trim the first 0.4s (page load), encode web-friendly outputs
  execFileSync(ffmpeg, ['-y', '-ss', '0.5', '-i', src, '-t', '24.5', '-vf', 'scale=1280:720,fps=30', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '27', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', path.join(out, 'hero-walkthrough.mp4')], { stdio: 'inherit' });
  execFileSync(ffmpeg, ['-y', '-ss', '0.5', '-i', src, '-t', '24.5', '-vf', 'scale=1280:720,fps=30', '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '38', '-an', path.join(out, 'hero-walkthrough.webm')], { stdio: 'inherit' });
  // poster = mid-scene frame
  execFileSync(ffmpeg, ['-y', '-ss', '13.5', '-i', path.join(out, 'hero-walkthrough.mp4'), '-frames:v', '1', '-q:v', '4', path.join(out, 'hero-poster.jpg')], { stdio: 'inherit' });
  console.log('done', fs.readdirSync(out));
})();
