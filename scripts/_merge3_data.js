/**
 * 合并重发三篇 · 引擎数据源 v2
 * 纪律：🔴 不传 baseRetireInput/baseProvInput；🔴 只传 totalYears，视同/实际交给引擎
 * 设计：所有场景都用「连续缴费」避免断缴（断缴需复刻个人账户，见第2篇）
 * 用法: node scripts/_merge3_data.js
 */
const path = require('path');
const { calculate } = require(path.resolve('./engine/pension-engine.js'));
const cfg = require(path.resolve('./cloudfunctions/calculate/provinces/jilin.js'));
const config = cfg.getEngineConfig ? cfg.getEngineConfig() : cfg;

const R2 = x => Math.round(x * 100) / 100;

function calc(input) {
  const r = calculate(config, input);
  const L = r.legal || {};
  return {
    age: L.ageStr, months: L.months,
    basic: R2(L.basicPension?.amount || 0),
    basicDesc: L.basicPension?.description || '',
    paAmount: R2(L.personalAccount?.amount || 0),
    paBalance: R2(L.personalAccount?.balance || 0),
    trans: R2(L.transitionalPension?.amount || 0),
    extra: R2(L.extraPension?.amount || 0),
    extraDesc: L.extraPension?.description || '',
    special: R2(L.specialAddition?.amount || 0),
    total: R2(L.total),
    baseRetire: L.baseRetire,
    totalYears: L.totalYears, actualYears: L.actualYears, sightYears: L.sightYears,
    warnings: (r.warnings || []).map(w => typeof w === 'string' ? w : (w.msg || '')),
    _flex: r.flex ? {
      age: r.flex.ageStr, months: r.flex.months,
      paAmount: R2(r.flex.personalAccount?.amount || 0), total: R2(r.flex.total),
    } : null,
  };
}

function person(o) {
  return {
    province: 'jilin', cityType: 'prov', personalAcc: 0,
    retireDateInput: { year: o.rY, month: o.rM },
    ...o,
  };
}

// ================= 第1篇：灵活就业 · 同样年限，不同档位 =================
console.log('############ 第1篇 · 灵活就业同年限不同档位 ############');
const SCEN = {
  'S15': { desc: '15.25年（2011-07起缴至2026-10退休）', birthYear: 1971, birthMonth: 3, workYear: 2011, workMonth: 7, rY: 2026, rM: 10, gender: 'female', genderType: 'fw55', totalYears: 15.25 },
  'S30': { desc: '30.25年（1996-07起缴至2026-10退休）', birthYear: 1971, birthMonth: 3, workYear: 1996, workMonth: 7, rY: 2026, rM: 10, gender: 'female', genderType: 'fw55', totalYears: 30.25 },
};
for (const [k, s] of Object.entries(SCEN)) {
  console.log(`\n===== ${k}：${s.desc} =====`);
  const rows = [];
  for (const idx of [0.6, 0.8, 1.0, 1.2, 2.0, 3.0]) {
    const r = calc(person({ ...s, name: `${k}-${idx}`, avgIndex: idx }));
    rows.push({ idx, ...r });
    console.log(`${String(idx * 100 + '%').padStart(5)} 基础=${String(r.basic).padStart(8)} 个账月领=${String(r.paAmount).padStart(8)} 余额=${String(r.paBalance).padStart(11)} 增发=${String(r.extra).padStart(7)} 合计=${String(r.total).padStart(8)} ${r.warnings.length ? '⚠️' + r.warnings.join(';') : ''}`);
  }
  const b = rows.find(x => x.idx === 1.0);
  console.log(`-- 基准(100%)：基础${b.basic} 个账${b.paAmount} 增发${b.extra} 合计${b.total}｜计发月数${b.months}｜基数${b.baseRetire}｜${b.extraDesc}`);
  const lo = rows.find(x => x.idx === 0.6), hi = rows.find(x => x.idx === 3.0);
  console.log(`-- 60%→300%：月领差 ${R2(hi.total - lo.total)} 元/月（${R2(hi.total / lo.total)} 倍）`);
}

// 提档 vs 延年限（同样多花的钱）
console.log('\n===== 提档 vs 延年限（S15 场景，100% 基准）=====');
const b15 = calc(person({ ...SCEN.S15, name: 'base', avgIndex: 1.0 }));
for (const yrs of [16.25, 18.25, 20.25, 25.25]) {
  const r = calc(person({ ...SCEN.S15, name: 'x', avgIndex: 1.0, totalYears: yrs }));
  console.log(`100%档 ${String(yrs).padStart(6)}年  合计=${String(r.total).padStart(8)}  比15.25年多 ${R2(r.total - b15.total)}`);
}

// ================= 第3篇：弹性提前退休（引擎直接给 flex 对照） =================
console.log('\n\n############ 第3篇 · 弹性提前退休三人物 ############');
const P = [
  { tag: '女工50', gender: 'female', genderType: 'fw50', birthYear: 1976, birthMonth: 3, workYear: 1996, workMonth: 7, rY: 2026, rM: 3, totalYears: 30 },
  { tag: '女干部55', gender: 'female', genderType: 'fw55', birthYear: 1971, birthMonth: 3, workYear: 1996, workMonth: 7, rY: 2026, rM: 10, totalYears: 30.25 },
  { tag: '男职工60', gender: 'male', genderType: 'male', birthYear: 1966, birthMonth: 5, workYear: 1991, workMonth: 7, rY: 2026, rM: 5, totalYears: 35 },
];
for (const p of P) {
  const r = calc(person({ ...p, name: p.tag, avgIndex: 1.0 }));
  console.log(`\n【${p.tag}】出生${p.birthYear}.${String(p.birthMonth).padStart(2, '0')} 退休${p.rY}.${String(p.rM).padStart(2, '0')} 缴费${r.totalYears}年`);
  console.log(`  法定退休：${r.age} 计发月数${r.months} → 基础${r.basic} 个账${r.paAmount}(余${r.paBalance}) 增发${r.extra} 合计${r.total}`);
  if (r._flex) console.log(`  弹性提前：${r._flex.age} 计发月数${r._flex.months} → 个账${r._flex.paAmount} 合计${r._flex.total}  ⇒ 月差 ${R2(r.total - r._flex.total)}`);
  if (r.warnings.length) console.log('  ⚠️ warnings: ' + r.warnings.join('; '));
}
