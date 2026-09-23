// 步骤11：真实点击「查看详情」触发弹窗；并 dump __INITIAL_STATE__ 找审核详情
// 用法: node scripts/_mp_probe_audit4.js
const playwright = require('C:/Users/14041/AppData/Roaming/npm/node_modules/playwright');
const OUT = 'C:/Users/14041/WorkBuddy/2026-07-31-15-34-37';
const PW = 'C:/Users/14041/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const context = await playwright.chromium.launchPersistentContext(OUT + '/wx_profile', {
    executablePath: PW, headless: true, viewport: { width: 1440, height: 1000 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  const page = await context.newPage();
  await page.goto('https://mp.weixin.qq.com/', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
  try { await page.waitForFunction(() => /token=\d+/.test(location.href), { timeout: 40000, polling: 1200 }); } catch (e) {}
  const token = (page.url().match(/token=(\d+)/) || [])[1];

  await page.goto(`https://mp.weixin.qq.com/wxamp/wacodepage/getcodepage?token=${token}&lang=zh_CN`, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
  await sleep(8000);

  // 抓状态数据
  const state = await page.evaluate(() => {
    try { return JSON.stringify(window.__INITIAL_STATE__ || {}).slice(0, 8000); } catch (e) { return 'ERR ' + e.message; }
  }).catch(() => '');
  console.log('=== __INITIAL_STATE__ 片段 ===');
  const hit = state.match(/.{0,400}(审核|audit|reason|虚拟).{0,600}/g);
  if (hit) hit.slice(0, 6).forEach(h => console.log('...' + h + '...'));
  else console.log('(无匹配)');

  // 真实点击「查看详情」
  const popups = [];
  context.on('page', p => { popups.push(p); });
  const link = await page.$('a[href*="audit_id"]');
  console.log('\n找到查看详情链接 =', !!link);
  if (link) {
    await link.click({ timeout: 8000 }).catch(e => console.log('click err', e.message));
    await sleep(7000);
  }
  console.log('主页面 URL:', page.url());

  // 弹窗
  const dlgText = await page.evaluate(() => {
    const ds = Array.from(document.querySelectorAll('.weui-desktop-dialog__wrp, .weui-desktop-dialog, [class*=dialog]'))
      .filter(e => e.offsetParent !== null && !/display:\s*none/.test(e.getAttribute('style') || ''))
      .map(e => e.innerText.replace(/\n{2,}/g, '\n')).filter(t => t && t.length > 10);
    return Array.from(new Set(ds)).join('\n=========\n');
  }).catch(() => '');
  console.log('=== 可见弹窗文本 ===');
  console.log(dlgText.slice(0, 3000));
  await page.screenshot({ path: `${OUT}/_mp_audit_dlg.png`, fullPage: false }).catch(() => {});

  // 新窗口
  for (const p of popups) {
    await sleep(3000);
    console.log('\n=== 新窗口:', p.url());
    const t = await p.evaluate(() => document.body.innerText.replace(/\n{2,}/g, '\n')).catch(() => '');
    console.log(t.slice(0, 4000));
    await p.screenshot({ path: `${OUT}/_mp_audit_popup.png`, fullPage: true }).catch(() => {});
  }

  await context.close();
})();
