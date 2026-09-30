/**
 * 从工作副本 engine/pension-engine.js 重建 docs/js/pension-engine-browser.js
 * （docs 镜像站 index.html 直接 <script src="js/pension-engine-browser.js">，
 *   这份落后会让镜像站跑旧引擎：缺 UNIFIED_INTEREST / 部分延迟退休代码）
 *
 * 做法：取 engine 全文到 module.exports 之前，末尾换成浏览器包装块（挂 window.PensionEngine）
 * 用法：node scripts/_rebuild_browser_engine.js [--dry]
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'engine/pension-engine.js');
const DST = path.join(ROOT, 'docs/js/pension-engine-browser.js');

const dry = process.argv.includes('--dry');

const src = fs.readFileSync(SRC, 'utf8');
const idx = src.indexOf('module.exports = {');
if (idx < 0) { console.error('❌ 源引擎未找到 module.exports'); process.exit(1); }

const head = src.slice(0, idx);
const CRLF = (src.match(/\r\n/g) || []).length > (src.match(/\n/g) || []).length / 2;

const wrap = [
  '// ═══════════════════════════════════════════════════════',
  '//  浏览器包装（由 scripts/_rebuild_browser_engine.js 从 engine/pension-engine.js 生成）',
  '//  勿手改本文件：改 engine/pension-engine.js 后重跑本脚本',
  '// ═══════════════════════════════════════════════════════',
  'if (typeof window !== \'undefined\') { window.PensionEngine = {',
  '  calculate, calcBasicPension, calcExtraPension,',
  '  calcPersonalAccountPension, calcTransitionalPension,',
  '  calcSpecialAddition, calcAdjustmentFund,',
  '  getRetireMonths, getDelayMonths, getRetireTotalMonths,',
  '  getRetireDate, getAgeStr, getDateStr, getMinYears,',
  '  getBase, getAccRate,',
  '  calcYears, parseInput, formatMoney, getModuleName, formatResult',
  '}; }',
  '',
  'if (typeof module !== \'undefined\' && module.exports) {',
  '  module.exports = (typeof window !== \'undefined\')',
  '    ? window.PensionEngine',
  '    : { calculate, calcBasicPension, calcExtraPension, calcPersonalAccountPension,',
  '        calcTransitionalPension, calcSpecialAddition, calcAdjustmentFund,',
  '        getRetireMonths, getDelayMonths, getRetireTotalMonths, getRetireDate,',
  '        getAgeStr, getDateStr, getMinYears, getBase, getAccRate,',
  '        calcYears, parseInput, formatMoney, getModuleName, formatResult };',
  '}',
  '',
].join(CRLF ? '\r\n' : '\n');

const out = head + wrap;
if (dry) {
  console.log('[dry] 原大小', fs.statSync(DST).size, '→ 新大小', Buffer.byteLength(out));
  console.log('[dry] 换行', CRLF ? 'CRLF' : 'LF');
  process.exit(0);
}

const bak = DST.replace(/\.js$/, '.js.bak-' + Date.now());
fs.copyFileSync(DST, bak);
fs.writeFileSync(DST, out, 'utf8');
console.log('✅ 已重建', path.relative(ROOT, DST));
console.log('   备份:', path.relative(ROOT, bak));
console.log('   大小:', fs.statSync(DST).size, '（源', fs.statSync(SRC).size, '）');
