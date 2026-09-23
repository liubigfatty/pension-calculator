// 步骤5：等开关加载完成后读取真实状态（平台路径 / 苹果IAP），并截图
// 用法: node scripts/_mp_probe_switch.js
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
  // 等 loading 结束
  let done = false;
  try {
    await page.waitForFunction(() => {
      const els = document.querySelectorAll('.weui-desktop-switch');
      if (!els.length) return false;
      return Array.from(els).every(e => !/loading/.test(e.className));
    }, { timeout: 30000, polling: 800 });
    done = true;
  } catch (e) { console.log('WAIT_LOADING_TIMEOUT'); }
  await sleep(2500);

  const info = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('.weui-desktop-switch').forEach((sw, i) => {
      const inp = sw.querySelector('input');
      // 向上找到包含标题文字的行容器
      let row = sw; for (let k = 0; k < 5 && row.parentElement; k++) row = row.parentElement;
      out.push({
        idx: i,
        checked: inp ? inp.checked : null,
        disabled: inp ? inp.disabled : null,
        cls: sw.className,
        rowText: (row.innerText || '').replace(/\s+/g, ' ').slice(0, 120)
      });
    });
    return out;
  }).catch(e => ({ err: e.message }));

  console.log('LOADING_DONE =', done);
  console.log('\n=== 开关状态 ===');
  (Array.isArray(info) ? info : []).forEach(s => {
    console.log(`  #${s.idx} checked=${s.checked} disabled=${s.disabled}`);
    console.log(`     cls=${s.cls}`);
    console.log(`     行文本: ${s.rowText}`);
  });

  // 页面全文本（含可能的"是/否"标记）
  const txt = await page.evaluate(() => document.body.innerText.replace(/\n{2,}/g, '\n')).catch(() => '');
  console.log('\n=== 页面文本 ===');
  console.log(txt.slice(0, 1200));

  await page.screenshot({ path: `${OUT}/_mp_switch.png`, fullPage: true }).catch(() => {});
  console.log('\n截图:', `${OUT}/_mp_switch.png`);
  await context.close();
})();
