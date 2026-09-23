// 步骤1：取出 mp.weixin.qq.com 登录二维码，等待扫码，登录后 dump 页面
// 用法: node scripts/_mp_login_qr.js
const playwright = require('C:/Users/14041/AppData/Roaming/npm/node_modules/playwright');
const OUT = 'C:/Users/14041/WorkBuddy/2026-07-31-15-34-37';
const PW = 'C:/Users/14041/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const context = await playwright.chromium.launchPersistentContext(OUT + '/wx_profile', {
    executablePath: PW, headless: true, viewport: { width: 1280, height: 860 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  const page = await context.newPage();
  await page.goto('https://mp.weixin.qq.com/', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
  await sleep(3500);

  if (/token=\d+/.test(page.url())) {
    console.log('ALREADY_LOGGED_IN', page.url());
    await context.close(); return;
  }

  const box = await page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll('img'));
    for (const im of imgs) {
      const r = im.getBoundingClientRect();
      if (r.width > 90 && r.width < 400 && Math.abs(r.width - r.height) < 24) {
        return { x: r.x, y: r.y, width: r.width, height: r.height, cls: im.className || '', src: (im.src || '').slice(0, 30) };
      }
    }
    return null;
  });
  console.log('QR_BOX', JSON.stringify(box));

  if (box && box.width > 0) {
    await page.screenshot({
      path: OUT + '/_mp_qr.png',
      clip: { x: Math.max(0, box.x - 18), y: Math.max(0, box.y - 18), width: box.width + 36, height: box.height + 36 }
    });
  } else {
    await page.screenshot({ path: OUT + '/_mp_qr.png' });
  }
  console.log('QR_SAVED', OUT + '/_mp_qr.png');
  console.log('WAITING_FOR_SCAN ...');

  try {
    await page.waitForFunction(() => /token=\d+/.test(location.href), { timeout: 280000, polling: 1500 });
  } catch (e) {
    console.log('LOGIN_TIMEOUT url=', page.url());
    await context.close(); return;
  }
  await sleep(3500);
  console.log('LOGIN_OK', page.url());
  await page.screenshot({ path: OUT + '/_mp_after_login.png' });

  const txt = await page.evaluate(() => document.body.innerText).catch(() => '');
  console.log('--- PAGE TEXT ---');
  console.log(txt.slice(0, 2000));
  await context.close();
})();
