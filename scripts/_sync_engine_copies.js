/**
 * 引擎副本同步（改完 engine/pension-engine.js 后跑）
 *
 * 先跑：
 *   node scripts/build-web.js              → web/engine.js
 *   node scripts/_rebuild_browser_engine.js → docs/js/pension-engine-browser.js
 * 再跑本脚本，完成剩余三类同步：
 *   1) 直抄副本（与工作副本逐字节一致）：docs/js/pension-engine.js、
 *      docs/网页版/js/pension-engine-browser.js、cloudfunctions/calculate/pension-engine.js
 *   2) 根 engine.js = web/engine.js 去 \r（Pages 发布根，无线生成脚本 ⇒ 由本脚本负责）
 *
 * 用法：node scripts/_sync_engine_copies.js [--dry]
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const dry = process.argv.includes('--dry');

const SRC = path.join(ROOT, 'engine/pension-engine.js');
const src = fs.readFileSync(SRC, 'utf8');

const STRAIGHT = [
  'docs/js/pension-engine.js',
  'docs/网页版/js/pension-engine-browser.js',
  'cloudfunctions/calculate/pension-engine.js',
];

let changed = 0;
for (const rel of STRAIGHT) {
  const p = path.join(ROOT, rel);
  const cur = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
  if (cur === src) { console.log('  同  ' + rel); continue; }
  if (!dry) fs.writeFileSync(p, src);
  changed++;
  console.log('  写  ' + rel);
}

// 根 engine.js：由 web/engine.js 归一化行尾得到
const WEB = path.join(ROOT, 'web/engine.js');
const ROOTENG = path.join(ROOT, 'engine.js');
const webSrc = fs.readFileSync(WEB, 'utf8');
const wanted = webSrc.replace(/\r\n/g, '\n');
const curRoot = fs.existsSync(ROOTENG) ? fs.readFileSync(ROOTENG, 'utf8') : null;
if (curRoot === wanted) {
  console.log('  同  engine.js（= web/engine.js 去 \\r）');
} else {
  if (!dry) fs.writeFileSync(ROOTENG, wanted);
  changed++;
  console.log('  写  engine.js（= web/engine.js 去 \\r）');
}

console.log(`\n${dry ? '[dry-run] ' : ''}共更新 ${changed} 份副本`);
