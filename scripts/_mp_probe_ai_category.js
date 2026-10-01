// 扫码登录（若需要）→ 只读探查：账号 / 版本管理 / 服务类目（找「深度合成」「AI问答」）
// 用法: node scripts/_mp_probe_ai_category.js
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

async function dump(page, tag, url, waitMs) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
  await sleep(waitMs || 7000);
  console.log(`\n========== ${tag} ==========`);
  const main = await page.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n')).catch(() => '');
  console.log((main || '(空)').slice(0, 2500));
  for (const f of page.frames()) {
    if (f === page.mainFrame()) continue;
    let t = '';
    try { t = await f.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n')); } catch (e) { continue; }
    if (t && t.trim().length > 40) console.log(`\n--- FRAME ${(f.url() || '').slice(0, 80)} ---\n` + t.slice(0, 1800));
  }
}

(async () => {
  const context = await playwright.chromium.launchPersistentContext(OUT + '/wx_profile', {
    executablePath: PW, headless: true, viewport: { width: 1440, height: 950 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  const page = await context.newPage();
  await page.goto('https://mp.weixin.qq.com/', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
  await sleep(3500);

  if (!/token=\d+/.test(page.url())) {
    await shoot(page, 'ROUND1');
    console.log('WAITING_FOR_SCAN ...');
    const deadline = Date.now() + 9 * 60 * 1000;
    let lastRefresh = Date.now();
    let logged = false;
    while (Date.now() < deadline) {
      if (/token=\d+/.test(page.url())) { logged = true; break; }
      const expired = await page.evaluate(() => {
        const el = document.querySelector('.login__type__container__scan__qrcode');
        const wrap = document.querySelector('.login__type__container__scan');
        return !el || /过期|失效/.test((wrap && wrap.innerText) || '');
      }).catch(() => false);
      if (expired && Date.now() - lastRefresh > 20000) {
        await page.evaluate(() => {
          const c = Array.from(document.querySelectorAll('a,button,span,div'));
          const b = c.find(e => /刷新/.test((e.innerText || '')) && (e.innerText || '').length < 20);
          if (b) b.click();
        }).catch(() => {});
        await sleep(3000);
        await shoot(page, 'REFRESHED');
        lastRefresh = Date.now();
      }
      await sleep(2500);
    }
    if (!logged) { console.log('LOGIN_TIMEOUT'); await context.close(); return; }
    console.log('LOGIN_OK');
    await sleep(3500);
  }

  const token = (page.url().match(/token=(\d+)/) || [])[1];
  console.log('TOKEN =', token);

  const acct = await page.evaluate(() => {
    const sels = ['.weui-desktop-account__nickname', '.account_name', '.nickname', '#js_name', '.head_nickname'];
    const hits = sels.map(s => { const e = document.querySelector(s); return e ? (e.innerText || '').trim() : ''; }).filter(Boolean);
    return { hits, head: (document.body.innerText || '').replace(/\n{2,}/g, '\n').slice(0, 300) };
  }).catch(() => ({ hits: [], head: '' }));
  console.log('\n===== 当前登录账号 =====');
  console.log(JSON.stringify(acct.hits));
  console.log(acct.head);

  await dump(page, '版本管理', `https://mp.weixin.qq.com/wxamp/wacodepage/getcodepage?token=${token}&lang=zh_CN`, 8000);
  await page.screenshot({ path: OUT + '/_mp_version_ai.png', fullPage: true }).catch(() => {});

  await dump(page, '账号设置/基本设置（含服务类目）', `https://mp.weixin.qq.com/wxamp/basicprofile/index?token=${token}&lang=zh_CN`, 8000);
  await page.screenshot({ path: OUT + '/_mp_basicprofile.png', fullPage: true }).catch(() => {});

  // 服务类目可能在独立页，逐个试
  const cands = [
    'https://mp.weixin.qq.com/wxamp/framecategory/index?token=' + token + '&lang=zh_CN',
    'https://mp.weixin.qq.com/wxamp/wxampindex/index?token=' + token + '&lang=zh_CN'
  ];
  for (const u of cands) {
    await dump(page, '候选类目页 ' + u.slice(0, 95), u, 6000);
  }

  await context.close();
})();
