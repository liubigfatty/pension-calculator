// 步骤3：扒「虚拟支付→基本配置 / 接入指引」+「账号设置(小程序简称)」
// 用法: node scripts/_mp_probe_virtualpay.js
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

  async function dumpFrames(tag) {
    console.log('\n########## ' + tag + ' ##########');
    console.log('URL:', page.url());
    for (const f of page.frames()) {
      if (f === page.mainFrame()) continue;
      let txt = '';
      try { txt = await f.evaluate(() => document.body.innerText.replace(/\n{2,}/g, '\n')); } catch (e) { continue; }
      if (txt && txt.trim().length > 15) {
        console.log('--- FRAME ' + f.url().replace(/token=\d+/, 'token=*').slice(0, 150) + ' ---');
        console.log(txt.slice(0, 4000));
      }
    }
    const mt = await page.evaluate(() => document.body.innerText.replace(/\n{2,}/g, '\n').slice(0, 3000)).catch(() => '');
    console.log('--- MAIN ---');
    console.log(mt);
    await page.screenshot({ path: `${OUT}/_mp_vp_${tag}.png`, fullPage: false }).catch(() => {});
  }

  async function clickText(label) {
    const ok = await page.evaluate((lb) => {
      for (const f of [document, ...Array.from(document.querySelectorAll('iframe')).map(i => { try { return i.contentDocument; } catch (e) { return null; } }).filter(Boolean)]) {
        const cands = Array.from(f.querySelectorAll('a,li,span,div,button'));
        for (const el of cands) {
          const t = (el.innerText || '').trim();
          if (t === lb && el.offsetParent !== null) { el.click(); return true; }
        }
      }
      return false;
    }, label);
    console.log('click [' + label + '] =', ok);
    await sleep(6000);
    return ok;
  }

  // 1) 虚拟支付 → 基本配置
  await page.goto(`https://mp.weixin.qq.com/wxamp/subApp/skit/manage/order?token=${token}&lang=zh_CN`, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
  await sleep(6000);
  await clickText('基本配置');
  await dumpFrames('基本配置');
  await clickText('接入指引');
  await dumpFrames('接入指引');

  // 2) 账号设置（小程序简称）
  await page.goto(`https://mp.weixin.qq.com/wxamp/basicprofile/index?token=${token}&lang=zh_CN`, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
  await sleep(6000);
  await dumpFrames('账号设置');

  await context.close();
})();
