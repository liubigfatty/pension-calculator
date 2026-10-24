/**
 * 哨兵：2026-10-09 四省规则修正的回归基线
 *
 *   ① 上海 沪人社规〔2026〕16号（2026-08-16 施行，废止〔2021〕32号/27号）
 *        一(一) 剩余月数折算为年、保留 4 位小数；四 三项分别"见分进角"
 *   ② 广东 2026-01-01 起（粤人社规〔2021〕24号）
 *        有视同缴费权益者停发"缴费年限津贴"；粤劳电〔2009〕32号"加发100"全员保留
 *   ③ 福建 闽政〔2006〕24号：缴费年限"半段进整"（尾数≤6个月计0.5年、≥7个月计1年）
 *   ④ 江苏 苏人社厅 2024-01-12 通知：过渡性养老金三年过渡期（2024-40% / 2025-70% / 2026-100%）
 *
 * 用法：node scripts/_verify_rule_fixes_20261009.js
 * 注意：本脚本**不复刻公式**，全部实跑引擎；只有"见分进角"用独立实现做交叉校验。
 */
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const engine = require(path.join(ROOT, 'engine/pension-engine.js'));

let pass = 0, fail = 0;
function ok(name, cond, detail) {
  if (cond) { pass++; console.log('  ✅ ' + name + (detail ? '   ' + detail : '')); }
  else { fail++; console.log('  ❌ ' + name + '   ' + detail); }
}
const near = (a, b, tol) => Math.abs(a - b) <= (tol == null ? 0.005 : tol);
function jiaoCeil(x) { return Math.ceil(Math.round(x * 100) / 10) / 10; }
const onJiao = (v) => Math.abs(Math.round(v * 10) - v * 10) < 1e-6;
function cfg(p) { return require(path.join(ROOT, 'cloudfunctions/calculate/provinces', p + '.js')).getEngineConfig(); }

// ══════════════════════ ① 上海 ══════════════════════
console.log('\n① 上海 · 沪人社规〔2026〕16号（剩余月数折算为年 + 见分进角）');
{
  const sh = cfg('shanghai');
  const r = engine.calculate(sh, {
    gender: 'female', genderType: 'fw50', birthYear: 1976, birthMonth: 2,
    workYear: 2001, workMonth: 4, retireDateInput: { year: 2026, month: 2 },
    avgIndex: 1.5231, personalAcc: 307242, baseRetire: 12434, baseProv: 12434,
    totalYears: 23.914, months: 195,
  });
  const yrs = Math.round(Math.round(23.914 * 12) / 12 * 10000) / 10000; // 23.9167
  const rawBase = (12434 + 12434 * 1.5231) / 2 * yrs * 0.01;            // 3751.60
  const b = r.legal.basicPension.amount;
  ok('基础养老金 = 见分进角(新口径)', near(b, jiaoCeil(rawBase)), `引擎=${b} 独立复算=${jiaoCeil(rawBase)}（年限 ${yrs} 年）`);
  ok('描述已改用"折算为年×1%"口径', /23\.9167年/.test(r.legal.basicPension.description), r.legal.basicPension.description);
  ok('描述不再含已废止的 0.083%/月', !/0\.083%/.test(r.legal.basicPension.description));
  const p = r.legal.personalAccount.amount;
  ok('个人账户养老金 = 见分进角', near(p, jiaoCeil(307242 / 195)), `引擎=${p} 独立复算=${jiaoCeil(307242 / 195)}`);
  ok('基础/个人两项均落在"角"位', onJiao(b) && onJiao(p), `base=${b} personal=${p}`);
  // 见分进角必须是"进位"而不是四舍五入：3751.60 → 3751.7（四舍五入会得 3751.6）
  ok('见分进角语义 = 有分即进位', jiaoCeil(3629.3919) === 3629.4 && jiaoCeil(3751.6005) === 3751.6 && jiaoCeil(2981.0) === 2981.0,
     `jiaoCeil(3629.3919)=${jiaoCeil(3629.3919)}（进位）／jiaoCeil(3751.6005)=${jiaoCeil(3751.6005)}（分位为0不进）`);
}

// ══════════════════════ ② 广东 ══════════════════════
console.log('\n② 广东 2026 起：有视同缴费权益者停发缴费年限津贴，"加发100"保留');
{
  const gd = cfg('guangdong');
  const base = { gender: 'male', genderType: 'male', birthYear: 1966, birthMonth: 1, avgIndex: 0.556, personalAcc: 80000, cityType: 'prov' };
  const rSight = engine.calculate(gd, Object.assign({}, base, { workYear: 1985, workMonth: 10 }));   // 有视同权益
  const rNone  = engine.calculate(gd, Object.assign({}, base, { workYear: 2000, workMonth: 1 }));    // 无视同权益
  const tS = rSight.legal.transitionalPension, tN = rNone.legal.transitionalPension;
  ok('退休年 = 2026', rSight.legal.date.year === 2026 && rNone.legal.date.year === 2026, `${rSight.legal.date.year}/${rNone.legal.date.year}`);
  ok('有视同权益 → 津贴 0（停发）', tS._allowance === 0, `_allowance=${tS._allowance}，总年限=${rSight.legal.totalYears}`);
  ok('有视同权益 → 描述标注已停发', /停发/.test(tS.description), tS.description);
  ok('无视同权益 → 津贴 = floor(年限)×4', tN._allowance === Math.floor(rNone.legal.totalYears) * 4, `_allowance=${tN._allowance}，总年限=${rNone.legal.totalYears}`);
  ok('无视同权益 → 仍含"加发100"', /加发100/.test(tN.description), tN.description);
  ok('有视同权益 → 过渡性里仍含"加发100"', /加发100/.test(tS.description), tS.description);
}

