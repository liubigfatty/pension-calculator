// 只读探查：MP 后台 → 当前登录账号 + 版本管理（线上版本 / 审核状态）
// 用法: node scripts/_mp_check_live_version.js
const playwright = require('C:/Users/14041/AppData/Roaming/npm/node_modules/playwright');
const OUT = 'C:/Users/14041/WorkBuddy/2026-07-31-15-34-37';
const PW = 'C:/Users/14041/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const context = await playwright.chromium.launchPersistentContext(OUT + '/wx_profile', {
    executablePath: PW, headless: true, viewport: { width: 1440, height: 950 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  const page = await context.newPage();
  await page.goto('https://mp.weixin.qq.com/', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
  try { await page.waitForFunction(() => /token=\d+/.test(location.href), { timeout: 40000, polling: 1200 }); } catch (e) {}
  const token = (page.url().match(/token=(\d+)/) || [])[1];
  console.log('TOKEN =', token);
  console.log('落地 URL =', page.url());
  if (!token) {
    await page.screenshot({ path: OUT + '/_mp_need_login.png', fullPage: true }).catch(() => {});
    console.log('!! 未拿到 token —— 登录态可能已过期，需重新扫码');
    await context.close();
    return;
  }

  // 0) 当前登录账号
  const acct = await page.evaluate(() => {
    const pick = (sel) => { const e = document.querySelector(sel); return e ? (e.innerText || '').trim() : ''; };
    const cands = ['.weui-desktop-account__nickname', '.account_name', '.nickname', '.weui-desktop-header__Nickname', '#js_name', '.head_nickname'];
    const hits = cands.map(s => pick(s)).filter(Boolean);
    return { hits, head: (document.body.innerText || '').replace(/\n{2,}/g, '\n').slice(0, 400) };
  }).catch(() => ({}));
  console.log('\n===== 账号候选 =====');
  console.log(JSON.stringify(acct.hits));
  console.log('--- 首屏文本 ---\n' + (acct.head || ''));

  // 1) 版本管理
  await page.goto(`https://mp.weixin.qq.com/wxamp/wacodepage/getcodepage?token=${token}&lang=zh_CN`, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
  await sleep(8000);
  console.log('\n========== 版本管理（mainFrame） ==========');
  const main = await page.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n')).catch(() => '');
  console.log((main || '').slice(0, 3000));
  for (const f of page.frames()) {
    if (f === page.mainFrame()) continue;
    let txt = '';
    try { txt = await f.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n')); } catch (e) { continue; }
    if (txt && txt.trim().length > 40) { console.log('\n--- FRAME ' + (f.url() || '').slice(0, 90) + ' ---'); console.log(txt.slice(0, 2500)); }
  }
  await page.screenshot({ path: OUT + '/_mp_version_live.png', fullPage: true }).catch(() => {});

  await context.close();
})();
