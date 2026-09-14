// 精确修正两个开关：① 平台路径 关回原状 ② 苹果IAP 开启
// 用法: node scripts/_mp_fix_switches.js
const playwright = require('C:/Users/14041/AppData/Roaming/npm/node_modules/playwright');
const OUT = 'C:/Users/14041/WorkBuddy/2026-07-31-15-34-37';
const PW = 'C:/Users/14041/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const URL_BASE = 'https://mp.weixin.qq.com';

async function markTargets(page, tagPrefix) {
  return await page.evaluate((pfx) => {
    const info = [];
    const findLabel = (kw) => Array.from(document.querySelectorAll('*'))
      .filter(e => kw.test(e.innerText || ''))
      .map(e => ({ e, r: e.getBoundingClientRect() }))
      .filter(o => o.r.width > 0 && o.r.height > 0 && o.r.width < 420 && o.r.height < 60)
      .sort((a, b) => (a.r.width * a.r.height) - (b.r.width * b.r.height))[0];

    const sws = Array.from(document.querySelectorAll('.weui-desktop-switch'));
    for (const [key, kw] of [['path', /平台路径/], ['iap', /苹果\s*IAP/i]]) {
      const lab = findLabel(kw);
      if (!lab) { info.push(key + ':NO_LABEL'); continue; }
      const ly = lab.r.top + lab.r.height / 2;
      const sorted = sws.map(sw => ({ sw, r: sw.getBoundingClientRect() }))
        .filter(o => o.r.width > 0)
        .sort((a, b) => Math.abs(a.r.top + a.r.height / 2 - ly) - Math.abs(b.r.top + b.r.height / 2 - ly));
      if (!sorted.length) { info.push(key + ':NO_SWITCH'); continue; }
      const target = sorted[0];
      target.sw.setAttribute('data-target', pfx + key);
      info.push(`${key}: labelY=${Math.round(ly)} switchY=${Math.round(target.r.top + target.r.height / 2)} checked=${!!(target.sw.querySelector('input') || {}).checked}`);
    }
    return info;
  }, tagPrefix);
}

const readState = (page, pfx) => page.evaluate((p) => {
  const out = {};
  for (const k of ['path', 'iap']) {
    const el = document.querySelector(`[data-target="${p}${k}"]`);
    out[k] = el ? !!(el.querySelector('input') || {}).checked : null;
  }
  return out;
}, pfx);

(async () => {
  const context = await playwright.chromium.launchPersistentContext(OUT + '/wx_profile', {
    executablePath: PW, headless: true, viewport: { width: 1200, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  const page = await context.newPage();
  await page.goto(URL_BASE + '/', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
  try { await page.waitForFunction(() => /token=\d+/.test(location.href), { timeout: 40000, polling: 1200 }); } catch (e) {}
  const token = (page.url().match(/token=(\d+)/) || [])[1];

  await page.goto(`${URL_BASE}/wxamp/xframe/skit/manage/config/basic?token=${token}&lang=zh_CN`, { waitUntil: 'networkidle', timeout: 40000 }).catch(() => {});
  await sleep(9000);

  console.log('=== 定位 ===');
  (await markTargets(page, 'F')).forEach(l => console.log('  ', l));
  console.log('初始状态:', JSON.stringify(await readState(page, 'F')));

  // ① 平台路径：若为 true 则关掉
  let st = await readState(page, 'F');
  if (st.path === true) {
    await page.click('[data-target="Fpath"]').catch(e => console.log('click path err', e.message));
    await sleep(3500);
    console.log('→ 已点击「平台路径」开关（目标：关闭）');
  } else {
    console.log('→ 平台路径已是关闭，跳过');
  }

  // ② 苹果 IAP：若为 false 则打开
  (await markTargets(page, 'G')).forEach(l => console.log('   re-scan:', l));
  st = await readState(page, 'G');
  console.log('点击前状态:', JSON.stringify(st));
  if (st.iap === false) {
    await page.click('[data-target="Giap"]').catch(e => console.log('click iap err', e.message));
    await sleep(3500);
    console.log('→ 已点击「苹果IAP」开关（目标：开启）');
  } else {
    console.log('→ 苹果IAP已是开启，跳过');
  }

  const dlg = await page.evaluate(() => {
    const ds = Array.from(document.querySelectorAll('.weui-desktop-dialog__wrp, .weui-desktop-dialog, [class*=dialog], [class*=modal]'))
      .filter(e => e.offsetParent !== null).map(e => (e.innerText || '').replace(/\s+/g, ' ')).filter(t => t && t.length > 3);
    return Array.from(new Set(ds)).join('\n-----\n');
  }).catch(() => '');
  if (dlg) {
    console.log('\n弹窗:', dlg);
    const ok = await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button, span, a')).filter(e => e.offsetParent !== null && /^(确定|确认|同意|开启|继续|是)$/.test((e.innerText || '').trim()));
      if (b.length) { b[0].click(); return (b[0].innerText || '').trim(); }
      return null;
    });
    console.log('点击确认 =', ok);
    await sleep(3000);
  }

  // 复查
  await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
  await sleep(9000);
  console.log('\n=== 复查（刷新后）===');
  (await markTargets(page, 'H')).forEach(l => console.log('  ', l));
  console.log('最终状态:', JSON.stringify(await readState(page, 'H')));
  await page.screenshot({ path: `${OUT}/_iap_final2.png`, fullPage: true }).catch(() => {});
  console.log('截图: _iap_final2.png');
  await context.close();
})();
