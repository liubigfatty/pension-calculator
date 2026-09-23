// 开启「是否启用苹果IAP支付」开关（用户已授权）
// 用法: node scripts/_mp_enable_iap.js
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
  console.log('TOKEN =', token);

  await page.goto(`https://mp.weixin.qq.com/wxamp/xframe/skit/manage/config/basic?token=${token}&lang=zh_CN`, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
  await sleep(8000);

  // 定位「苹果IAP」那一行的开关
  const loc = await page.evaluate(() => {
    const leaf = Array.from(document.querySelectorAll('*')).find(e => e.children.length === 0 && /苹果\s*IAP/i.test(e.innerText || ''));
    if (!leaf) return { err: 'no_label' };
    let row = leaf;
    for (let i = 0; i < 6 && row.parentElement; i++) {
      row = row.parentElement;
      if (row.querySelector && row.querySelector('.weui-desktop-switch')) break;
    }
    const sw = row.querySelector('.weui-desktop-switch');
    if (!sw) return { err: 'no_switch' };
    const r = sw.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, cls: sw.className, checked: !!(sw.querySelector('input') || {}).checked, rowText: (row.innerText || '').replace(/\s+/g, ' ').slice(0, 80) };
  });
  console.log('开关定位:', JSON.stringify(loc));
  if (loc.err) { await context.close(); return; }

  await page.screenshot({ path: `${OUT}/_iap_before.png` }).catch(() => {});

  // 点击
  await page.mouse.click(loc.x, loc.y);
  await sleep(3000);

  // 抓弹窗
  const dlg = await page.evaluate(() => {
    const ds = Array.from(document.querySelectorAll('.weui-desktop-dialog__wrp, .weui-desktop-dialog, [class*=dialog], [class*=modal]'))
      .filter(e => e.offsetParent !== null).map(e => (e.innerText || '').replace(/\s+/g, ' ')).filter(t => t && t.length > 3);
    return Array.from(new Set(ds)).join('\n-----\n');
  }).catch(() => '');
  console.log('\n=== 点击后弹窗 ===');
  console.log(dlg || '(无弹窗)');
  await page.screenshot({ path: `${OUT}/_iap_dialog.png`, fullPage: false }).catch(() => {});

  // 若有确认按钮则点
  if (dlg) {
    const ok = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, span, a'))
        .filter(e => e.offsetParent !== null && /^(确定|确认|同意|开启|继续|是)$/.test((e.innerText || '').trim()));
      if (btns.length) { btns[0].click(); return (btns[0].innerText || '').trim(); }
      return null;
    });
    console.log('点击确认按钮 =', ok);
    await sleep(4000);
    await page.screenshot({ path: `${OUT}/_iap_after.png`, fullPage: true }).catch(() => {});
  }

  // 复查状态（重新加载页面）
  await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
  await sleep(8000);
  const after = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('.weui-desktop-switch').forEach((sw, i) => {
      let row = sw; for (let k = 0; k < 6 && row.parentElement; k++) { row = row.parentElement; if (/(是否启用)/.test(row.innerText || '')) break; }
      out.push({ i, checked: !!(sw.querySelector('input') || {}).checked, cls: sw.className, near: (row.innerText || '').replace(/\s+/g, ' ').slice(0, 60) });
    });
    return out;
  }).catch(() => []);
  console.log('\n=== 复查开关状态 ===');
  (Array.isArray(after) ? after : []).forEach(s => console.log(`  #${s.i} checked=${s.checked} cls=${s.cls} | ${s.near}`));
  await page.screenshot({ path: `${OUT}/_iap_final.png`, fullPage: true }).catch(() => {});
  console.log('\n截图: _iap_before.png / _iap_dialog.png / _iap_after.png / _iap_final.png');
  await context.close();
})();
