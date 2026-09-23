// 步骤1b：出登录二维码并等待扫码（过期自动刷新，持续导出到同一文件）
// 用法: node scripts/_mp_login_qr2.js
const playwright = require('C:/Users/14041/AppData/Roaming/npm/node_modules/playwright');
const OUT = 'C:/Users/14041/WorkBuddy/2026-07-31-15-34-37';
const PW = 'C:/Users/14041/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const QR_SMALL = OUT + '/_mp_qr.png';
const QR_BIG = OUT + '/_mp_qr_big.png';

async function shoot(page, tag) {
  const box = await page.evaluate(() => {
    const im = document.querySelector('img.login__type__container__scan__qrcode');
    if (!im) return null;
    const r = im.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  });
  if (!box || box.width < 60) { console.log(tag, 'NO_QR_ELEMENT'); return false; }
  await page.screenshot({ path: QR_SMALL, clip: { x: box.x - 18, y: box.y - 18, width: box.width + 36, height: box.height + 36 } });
  const { execSync } = require('child_process');
  try {
    execSync(`"C:/Users/14041/.workbuddy/binaries/python/versions/3.13.12/python.exe" -c "from PIL import Image;im=Image.open(r'${QR_SMALL}').convert('RGB');im=im.resize((im.width*3,im.height*3),Image.NEAREST);im.save(r'${QR_BIG}')"`, { stdio: 'ignore' });
  } catch (e) { console.log('resize fail', e.message); }
  console.log(tag, 'QR_SAVED');
  return true;
}

(async () => {
  const context = await playwright.chromium.launchPersistentContext(OUT + '/wx_profile', {
    executablePath: PW, headless: true, viewport: { width: 1280, height: 860 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  const page = await context.newPage();
  await page.goto('https://mp.weixin.qq.com/', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
  await sleep(3500);
  if (/token=\d+/.test(page.url())) { console.log('ALREADY_LOGGED_IN', page.url()); await context.close(); return; }

  await shoot(page, 'ROUND1');
  console.log('WAITING_FOR_SCAN ...');

  const deadline = Date.now() + 9 * 60 * 1000;
  let logged = false;
  let lastRefresh = Date.now();
  while (Date.now() < deadline) {
    if (/token=\d+/.test(page.url())) { logged = true; break; }
    // 二维码失效检测
    const expired = await page.evaluate(() => {
      const el = document.querySelector('.login__type__container__scan__qrcode');
      const wrap = document.querySelector('.login__type__container__scan');
      const t = (wrap && wrap.innerText) || '';
      return !el || /过期|失效/.test(t);
    }).catch(() => false);
    if (expired && Date.now() - lastRefresh > 20000) {
      // 尝试点击刷新
      await page.evaluate(() => {
        const cands = Array.from(document.querySelectorAll('a,button,span,div'));
        const b = cands.find(e => /刷新/.test((e.innerText || '')) && (e.innerText || '').length < 20);
        if (b) b.click();
      }).catch(() => {});
      await sleep(3000);
      await shoot(page, 'REFRESHED');
      lastRefresh = Date.now();
    }
    await sleep(2500);
  }

  if (!logged) { console.log('LOGIN_TIMEOUT url=', page.url()); await context.close(); return; }
  await sleep(3500);
  console.log('LOGIN_OK', page.url());
  await page.screenshot({ path: OUT + '/_mp_after_login.png' });
  const txt = await page.evaluate(() => document.body.innerText).catch(() => '');
  console.log('--- PAGE TEXT ---');
  console.log(txt.slice(0, 1500));
  await context.close();
})();
