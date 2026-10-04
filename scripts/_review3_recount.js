/**
 * 三篇合并重发文 · 复核脚本（2026-10-04 复审）
 * 目的：① 核实「累计缴费」口径（基数 or 实掏）② 核实弹性提前建模是否自洽 ③ 重算回本
 * 纪律：不传 baseRetireInput/baseProvInput；引擎=engine/pension-engine.js；省份=cloudfunctions/calculate/provinces/jilin.js
 * 用法: node scripts/_review3_recount.js
 */
const path = require('path');
const { calculate } = require(path.resolve('./engine/pension-engine.js'));
const cfg = require(path.resolve('./cloudfunctions/calculate/provinces/jilin.js'));
const config = cfg.getEngineConfig ? cfg.getEngineConfig() : cfg;
const R2 = x => Math.round(x * 100) / 100;
const hist = config.avg_salary_history || {};

function calc(input) {
  const r = calculate(config, { province: 'jilin', cityType: 'prov', personalAcc: 0, ...input });
  const L = r.legal || {};
  return {
    r, L,
    age: L.ageStr, months: L.months, baseRetire: L.baseRetire,
    basic: R2(L.basicPension?.amount || 0),
    pa: R2(L.personalAccount?.amount || 0),
    paBal: R2(L.personalAccount?.balance || 0),
    extra: R2(L.extraPension?.amount || 0),
    total: R2(L.total),
    totalYears: L.totalYears, actualYears: L.actualYears, sightYears: L.sightYears,
    warn: (r.warnings || []).map(w => typeof w === 'string' ? w : (w.msg || '')),
  };
}
// 缴费「基数」总额（=Σ 月社平×档位×月数），不含费率
function contrib(fromY, fromM, toY, toM, idx) {
  let sum = 0;
  for (let y = fromY; y <= toY; y++) {
    const s = hist[y]; if (!s) continue;
    const b = y === fromY ? fromM : 1, e = y === toY ? toM : 12;
    sum += s * idx * (e - b + 1);
  }
  return R2(sum);
}
const FEE_FLEX = 0.20; // 灵活就业全额自付费率

console.log('=== 吉林社平（月，元）关键年 ===');
[1996, 2001, 2011, 2016, 2024, 2025, 2026].forEach(y => console.log(`  ${y}: ${hist[y] ?? '（缺失）'}`));
console.log('=== 2026 计发基数 ===');
console.log('  base_rates.prov[2026] =', (config.base_rates?.prov || {})[2026]);

// ===================== 第1篇 =====================
console.log('\n############ 第1篇 · 灵活就业档位对比（孙姐 1971.03 生 / fw55 / 2026.10 退）############');
const S15 = { birthYear: 1971, birthMonth: 3, gender: 'female', genderType: 'fw55', workYear: 2011, workMonth: 7, retireDateInput: { year: 2026, month: 10 }, totalYears: 15.25 };
const S30 = { birthYear: 1971, birthMonth: 3, gender: 'female', genderType: 'fw55', workYear: 1996, workMonth: 7, retireDateInput: { year: 2026, month: 10 }, totalYears: 30.25 };
const t15 = {}, t30 = {};
for (const idx of [0.6, 0.8, 1.0, 1.2, 2.0, 3.0]) {
  const a = calc({ ...S15, name: 'S15-' + idx, avgIndex: idx });
  const b = calc({ ...S30, name: 'S30-' + idx, avgIndex: idx });
  t15[idx] = a; t30[idx] = b;
  console.log(`${String(idx * 100).padStart(4)}% | S15 基础${String(a.basic).padStart(7)} 个账${String(a.pa).padStart(7)} 余额${String(a.paBal).padStart(10)} 增发${String(a.extra).padStart(6)} 合计${String(a.total).padStart(7)} | S30 合计${String(b.total).padStart(7)} 增发${String(b.extra).padStart(6)}${a.warn.length ? ' ⚠️' + a.warn.join(';') : ''}`);
}
console.log(`-- 计发月数 ${t15[1].months}｜2026计发基数 ${t15[1].baseRetire}｜S15年限 ${t15[1].totalYears}｜S30年限 ${t30[1].totalYears}`);
console.log('\n-- 缴费「基数」总额 vs 灵活就业实掏(×20%) --');
for (const idx of [0.6, 1.0, 2.0, 3.0]) {
  const c15 = contrib(2011, 7, 2026, 10, idx);
  const c30 = contrib(1996, 7, 2026, 10, idx);
  console.log(`  ${String(idx * 100).padStart(4)}%  S15 基数${String(R2(c15)).padStart(10)} 实掏${String(R2(c15 * FEE_FLEX)).padStart(9)} ｜ S30 基数${String(R2(c30)).padStart(10)} 实掏${String(R2(c30 * FEE_FLEX)).padStart(9)}`);
}
console.log('\n-- 提档增量回本（S15 100% 为基准）--');
for (const idx of [2.0, 3.0]) {
  const dBase = contrib(2011, 7, 2026, 10, idx) - contrib(2011, 7, 2026, 10, 1.0);
  const dMon = t15[idx].total - t15[1.0].total;
  console.log(`  100%→${idx * 100}%：基数多缴 ${R2(dBase)}，实掏多缴 ${R2(dBase * FEE_FLEX)}，多领 ${R2(dMon)}/月 ⇒ 回本 ${(dBase * FEE_FLEX / dMon / 12).toFixed(1)} 年（按基数口径会是 ${(dBase / dMon / 12).toFixed(1)} 年）`);
}
console.log('\n-- 早缴 vs 晚缴：每万元「实掏」换多少月领 --');
{
  const c15 = contrib(2011, 7, 2026, 10, 1.0) * FEE_FLEX, c30 = contrib(1996, 7, 2026, 10, 1.0) * FEE_FLEX;
  const p15 = t15[1.0].total / (c15 / 10000), p30 = t30[1.0].total / (c30 / 10000);
  console.log(`  甲 2011起缴：实掏 ${R2(c15)}，月领 ${t15[1.0].total} ⇒ 每万元 ${p15.toFixed(2)} 元/月`);
  console.log(`  乙 1996起缴：实掏 ${R2(c30)}，月领 ${t30[1.0].total} ⇒ 每万元 ${p30.toFixed(2)} 元/月`);
  console.log(`  早缴15年产出高 ${(((p30 / p15) - 1) * 100).toFixed(1)}%`);
}

