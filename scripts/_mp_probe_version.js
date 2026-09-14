// 步骤7：版本管理页 → 取本次审核驳回的完整原因；顺带看违规记录
// 用法: node scripts/_mp_probe_version.js
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

  // 1) 版本管理
  await page.goto(`https://mp.weixin.qq.com/wxamp/wacodepage/getcodepage?token=${token}&lang=zh_CN`, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
  await sleep(7000);
  console.log('\n========== 版本管理 ==========');
  console.log('URL:', page.url());
  const vt = await page.evaluate(() => document.body.innerText.replace(/\n{2,}/g, '\n')).catch(() => '');
  console.log(vt.slice(0, 4000));
  await page.screenshot({ path: `${OUT}/_mp_version.png`, fullPage: true }).catch(() => {});

  // 找「审核不通过/未通过」的可点元素
  const clicked = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('a,span,div,button'));
    const t = els.find(e => /审核不通过|未通过|查看原因|审核详情|驳回/.test((e.innerText || '').trim()) && (e.innerText || '').length < 30 && e.offsetParent !== null);
    if (t) { t.click(); return (t.innerText || '').trim(); }
    return null;
  });
  console.log('\n点击审核详情 =', clicked);
  if (clicked) {
    await sleep(4000);
    const dlg = await page.evaluate(() => {
      const d = Array.from(document.querySelectorAll('.weui-desktop-dialog, .weui-desktop-popover, [class*=dialog], [class*=modal]'))
        .filter(e => e.offsetParent !== null).map(e => e.innerText.replace(/\n{2,}/g, '\n')).join('\n-----\n');
      return d;
    }).catch(() => '');
    console.log('--- 弹窗内容 ---');
    console.log(dlg.slice(0, 3000));
    await page.screenshot({ path: `${OUT}/_mp_version_dialog.png`, fullPage: false }).catch(() => {});
  }

  // 2) 违规记录
  await page.goto(`https://mp.weixin.qq.com/wxamp/frame/illegalRecord?iframe=%2Fpublicpoc%2Fwxaillegalrecord%3Faction%3Dquery&token=${token}&lang=zh_CN`, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
  await sleep(7000);
  console.log('\n========== 违规记录 ==========');
  for (const f of page.frames()) {
    let txt = '';
    try { txt = await f.evaluate(() => document.body.innerText.replace(/\n{2,}/g, '\n')); } catch (e) { continue; }
    if (txt && txt.trim().length > 30) { console.log('--- FRAME ---'); console.log(txt.slice(0, 2500)); }
  }
  await page.screenshot({ path: `${OUT}/_mp_illegal.png`, fullPage: true }).catch(() => {});

  await context.close();
})();
