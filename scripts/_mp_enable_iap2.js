// 诊断 + 开启苹果IAP开关
// 用法: node scripts/_mp_enable_iap2.js
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

  await page.goto(`https://mp.weixin.qq.com/wxamp/xframe/skit/manage/config/basic?token=${token}&lang=zh_CN`, { waitUntil: 'networkidle', timeout: 40000 }).catch(() => {});
  await sleep(10000);

  const diag = await page.evaluate(() => {
    const body = document.body.innerText || '';
    const cands = Array.from(document.querySelectorAll('*')).filter(e => /IAP/.test(e.innerText || ''));
    cands.sort((a, b) => (a.innerText || '').length - (b.innerText || '').length);
    return {
      hasIAP: /IAP/.test(body),
      bodySnippet: body.replace(/\n{2,}/g, '\n').slice(0, 500),
      cands: cands.slice(0, 6).map(e => e.tagName + '.' + (typeof e.className === 'string' ? e.className : '') + ' | ' + (e.innerText || '').replace(/\s+/g, ' ').slice(0, 50) + ' | kids=' + e.children.length)
    };
  }).catch(e => ({ err: e.message }));
  console.log('hasIAP =', diag.hasIAP);
  console.log('--- body 片段 ---');
  console.log(diag.bodySnippet);
  console.log('--- 含 IAP 的元素 ---');
  (diag.cands || []).forEach(c => console.log('  ', c));

  // 定位开关：取最短的含 IAP 元素，向上找 switch
  const loc = await page.evaluate(() => {
    const cands = Array.from(document.querySelectorAll('*')).filter(e => /IAP/.test(e.innerText || ''));
    cands.sort((a, b) => (a.innerText || '').length - (b.innerText || '').length);
    for (const leaf of cands) {
      let row = leaf;
      for (let i = 0; i < 8 && row.parentElement; i++) {
        row = row.parentElement;
        const sw = row.querySelector && row.querySelector('.weui-desktop-switch');
        if (sw) {
          const r = sw.getBoundingClientRect();
          if (r.width > 0) return { x: r.x + r.width / 2, y: r.y + r.height / 2, cls: sw.className, checked: !!(sw.querySelector('input') || {}).checked };
        }
      }
    }
    return { err: 'no_switch_found' };
  });
  console.log('\n开关定位:', JSON.stringify(loc));
  if (loc.err) {
    await page.screenshot({ path: `${OUT}/_iap_diag.png`, fullPage: true }).catch(() => {});
    console.log('已截图 _iap_diag.png');
    await context.close(); return;
  }

  await page.screenshot({ path: `${OUT}/_iap_before.png` }).catch(() => {});
  await page.mouse.click(loc.x, loc.y);
  await sleep(3500);

  const dlg = await page.evaluate(() => {
    const ds = Array.from(document.querySelectorAll('.weui-desktop-dialog__wrp, .weui-desktop-dialog, [class*=dialog], [class*=modal], .weui-desktop-popover'))
      .filter(e => e.offsetParent !== null).map(e => (e.innerText || '').replace(/\s+/g, ' ')).filter(t => t && t.length > 3);
    return Array.from(new Set(ds)).join('\n-----\n');
  }).catch(() => '');
  console.log('\n=== 点击后弹窗 ===');
  console.log(dlg || '(无弹窗)');
  await page.screenshot({ path: `${OUT}/_iap_dialog.png` }).catch(() => {});

  if (dlg) {
    const ok = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, span, a'))
        .filter(e => e.offsetParent !== null && /^(确定|确认|同意|开启|继续|是)$/.test((e.innerText || '').trim()));
      if (btns.length) { btns[0].click(); return (btns[0].innerText || '').trim(); }
      return null;
    });
    console.log('点击确认 =', ok);
    await sleep(4000);
    await page.screenshot({ path: `${OUT}/_iap_after.png`, fullPage: true }).catch(() => {});
  }

  await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
  await sleep(9000);
  const after = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('.weui-desktop-switch').forEach((sw, i) => {
      let row = sw; for (let k = 0; k < 6 && row.parentElement; k++) row = row.parentElement;
      out.push({ i, checked: !!(sw.querySelector('input') || {}).checked, cls: sw.className, near: (row.innerText || '').replace(/\s+/g, ' ').slice(0, 50) });
    });
    return out;
  }).catch(() => []);
  console.log('\n=== 复查（刷新后）===');
  (Array.isArray(after) ? after : []).forEach(s => console.log(`  #${s.i} checked=${s.checked} cls=${s.cls} | ${s.near}`));
  await page.screenshot({ path: `${OUT}/_iap_final.png`, fullPage: true }).catch(() => {});
  await context.close();
})();
