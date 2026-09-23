// 步骤4：抓虚拟支付基本配置里的开关状态（平台路径 / 苹果IAP）+ 道具配置清单
// 用法: node scripts/_mp_probe_config.js
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

  await page.goto(`https://mp.weixin.qq.com/wxamp/xframe/skit/manage/config/basic?token=${token}&lang=zh_CN`, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
  await sleep(7000);

  console.log('URL:', page.url());
  const html = await page.evaluate(() => document.body.innerHTML).catch(() => '');
  const body = await page.evaluate(() => document.body.innerText).catch(() => '');
  console.log('=== 页面文本 ===');
  console.log(body.slice(0, 1500));

  // 抓开关：找含关键词的元素，向上取容器 outerHTML
  const dump = await page.evaluate(() => {
    const res = {};
    const walk = (kw) => {
      const els = Array.from(document.querySelectorAll('*')).filter(e => e.children.length === 0 && (e.innerText || '').includes(kw));
      if (!els.length) return 'NOT_FOUND';
      let node = els[0];
      for (let i = 0; i < 4 && node.parentElement; i++) node = node.parentElement;
      return node.outerHTML.replace(/\s+/g, ' ').slice(0, 2200);
    };
    res.appleIAP = walk('苹果IAP支付');
    res.platformPath = walk('平台路径');
    // 所有 checkbox / switch
    const cbs = Array.from(document.querySelectorAll('input[type=checkbox]')).map(i => `${i.name || i.id || ''}=${i.checked} disabled=${i.disabled} class=${i.className}`);
    res.checkboxes = cbs;
    const sw = Array.from(document.querySelectorAll('*')).filter(e => /weui-switch|el-switch|ant-switch|switch/i.test(e.className || '')).slice(0, 20)
      .map(e => `${e.tagName}.${e.className} aria=${e.getAttribute('aria-checked')} text=${(e.innerText || '').trim().slice(0, 20)}`);
    res.switches = sw;
    return res;
  }).catch(e => ({ err: e.message }));

  console.log('\n=== 苹果IAP支付 区域 HTML ===');
  console.log(dump.appleIAP);
  console.log('\n=== 平台路径 区域 HTML ===');
  console.log(dump.platformPath);
  console.log('\n=== checkbox 列表 ===');
  (dump.checkboxes || []).forEach(c => console.log('  ', c));
  console.log('\n=== switch 类元素 ===');
  (dump.switches || []).forEach(c => console.log('  ', c));

  await page.screenshot({ path: `${OUT}/_mp_config_basic.png`, fullPage: true }).catch(() => {});

  // 道具配置
  const clicked = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('li,span,a,div'));
    const t = els.find(e => (e.innerText || '').trim() === '道具配置' && e.offsetParent !== null);
    if (t) { t.click(); return true; } return false;
  });
  console.log('\nclick 道具配置 =', clicked);
  await sleep(6500);
  console.log('=== 道具配置 URL ===', page.url());
  const goods = await page.evaluate(() => document.body.innerText.replace(/\n{2,}/g, '\n')).catch(() => '');
  console.log(goods.slice(0, 2500));
  await page.screenshot({ path: `${OUT}/_mp_config_goods.png`, fullPage: true }).catch(() => {});

  // 表格行（道具清单）
  const rows = await page.evaluate(() => Array.from(document.querySelectorAll('table tr, .el-table__row')).map(tr => Array.from(tr.querySelectorAll('td,th')).map(td => (td.innerText || '').trim()).join(' | ')).slice(0, 40)).catch(() => []);
  if (rows.length) { console.log('\n=== 道具表格 ==='); rows.forEach(r => console.log('  ', r)); }

  await context.close();
})();
