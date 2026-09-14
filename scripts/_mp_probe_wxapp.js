// 步骤2b：进入小程序后台，dump 左侧菜单链接 + 点开「虚拟支付」「账号设置」并抓 iframe 内容
// 用法: node scripts/_mp_probe_wxapp.js
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
  console.log('TOKEN =', token || '(null)');
  await sleep(4500);

  // 1) 菜单链接全量
  const menus = await page.evaluate(() => Array.from(document.querySelectorAll('a[href]'))
    .map(a => (a.innerText || '').trim().replace(/\s+/g, ' ') + ' :: ' + a.href)
    .filter(s => s.length > 4).slice(0, 80)).catch(() => []);
  console.log('\n=== 菜单/链接 ===');
  menus.forEach(m => console.log('  ', m));

  // 2) 逐个点开目标项
  async function open(label) {
    const clicked = await page.evaluate((lb) => {
      const cands = Array.from(document.querySelectorAll('a,li,span,div'));
      for (const el of cands) {
        const t = (el.innerText || '').trim();
        if (t === lb && el.offsetParent !== null) { el.click(); return true; }
      }
      return false;
    }, label);
    console.log('\n=== 点击 [' + label + '] 结果=' + clicked + ' ===');
    if (!clicked) return;
    await sleep(6000);
    console.log('  URL:', page.url());
    const frames = page.frames();
    for (const f of frames) {
      if (f === page.mainFrame()) continue;
      let txt = '';
      try { txt = await f.evaluate(() => document.body.innerText.replace(/\n{2,}/g, '\n')); } catch (e) { txt = '(frame err ' + e.message + ')'; }
      if (txt && txt.length > 20) {
        console.log('  --- FRAME ' + f.url().slice(0, 140) + ' ---');
        console.log(txt.slice(0, 3000).split('\n').map(l => '    ' + l).join('\n'));
      }
    }
    const mainTxt = await page.evaluate(() => document.body.innerText.replace(/\n{2,}/g, '\n').slice(0, 2500)).catch(() => '');
    console.log('  --- 主框架文本 ---');
    console.log(mainTxt.split('\n').map(l => '    ' + l).join('\n'));
    await page.screenshot({ path: `${OUT}/_mp_${label}.png`, fullPage: false }).catch(() => {});
  }

  await open('虚拟支付');
  await open('账号设置');
  await open('付费管理');

  await context.close();
})();
