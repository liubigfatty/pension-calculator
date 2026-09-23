// 步骤9：定位「详情」入口，抓审核驳回原文
// 用法: node scripts/_mp_probe_audit2.js
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
  await sleep(8000);

  const info = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a[href]')).map(a => (a.innerText || '').trim() + ' :: ' + a.href)
      .filter(s => /wacode|audit|code|detail/i.test(s));
    const details = [];
    document.querySelectorAll('*').forEach(e => {
      if (e.children.length === 0 && /详情/.test(e.innerText || '')) {
        let row = e; for (let i = 0; i < 4 && row.parentElement; i++) row = row.parentElement;
        details.push((e.tagName + ' [' + (e.innerText || '').trim() + '] ') + row.outerHTML.replace(/\s+/g, ' ').slice(0, 700));
      }
    });
    // 页面内可能的 js 数据
    const keys = Object.keys(window).filter(k => /audit|wacode|version|code/i.test(k)).slice(0, 20);
    return { links, details, keys };
  }).catch(e => ({ err: e.message }));

  console.log('=== 相关链接 ===');
  (info.links || []).forEach(l => console.log('  ', l));
  console.log('\n=== 含「详情」的元素 ===');
  (info.details || []).slice(0, 6).forEach(d => console.log('-----\n' + d));
  console.log('\n=== window keys ===', (info.keys || []).join(', '));

  // 直接点审核版本块里的第一个可点"详情"
  const tryClick = async (label) => {
    const ok = await page.evaluate((lb) => {
      const els = Array.from(document.querySelectorAll('a,span,div,button'));
      for (const e of els) {
        const t = (e.innerText || '').trim();
        if (t === lb && e.offsetParent !== null) { e.click(); return true; }
      }
      return false;
    }, label);
    console.log('click [' + label + '] =', ok);
    if (!ok) return false;
    await sleep(5000);
    return true;
  };

  // 详情按钮（线上版本那个）。审核版本的详情入口可能叫「审核不通过」
  await tryClick('详情');
  console.log('URL:', page.url());
  let t = await page.evaluate(() => document.body.innerText.replace(/\n{2,}/g, '\n')).catch(() => '');
  console.log(t.slice(0, 2500));
  await page.screenshot({ path: `${OUT}/_mp_detail1.png`, fullPage: true }).catch(() => {});

  // 再试点「审核不通过」
  await page.goBack({ waitUntil: 'domcontentloaded' }).catch(() => {});
  await sleep(3000);
  await tryClick('审核不通过');
  console.log('\nURL2:', page.url());
  t = await page.evaluate(() => document.body.innerText.replace(/\n{2,}/g, '\n')).catch(() => '');
  console.log(t.slice(0, 2500));
  await page.screenshot({ path: `${OUT}/_mp_detail2.png`, fullPage: true }).catch(() => {});
  for (const f of page.frames()) {
    if (f === page.mainFrame()) continue;
    let x = ''; try { x = await f.evaluate(() => document.body.innerText); } catch (e) { continue; }
    if (x && x.length > 40) console.log('--- FRAME ---\n' + x.slice(0, 2000));
  }

  await context.close();
})();