// ===================== 第2篇 =====================
console.log('\n\n############ 第2篇 · 弹性提前退休建模核查 ############');
const CASES = [
  { tag: '李姐 女工50 1979.03', gender: 'female', genderType: 'fw50', birthYear: 1979, birthMonth: 3, workYear: 2002, workMonth: 7 },
  { tag: '王姐 女干部55 1971.03', gender: 'female', genderType: 'fw55', birthYear: 1971, birthMonth: 3, workYear: 1996, workMonth: 7 },
  { tag: '老张 男60 1966.03', gender: 'male', genderType: 'male', birthYear: 1966, birthMonth: 3, workYear: 1991, workMonth: 7 },
];
function yrs(workY, workM, rY, rM) { return R2(((rY - workY) * 12 + (rM - workM) + 1) / 12); }
for (const c of CASES) {
  console.log(`\n【${c.tag}】参工 ${c.workYear}.${c.workMonth}`);
  // 引擎自带 legal + flex（同一次调用，totalYears 相同）
  const base = calc({ ...c, name: c.tag, avgIndex: 1.0, retireDateInput: null });
  console.log(`  引擎 legal：${base.age} 月数${base.months} 年限${base.totalYears} 基数${base.baseRetire} → 基础${base.basic} 个账${base.pa}(余${base.paBal}) 增发${base.extra} 合计${base.total}`);
  const F = base.r.flex;
  if (F) {
    console.log(`  引擎 flex ：${F.ageStr} 月数${F.months} → 基础${R2(F.basicPension?.amount)} 个账${R2(F.personalAccount?.amount)}(余${R2(F.personalAccount?.balance)}) 增发${R2(F.extraPension?.amount)} 合计${R2(F.total)}`);
    console.log(`  ⇒ 引擎口径月差 ${R2(base.total - F.total)}`);
  } else console.log('  （无 flex）');

  // 干净口径 A：两个方案独立算，各自缴到各自的退休时点
  const legalY = base.age; // 法定时点
  // 从 ageStr 解析法定退休 y/m：用引擎给的信息不可靠，改为用延迟退休表推算：直接打印 legal 的 date
  console.log(`  法定时点 = ${base.L.date || '(无date字段)'}`);
}

