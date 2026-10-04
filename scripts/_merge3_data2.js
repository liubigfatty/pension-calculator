/**
 * 第1篇补充：逐年缴费额与「增量回本」；第3篇重设场景（弹性提前窗口内）
 * 纪律：社平数列直接读省份真相源 config，不复刻引擎公式
 */
const path = require('path');
const { calculate } = require(path.resolve('./engine/pension-engine.js'));
const cfg = require(path.resolve('./cloudfunctions/calculate/provinces/jilin.js'));
const config = cfg.getEngineConfig ? cfg.getEngineConfig() : cfg;
const R2 = x => Math.round(x * 100) / 100;

console.log('=== 吉林 avg_salary_history（执行年口径：[Y]=Y-1统计年）===');
const hist = config.avg_salary_history || {};
const years = Object.keys(hist).map(Number).sort((a, b) => a - b);
console.log(years.map(y => `${y}:${hist[y]}`).join('  '));

// 缴费基数上下限
console.log('\n=== 缴费基数上下限字段 ===');
for (const k of Object.keys(config)) {
  if (/base|min|max|floor|ceiling/i.test(k) && k !== 'base_rates') console.log('  ' + k + ' = ' + JSON.stringify(config[k]).slice(0, 200));
}

// ============ 缴费总额：Σ(社平[当年] × 指数) ============
function totalContrib(fromY, fromM, toY, toM, idx) {
  let sum = 0; const detail = [];
  for (let y = fromY; y <= toY; y++) {
    const s = hist[y];
    if (!s) { detail.push(`${y}:社平缺失`); continue; }
    const beginM = y === fromY ? fromM : 1;
    const endM = y === toY ? toM : 12;
    const n = endM - beginM + 1;
    const amt = s * idx * n;
    sum += amt;
    detail.push(`${y}:${Math.round(amt)}`);
  }
  return { sum: R2(sum), detail };
}

console.log('\n############ 第1篇补充 · 增量回本 ############');
const RY = 2026, RM = 10;
for (const [tag, fy, fm, ty, tm] of [['S15 起缴', 2011, 7, RY, RM], ['S30 起缴', 1996, 7, RY, RM]]) {
  for (const idx of [0.6, 1.0, 2.0, 3.0]) {
    const t = totalContrib(fy, fm, ty, tm, idx);
    console.log(`${tag} ${(idx * 100).toFixed(0).padStart(4)}%  缴费总额=${String(t.sum).padStart(12)}  [${t.detail.slice(-4).join(' ')}]`);
  }
}

// 月领差 & 回本
console.log('\n--- S15 场景：提档 vs 延年限的增量回本 ---');
function calc(input) {
  const r = calculate(config, { province: 'jilin', cityType: 'prov', personalAcc: 0, retireDateInput: { year: input.retireYear, month: input.retireMonth }, ...input });
  const L = r.legal || {};
  return { total: R2(L.total), pa: R2(L.personalAccount?.amount || 0), paBal: R2(L.personaccount?.balance || L.personalAccount?.balance || 0), months: L.months, age: L.ageStr, extra: R2(L.extraPension?.amount || 0) };
}
const base15 = { gender: 'female', genderType: 'fw55', birthYear: 1971, birthMonth: 3, workYear: 2011, workMonth: 7, retireYear: RY, retireMonth: RM, totalYears: 15.25, avgIndex: 1.0 };
const b = calc({ ...base15, name: 'b' });
console.log(`基准 100%档 15.25年：月领 ${b.total}`);
for (const idx of [2.0, 3.0]) {
  const r = calc({ ...base15, name: 'x', avgIndex: idx });
  const cIdx = totalContrib(2011, 7, RY, RM, idx).sum, cBase = totalContrib(2011, 7, RY, RM, 1.0).sum;
  const dCash = cIdx - cBase, dMon = r.total - b.total;
  console.log(`  100%→${(idx * 100).toFixed(0)}%：多缴 ${dCash.toFixed(0)} 元，多领 ${dMon.toFixed(2)} 元/月 ⇒ 回本 ${(dCash / dMon / 12).toFixed(1)} 年`);
}
for (const ty of [20.25, 25.25]) {
  const r = calc({ ...base15, name: 'y', totalYears: ty });
  // 延年限多缴：从 2011-07 起多缴到 2026-10 之后不可能，改为按"多缴的月数×当年基数"估算不可靠 ⇒ 只给月领差
  const dMon = r.total - b.total;
  console.log(`  100% 15.25→${ty}年：多领 ${dMon.toFixed(2)} 元/月（多缴额需逐年实缴，此处只给月领差）`);
}

console.log('\n\n############ 第3篇重设 · 弹性提前窗口内 ############');
const P3 = [
  { tag: '女工50(1979.03生,47岁退)', gender: 'female', genderType: 'fw50', birthYear: 1979, birthMonth: 3, workYear: 1999, workMonth: 7, retireYear: 2026, retireMonth: 3, totalYears: 26.75 },
  { tag: '女干部55(1971.03生,55岁退)', gender: 'female', genderType: 'fw55', birthYear: 1971, birthMonth: 3, workYear: 1996, workMonth: 7, retireYear: 2026, retireMonth: 3, totalYears: 29.75 },
  { tag: '男职工60(1966.03生,60岁退)', gender: 'male', genderType: 'male', birthYear: 1966, birthMonth: 3, workYear: 1991, workMonth: 7, retireYear: 2026, retireMonth: 3, totalYears: 35 },
];
for (const p of P3) {
  const r = calculate(config, { province: 'jilin', cityType: 'prov', personalAcc: 0, name: p.tag, retireDateInput: { year: p.retireYear, month: p.retireMonth }, ...p });
  const L = r.legal || {};
  console.log(`\n【${p.tag}】缴费 ${L.totalYears} 年`);
  console.log(`  法定退休：${L.ageStr} 计发月数 ${L.months} → 基础 ${R2(L.basicPension?.amount)} 个账 ${R2(L.personalAccount?.amount)} 增发 ${R2(L.extraPension?.amount)} 合计 ${R2(L.total)}`);
  if (r.flex) {
    const F = r.flex;
    console.log(`  弹性提前：${F.ageStr} 计发月数 ${F.months} → 基础 ${R2(F.basicPension?.amount)} 个账 ${R2(F.personalAccount?.amount)} 合计 ${R2(F.total)}`);
    const dm = R2(L.total - F.total);
    console.log(`  ⇒ 每月差 ${dm} 元（法定多 ${dm > 0 ? '领' : '少领'} ${Math.abs(dm)}）`);
  }
  if ((r.warnings || []).length) console.log('  ⚠️ ' + (r.warnings || []).map(w => w.msg || w).join('; '));
}