// ══════════════════════ ③ 福建 ══════════════════════
console.log('\n③ 福建 · 闽政〔2006〕24号 缴费年限半段进整');
{
  const fj = cfg('fujian');
  const r = engine.calculate(fj, {
    gender: 'male', genderType: 'male', birthYear: 1964, birthMonth: 8,
    workYear: 1983, workMonth: 9, retireDateInput: { year: 2024, month: 8 },
    avgIndex: 1.012, personalAcc: 131737.16, baseRetire: 7528, baseProv: 7528,
    totalYears: 41, sightYears: 12.33, months: 139,
  });
  const t = r.legal.transitionalPension;
  ok('12.33 年 → 12.50 年（半段进整生效）', /12\.50年/.test(t.description), t.description);
  ok('过渡性养老金 = 1237.98（与核定表一致）', near(t.amount, 1237.98, 0.05), `引擎=${t.amount}`);
  ok('合计 = 5290.73', near(r.legal.total, 5290.73, 0.05), `引擎=${r.legal.total}`);
}

// ══════════════════════ ④ 江苏 ══════════════════════
console.log('\n④ 江苏 · 过渡性养老金三年过渡期（2024-40% / 2025-70% / 2026-100%）');
{
  const js = cfg('jiangsu');
  // case 1：淮安 2024-03 退休，新办法 1323.39 / 原办法 479.83
  const c1 = { gender: 'male', genderType: 'male', birthYear: 1964, birthMonth: 3, workYear: 1981, workMonth: 3,
    retireDateInput: { year: 2024, month: 3 }, avgIndex: 0.3246, personalAcc: 67874.03,
    baseRetire: 8613, baseProv: 8613, totalYears: 43.08, sightYears: 14.83, pre1996Years: 14.83,
    transIndex: 0.8634, months: 139 };
  const r24 = engine.calculate(js, Object.assign({}, c1, { transPensionOld: 479.83 }));
  const r24n = engine.calculate(js, c1);
  const t24 = r24.legal.transitionalPension;
  ok('2024 ⇒ 差额发 40% = 817.25', near(t24.amount, 817.25, 0.02), `引擎=${t24.amount}`);
  ok('2024 描述含"发放比例40%"', /发放比例40%/.test(t24.description), t24.description);

  // case 5：南京 2025-10 退休，新办法 1016.13 / 原办法 424.63
  const r25 = engine.calculate(js, {
    gender: 'male', genderType: 'male', birthYear: 1965, birthMonth: 10, workYear: 1986, workMonth: 7,
    retireDateInput: { year: 2025, month: 10 }, avgIndex: 0.6248, personalAcc: 88329.74,
    baseRetire: 8917, baseProv: 8917, totalYears: 36.58, sightYears: 9.5, pre1996Years: 9.5,
    transIndex: 0.9996, months: 139, transPensionOld: 424.63,
  });
  const t25 = r25.legal.transitionalPension;
  ok('2025 ⇒ 差额发 70% = 838.68', near(t25.amount, 838.68, 0.02), `引擎=${t25.amount}`);
  ok('2025 描述含"发放比例70%"', /发放比例70%/.test(t25.description), t25.description);

  // case 7：苏州 2026-06 退休（100%，且未提供原办法）
  const r26 = engine.calculate(js, {
    gender: 'male', genderType: 'male', birthYear: 1971, birthMonth: 5, workYear: 1991, workMonth: 7,
    retireDateInput: { year: 2026, month: 6 }, avgIndex: 1.1623, transIndex: 1.0606,
    personalAcc: 251981.62, baseRetire: 8917, baseProv: 8917, totalYears: 34.916666666666664,
    sightYears: 4.583333333333333, months: 169.5, cityType: 'prov',
  });
  const t26 = r26.legal.transitionalPension;
  ok('2026 ⇒ 全额（100%）= 520.22', near(t26.amount, 520.22, 0.15), `引擎=${t26.amount}`);
  ok('2026 描述含"全额发放"', /全额发放/.test(t26.description), t26.description);

  // 未注入原办法（app 端真实路径）
  const t24n = r24n.legal.transitionalPension;
  ok('未提供原办法 → 返回新办法并带 ⚠️ 告警', near(t24n.amount, 1323.39, 0.02) && /⚠️/.test(t24n.description), t24n.description);
  ok('无视同缴费年限 → 过渡性 0', near(engine.calculate(js, {
    gender: 'female', genderType: 'fw50', birthYear: 1974, birthMonth: 4, workYear: 1996, workMonth: 9,
    retireDateInput: { year: 2024, month: 4 }, avgIndex: 0.8566, personalAcc: 156346.02,
    baseRetire: 8613, baseProv: 8613, totalYears: 27.33, sightYears: 0, months: 195,
  }).legal.transitionalPension.amount, 0), 'case 2 苏州女工人');
}

console.log(`\n=== 结果：${pass} 通过 / ${fail} 失败 ===`);
process.exit(fail ? 1 : 0);
