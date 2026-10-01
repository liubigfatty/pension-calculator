// 登录态有效时：点击左侧菜单「AI能力」「小程序成长计划」「云服务」并 dump（只读）
// 用法: node scripts/_mp_probe_ai_menu.js
const playwright = require('C:/Users/14041/AppData/Roaming/npm/node_modules/playwright');
const OUT = 'C:/Users/14041/WorkBuddy/2026-07-31-15-34-37';
const PW = 'C:/Users/14041/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function clickMenu(page, label) {
  const ok = await page.evaluate((lb) => {
    const els = Array.from(document.querySelectorAll('a,li,span,div,dd,dt'));
    const t = els.filter(e => (e.innerText || '').trim() === lb && e.offsetParent !== null);
    if (!t.length) return false;
    const target = t[t.length - 1];
    target.click();
    return true;
  }, label).catch(() => false);
  console.log(`点击菜单「${label}」= ${ok}`);
  return ok;
}

async function dumpFrames(page, tag) {
  console.log(`\n========== ${tag} ==========`);
  console.log('URL:', page.url());
  const main = await page.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n')).catch(() => '');
  console.log((main || '(空)').slice(0, 2500));
  for (const f of page.frames()) {
    if (f === page.mainFrame()) continue;
    let t = '';
    try { t = await f.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n')); } catch (e) { continue; }
    if (t && t.trim().length > 60) console.log(`\n--- FRAME ${(f.url() || '').slice(0, 80)} ---\n` + t.slice(0, 2000));
  }
}

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
  if (!token) { console.log('!! 登录态失效，需重新扫码'); await context.close(); return; }

  for (const [label, tag, shot] of [
    ['AI能力', 'AI能力', '_mp_ai_ability.png'],
    ['小程序成长计划', '小程序成长计划', '_mp_growth_plan.png'],
    ['云服务', '云服务', '_mp_cloud.png']
  ]) {
    await clickMenu(page, label);
    await sleep(7000);
    await dumpFrames(page, tag);
    await page.screenshot({ path: OUT + '/' + shot, fullPage: true }).catch(() => {});
    // 回到首页再点下一个菜单
    await page.goto(`https://mp.weixin.qq.com/wxamp/index/index?token=${token}&lang=zh_CN`, { waitUntil: 'domcontentloaded' }).catch(() => {});
    await sleep(4000);
  }

  await context.close();
})();
