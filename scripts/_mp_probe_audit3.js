// 步骤10：打开审核详情页，抓驳回原文全文
// 用法: node scripts/_mp_probe_audit3.js <token>
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

  const url = `https://mp.weixin.qq.com/wxamp/wadevelopcode/get_class?action=get_class&audit_id=540300106&token=${token}&lang=zh_CN`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
  await sleep(8000);
  console.log('URL:', page.url());
  const txt = await page.evaluate(() => document.body.innerText.replace(/\n{2,}/g, '\n')).catch(() => '');
  console.log('=== 主框架 ===');
  console.log(txt.slice(0, 5000));
  for (const f of page.frames()) {
    if (f === page.mainFrame()) continue;
    let t = ''; try { t = await f.evaluate(() => document.body.innerText.replace(/\n{2,}/g, '\n')); } catch (e) { continue; }
    if (t && t.trim().length > 40) { console.log('--- FRAME ---'); console.log(t.slice(0, 4000)); }
  }
  await page.screenshot({ path: `${OUT}/_mp_audit_full.png`, fullPage: true }).catch(() => {});
  console.log('\n截图:', `${OUT}/_mp_audit_full.png`);
  await context.close();
})();
