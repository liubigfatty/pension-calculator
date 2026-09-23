// 步骤8：点「查看详情」，抓审核驳回完整原因
// 用法: node scripts/_mp_probe_auditdetail.js
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

  await page.goto(`https://mp.weixin.qq.com/wxamp/wacodepage/getcodepage?token=${token}&lang=zh_CN`, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
  await sleep(7000);

  // 记录所有网络响应里的审核详情 JSON
  const caught = [];
  page.on('response', async (r) => {
    const u = r.url();
    if (/audit|wacodepage|detail|reason/i.test(u)) {
      try { const t = await r.text(); if (/虚拟|支付|未通过|reason|reject/i.test(t) && t.length < 200000) caught.push(u + '\n' + t.slice(0, 4000)); } catch (e) {}
    }
  });

  // 点「查看详情」
  const clicked = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('a,span,div,button'));
    const t = els.find(e => /查看详情/.test((e.innerText || '').trim()) && (e.innerText || '').length < 20 && e.offsetParent !== null);
    if (t) { t.click(); return true; }
    return false;
  });
  console.log('click 查看详情 =', clicked);
  await sleep(6000);
  console.log('URL after =', page.url());
  await page.screenshot({ path: `${OUT}/_mp_audit_detail.png`, fullPage: true }).catch(() => {});

  const txt = await page.evaluate(() => document.body.innerText.replace(/\n{2,}/g, '\n')).catch(() => '');
  console.log('=== 页面文本 ===');
  console.log(txt.slice(0, 4000));

  // 弹窗/iframe
  for (const f of page.frames()) {
    if (f === page.mainFrame()) continue;
    let t = '';
    try { t = await f.evaluate(() => document.body.innerText.replace(/\n{2,}/g, '\n')); } catch (e) { continue; }
    if (t && t.trim().length > 40) { console.log('--- FRAME ---'); console.log(t.slice(0, 3000)); }
  }

  if (caught.length) {
    console.log('\n=== 捕获的响应片段 ===');
    caught.slice(0, 6).forEach(c => console.log('-----\n' + c));
  }

  await context.close();
})();