console.log('\n\n############ 第2篇 · 干净口径 A（各自缴到各自退休时点）############');
const A = [
  { tag: '李姐', gender: 'female', genderType: 'fw50', birthYear: 1979, birthMonth: 3, workYear: 2002, workMonth: 5, legal: { y: 2031, m: 5 }, early: { y: 2029, m: 3 } },
  { tag: '王姐', gender: 'female', genderType: 'fw55', birthYear: 1971, birthMonth: 3, workYear: 1996, workMonth: 7, legal: { y: 2026, m: 7 }, early: { y: 2026, m: 3 } },
  { tag: '老张', gender: 'male', genderType: 'male', birthYear: 1966, birthMonth: 3, workYear: 1991, workMonth: 7, legal: { y: 2026, m: 7 }, early: { y: 2026, m: 3 } },
];
for (const c of A) {
  // 🔴 不传 totalYears，让引擎按 workYear→retireDateInput 自算（两个方案各算各的）
  const L = calc({ gender: c.gender, genderType: c.genderType, birthYear: c.birthYear, birthMonth: c.birthMonth, workYear: c.workYear, workMonth: c.workMonth, name: c.tag + '-L', avgIndex: 1.0, retireDateInput: { year: c.legal.y, month: c.legal.m } });
  const E = calc({ gender: c.gender, genderType: c.genderType, birthYear: c.birthYear, birthMonth: c.birthMonth, workYear: c.workYear, workMonth: c.workMonth, name: c.tag + '-E', avgIndex: 1.0, retireDateInput: { year: c.early.y, month: c.early.m } });
  const N = (c.legal.y - c.early.y) * 12 + (c.legal.m - c.early.m);
  const X = R2(L.total - E.total);
  const t = E.total * N / X; // 提前者白拿 N 个月 × A；之后每月少 X ⇒ 追平月数 = A*N/X
  const ageEarly = (c.early.y - c.birthYear) + (c.early.m - c.birthMonth) / 12;
  console.log(`\n【${c.tag}】缴费 法定${L.totalYears}年 / 提前${E.totalYears}年，提前 ${N} 个月`);
  console.log(`  法定：${L.age} 月数${L.months} 基数${L.baseRetire} → 基础${L.basic} 个账${L.pa}(余${L.paBal}) 增发${L.extra} 合计${L.total}${L.warn.length ? ' ⚠️' + L.warn.join(';') : ''}`);
  console.log(`  提前：${E.age} 月数${E.months} 基数${E.baseRetire} → 基础${E.basic} 个账${E.pa}(余${E.paBal}) 增发${E.extra} 合计${E.total}${E.warn.length ? ' ⚠️' + E.warn.join(';') : ''}`);
  console.log(`  差额分解：基础 ${R2(L.basic - E.basic)}｜个账 ${R2(L.pa - E.pa)}｜增发 ${R2(L.extra - E.extra)}｜合计 ${X}`);
  console.log(`  提前期间白拿 ${R2(E.total * N)} 元；从法定时点起追平需 ${R2(t)} 个月 = ${(t / 12).toFixed(1)} 年`);
  console.log(`  ⇒ 追平年龄 ≈ ${(ageEarly + (N + t) / 12).toFixed(1)} 岁（提前退时 ${ageEarly.toFixed(1)} 岁）｜每天差额 ${R2(X / 30.4)} 元/天`);
}

// ===================== 第3篇 =====================
console.log('\n\n############ 第3篇 · 晚缴5年（李师傅 1966.05 生 / 男 / 2026.10 退）############');
const base3 = { birthYear: 1966, birthMonth: 5, gender: 'male', genderType: 'male', retireDateInput: { year: 2026, month: 10 }, avgIndex: 1.0 };
const JIA = calc({ ...base3, name: '甲', workYear: 1996, workMonth: 7, totalYears: 30.25 });
const YI = calc({ ...base3, name: '乙', workYear: 2001, workMonth: 7, totalYears: 25.25 });
console.log(`  甲：${JIA.age} 月数${JIA.months} 年限${JIA.totalYears} → 基础${JIA.basic} 个账${JIA.pa}(余${JIA.paBal}) 增发${JIA.extra} 合计${JIA.total}`);
console.log(`  乙：${YI.age} 月数${YI.months} 年限${YI.totalYears} → 基础${YI.basic} 个账${YI.pa}(余${YI.paBal}) 增发${YI.extra} 合计${YI.total}`);
console.log(`  差：基础${R2(JIA.basic - YI.basic)} 个账${R2(JIA.pa - YI.pa)} 增发${R2(JIA.extra - YI.extra)} 合计${R2(JIA.total - YI.total)}`);
const cJ = contrib(1996, 7, 2026, 10, 1.0), cY = contrib(2001, 7, 2026, 10, 1.0);
console.log(`  缴费基数：甲 ${cJ} / 乙 ${cY} / 差 ${R2(cJ - cY)}；实掏差 ${R2((cJ - cY) * FEE_FLEX)}`);
const dm = JIA.total - YI.total;
console.log(`  回本：按基数 ${( (cJ-cY)/dm/12 ).toFixed(1)} 年；按实掏(×20%) ${( (cJ-cY)*FEE_FLEX/dm/12 ).toFixed(2)} 年`);
console.log(`  每少缴1年 ⇒ 月领少 ${R2(dm / 5)} 元`);
