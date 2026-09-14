// 步骤6：hover 两个开关旁的 ⓘ，抓官方提示文本
// 用法: node scripts/_mp_probe_tooltip.js
const playwright = require('C:/Users/14041/AppData/Roaming/npm/node_modules/playwright');
const OUT = 'C:/Users/14041/WorkBuddy/2026-07-31-15-34-37';
const PW = 'C:/Users/14041/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const context = await playwright.chromium.launchPersistentContext(OUT + '/wx_profile', {
    executablePath: PW, headless: true, viewport: { width: 1200, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  const page = await context.newPage();
  await page.goto('https://mp.weixin.qq.com/', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
  try { await page.waitForFunction(() => /token=\d+/.test(location.href), { timeout: 40000, polling: 1200 }); } catch (e) {}
  const token = (page.url().match(/token=(\d+)/) || [])[1];

  await page.goto(`https://mp.weixin.qq.com/wxamp/xframe/skit/manage/config/basic?token=${token}&lang=zh_CN`, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
  await sleep(7000);

  // 抓页面里所有「下拉/tooltip/说明」文本源（含 title / data-* / 隐藏 div）
  const tips = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('*').forEach(e => {
      const t = e.getAttribute && (e.getAttribute('title') || e.getAttribute('data-title') || e.getAttribute('data-tip') || e.getAttribute('aria-label'));
      if (t && /路径|IAP|苹果|虚拟/.test(t)) out.push('ATTR: ' + t);
    });
    // 全局提示元素
    document.querySelectorAll('.weui-desktop-popover__desc, .weui-desktop-tooltip, .el-tooltip__popper, [class*=popover], [class*=tip]').forEach(e => {
      const t = (e.innerText || '').trim();
      if (t) out.push('TIP: ' + t.replace(/\s+/g, ' ').slice(0, 400));
    });
    return Array.from(new Set(out));
  }).catch(e => ['ERR ' + e.message]);

  console.log('=== 静态提示 ===');
  tips.forEach(t => console.log('  ', t));

  // hover 问号图标
  const qs = await page.$$('.weui-desktop-icon-question, [class*=question], [class*=help]');
  console.log('\n问号图标数量 =', qs.length);
  for (let i = 0; i < Math.min(qs.length, 4); i++) {
    const box = await qs[i].boundingBox().catch(() => null);
    if (!box) continue;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await sleep(2200);
    const tip = await page.evaluate(() => {
      const cands = Array.from(document.querySelectorAll('div,span,p'))
        .filter(e => e.offsetParent !== null && /路径|IAP|苹果|审核|开通|虚拟/.test(e.innerText || ''));
      const best = cands.sort((a, b) => (a.innerText.length - b.innerText.length))[0];
      return best ? best.innerText.replace(/\s+/g, ' ').slice(0, 500) : '';
    }).catch(() => '');
    console.log(`\n--- hover #${i} @(${Math.round(box.x)},${Math.round(box.y)}) ---`);
    console.log('  ', tip);
    await page.screenshot({ path: `${OUT}/_mp_tip_${i}.png` }).catch(() => {});
  }

  await context.close();
})();
