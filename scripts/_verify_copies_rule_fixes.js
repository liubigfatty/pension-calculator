/**
 * 用「新规则四省输入」（上海/广东/福建/江苏）跑全部引擎副本，验"同输入同结果"。
 * 补充 _audit_all.js 的 ②（它只用吉林输入，覆盖不到本次改动）。
 *
 * 用法：node scripts/_verify_copies_rule_fixes.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');

const COPIES = [
  'engine/pension-engine.js',
  'docs/js/pension-engine.js',
  'docs/js/pension-engine-browser.js',
  'docs/网页版/js/pension-engine-browser.js',
  'cloudfunctions/calculate/pension-engine.js',
  'web/engine.js',
  'engine.js',
];

function loadCopy(rel) {
  const p = path.join(ROOT, rel);
  const src = fs.readFileSync(p, 'utf8');
  // 判据用"是否挂 window.PensionEngine"：docs/网页版/js/pension-engine-browser.js 虽有
  // "browser" 之名，实为 CommonJS 直抄副本，不能按 IIFE 处理。
  if (!/window\.PensionEngine/.test(src)) {
    return require(p);
  }
  // 浏览器 IIFE 版：在 vm 里给个 window 垫片
  const sandbox = { window: {}, console, module: undefined };
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox, { filename: rel });
  return sandbox.window.PensionEngine;
}

function cfg(p) {
  return require(path.join(ROOT, 'cloudfunctions/calculate/provinces', p + '.js')).getEngineConfig();
}

const CASES = [
  ['上海·2026-02退休(23.914年)', 'shanghai', {
    gender: 'female', genderType: 'fw50', birthYear: 1976, birthMonth: 2,
    workYear: 2001, workMonth: 4, retireDateInput: { year: 2026, month: 2 },
    avgIndex: 1.5231, personalAcc: 307242, baseRetire: 12434, baseProv: 12434,
    totalYears: 23.914, months: 195 }],
  ['上海·2026-02退休(32.1667年)', 'shanghai', {
    gender: 'male', genderType: 'male', birthYear: 1971, birthMonth: 2,
    workYear: 1993, workMonth: 9, retireDateInput: { year: 2026, month: 2 },
    avgIndex: 0.7986, personalAcc: 76228, baseRetire: 12434, baseProv: 12434,
    totalYears: 32.1667, months: 170 }],
  ['广东·2026有视同(停发津贴)', 'guangdong', {
    gender: 'male', genderType: 'male', birthYear: 1966, birthMonth: 1,
    workYear: 1985, workMonth: 10, avgIndex: 0.556, personalAcc: 80000, cityType: 'prov' }],
  ['广东·2026无视同(留津贴)', 'guangdong', {
    gender: 'male', genderType: 'male', birthYear: 1966, birthMonth: 1,
    workYear: 2000, workMonth: 1, avgIndex: 0.556, personalAcc: 80000, cityType: 'prov' }],
  ['福建·2024-08退休(半段进整)', 'fujian', {
    gender: 'male', genderType: 'male', birthYear: 1964, birthMonth: 8,
    workYear: 1983, workMonth: 9, retireDateInput: { year: 2024, month: 8 },
    avgIndex: 1.012, personalAcc: 131737.16, baseRetire: 7528, baseProv: 7528,
    totalYears: 41, sightYears: 12.33, months: 139 }],
  ['江苏·2024-03退休(差额40%)', 'jiangsu', {
    gender: 'male', genderType: 'male', birthYear: 1964, birthMonth: 3,
    workYear: 1981, workMonth: 3, retireDateInput: { year: 2024, month: 3 },
    avgIndex: 0.3246, personalAcc: 67874.03, baseRetire: 8613, baseProv: 8613,
    totalYears: 43.08, sightYears: 14.83, pre1996Years: 14.83, transIndex: 0.8634,
    months: 139, transPensionOld: 479.83 }],
  ['江苏·2026-06退休(全额)', 'jiangsu', {
    gender: 'male', genderType: 'male', birthYear: 1971, birthMonth: 5,
    workYear: 1991, workMonth: 7, retireDateInput: { year: 2026, month: 6 },
    avgIndex: 1.1623, transIndex: 1.0606, personalAcc: 251981.62,
    baseRetire: 8917, baseProv: 8917, totalYears: 34.916666666666664,
    sightYears: 4.583333333333333, months: 169.5, cityType: 'prov' }],
];

const cfgCache = {};
function getCfg(p) { return (cfgCache[p] = cfgCache[p] || cfg(p)); }

const baseline = null; // 以第一份副本为基准
const results = {};
let bad = 0;

for (const rel of COPIES) {
  let eng;
  try { eng = loadCopy(rel); } catch (e) { console.log(`❌ ${rel} 加载失败: ${e.message}`); bad++; continue; }
  const rows = [];
  for (const [name, prov, input] of CASES) {
    try {
      const r = eng.calculate(getCfg(prov), input);
      const L = r.legal;
      rows.push(`${L.total} / ${L.basicPension.amount} / ${L.transitionalPension.amount}`);
    } catch (e) {
      rows.push('ERR:' + e.message);
    }
  }
  results[rel] = rows;
}

const names = COPIES.filter((c) => results[c]);
const base = names[0];
console.log(`基准副本：${base}\n`);
CASES.forEach((c, i) => {
  const vals = names.map((n) => results[n][i]);
  const same = vals.every((v) => v === vals[0]);
  if (!same) bad++;
  console.log(`${same ? '✅' : '❌'} ${c[0]}   合计/基础/过渡性 = ${vals[0]}`);
  if (!same) names.forEach((n) => console.log(`      ${n}: ${results[n][i]}`));
});

console.log(`\n=== ${bad === 0 ? '7 份副本同输入同结果 ✅' : '存在 ' + bad + ' 处不一致 ❌'} ===`);
process.exit(bad ? 1 : 0);
