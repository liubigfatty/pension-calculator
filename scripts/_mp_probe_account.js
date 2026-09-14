// 只读探测：用持久登录态进 mp.weixin.qq.com，看当前是哪个账号、有没有小程序入口
// 用法: node scripts/_mp_probe_account.js
const playwright = require('C:/Users/14041/AppData/Roaming/npm/node_modules/playwright');
const OUT = 'C:/Users/14041/WorkBuddy/2026-07-31-15-34-37';
const PW = 'C:/Users/14041/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const context = await playwright.chromium.launchPersistentContext(OUT + '/wx_profile', {
    executablePath: PW, headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  const page = await context.newPage();
  await page.goto('https://mp.weixin.qq.com/', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(e => console.log('goto err', e.message));
  try { await page.waitForFunction(() => /token=\d+/.test(location.href), { timeout: 40000 }); } catch (e) { console.log('WAIT_TOKEN_TIMEOUT url=', page.url()); }
  const url = page.url();
  const token = (url.match(/token=(\d+)/) || [])[1];
  console.log('URL   :', url);
  console.log('TOKEN :', token || '(null)');
  console.log('TITLE :', await page.title().catch(() => '?'));
  if (!token) { await page.screenshot({ path: OUT + '/_mp_probe_login.png' }); console.log('未登录，截图:', OUT + '/_mp_probe_login.png'); await context.close(); return; }

  await sleep(3000);
  // 账号名 / 主体
  const info = await page.evaluate(() => {
    const t = (s) => (document.querySelector(s) || {}).innerText || (document.querySelector(s) || {}).textContent || '';
    return {
      nick: t('.weui-desktop-account__nickname') || t('.account_nickname') || t('.weui-desktop-account__name'),
      body: document.body.innerText.slice(0, 600)
    };
  }).catch(e => ({ err: e.message }));
  console.log('NICK  :', info.nick);
  console.log('--- 首页文本前 600 ---');
  console.log(info.body);

  // 找小程序入口链接
  const links = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a')).map(a => (a.innerText || '').trim() + ' :: ' + (a.href || ''))
      .filter(s => /小程序|wxamp|虚拟支付|支付/.test(s)).slice(0, 40);
  }).catch(() => []);
  console.log('--- 含小程序/支付的链接 ---');
  links.forEach(l => console.log('  ', l));

  // 试小程序后台首页
  for (const u of [
    `https://mp.weixin.qq.com/wxamp/home?t=home/index&token=${token}&lang=zh_CN`,
    `https://mp.weixin.qq.com/wxamp/virtualpay/index?token=${token}&lang=zh_CN`,
  ]) {
    await page.goto(u, { waitUntil: 'domcontentloaded', timeout: 25000 }).catch(e => console.log('goto err', e.message));
    await sleep(2500);
    console.log('\n>>> ' + u);
    console.log('    landed:', page.url());
    console.log('    title :', await page.title().catch(() => '?'));
    const txt = await page.evaluate(() => document.body.innerText.slice(0, 400)).catch(() => '');
    console.log('    text  :', txt.replace(/\s+/g, ' ').slice(0, 300));
  }

  await page.screenshot({ path: OUT + '/_mp_probe_wxamp.png', fullPage: false }).catch(() => {});
  console.log('\n截图:', OUT + '/_mp_probe_wxamp.png');
  await context.close();
})();
