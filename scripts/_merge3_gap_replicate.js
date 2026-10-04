/**
 * 第2篇断缴场景 · 个人账户复刻（pension-case-probe 复刻三纪律）
 * 纪律1：先校准到分 —— 复刻「连续缴费」必须与引擎分毫不差
 * 纪律2：复刻完把余额回传 personalAccInput 让引擎出总额，前三项仍由引擎算
 * 纪律3：文章里标注「实算」还是「估算」
 *
 * 引擎算法（照抄 pension-engine.js calcPersonalAccountPension）：
 *   首年(部分月)：totalAcc = totalAcc*(1+r_y) + (社平_y*idx*0.08)*firstMonths
 *   中间年(完整)：totalAcc = totalAcc*(1+r_y) + (社平_y*idx*0.08)*12
 *   末年(部分月)：totalAcc = totalAcc*(1+r_y)^(m/12) + (计发基数_y*idx*0.08)*m
 *   其中 firstMonths = 12 - fMonth + 1，且仅当 0 < firstMonths < 12 才走首年分支
 * 🔴 本脚本新增能力：skipList 里的年份不缴费（断缴），但账户余额照常计息
 */
const path = require('path');
const E = require(path.resolve('./engine/pension-engine.js'));
const cfgMod = require(path.resolve('./cloudfunctions/calculate/provinces/jilin.js'));
const config = cfgMod.getEngineConfig ? cfgMod.getEngineConfig() : cfgMod;
const R2 = x => Math.round(x * 100) / 100;

// —— 取数一律走引擎导出的 getBase（含缺失回退逻辑），不用本地数列 ——
const RATE = y => E.getAccRate(y, config);
const avg = y => E.getBase('prov', y, config, 'avg_salary_history') || E.getBase('prov', y, config) || 0;
const bas = y => E.getBase('prov', y, config) || 0;

function replicate({ startY, startM, retireY, retireM, avgIndex, skip = [] }) {
  // 🔴 关键：引擎用「孰晚原则」——个人账户起算点 = max(建账时间 account_start, 实际起缴时间)
  //    吉林 account_start = 1995-07 ⇒ 1991-1995 年的缴费不计入个人账户
  const acc = config.account_start || { year: startY, month: startM };
  const fYear = (acc.year > startY) ? acc.year : startY;
  const fMonth = (acc.year > startY) ? acc.month : ((acc.year === startY && acc.month > startM) ? acc.month : startM);
  console.log(`    [账户起算] 建账 ${acc.year}.${acc.month} / 起缴 ${startY}.${startM} ⇒ 实际从 ${fYear}.${fMonth} 起算`);
  let totalAcc = 0;
  const firstMonths = 12 - fMonth + 1;
  if (firstMonths > 0 && firstMonths < 12 && !skip.includes(fYear)) {
    const rate = RATE(fYear);
    totalAcc = totalAcc * (1 + rate) + (avg(fYear) * avgIndex * 0.08) * firstMonths;
  } else if (firstMonths === 12 && !skip.includes(fYear)) {
    // 引擎此分支不进，fYear 全年靠中间年循环覆盖不到 → 这里显式补齐（见下方校准）
    const rate = RATE(fYear);
    totalAcc = totalAcc * (1 + rate) + (avg(fYear) * avgIndex * 0.08) * 12;
  }
  for (let y = fYear + 1; y < retireY; y++) {
    if (skip.includes(y)) { totalAcc = totalAcc * (1 + RATE(y)); continue; } // 断缴：只计息不存入
    const rate = RATE(y);
    totalAcc = totalAcc * (1 + rate) + (avg(y) * avgIndex * 0.08) * 12;
  }
  const lastMonths = retireM - 1;
  if (lastMonths > 0) {
    const rate = RATE(retireY);
    totalAcc = totalAcc * Math.pow(1 + rate, lastMonths / 12) + (bas(retireY) * avgIndex * 0.08) * lastMonths;
  }
  return R2(totalAcc);
}

const A = { startY: 1991, startM: 7, retireY: 2026, retireM: 7, avgIndex: 1.0 };

console.log('══════ 纪律1：校准（连续缴费35年，必须与引擎分毫不差）══════');
const mine = replicate(A);
const r = E.calculate(config, {
  name: 'calib', province: 'jilin', cityType: 'prov', personalAcc: 0,
  gender: 'male', genderType: 'male', birthYear: 1966, birthMonth: 5,
  workYear: 1991, workMonth: 7, avgIndex: 1.0, totalYears: 35,
});
const eng = r.legal.personalAccount.balance;
console.log('引擎  :', eng);
console.log('复刻  :', mine);
console.log('差额  :', R2(mine - eng), '→', Math.abs(mine - eng) < 0.01 ? '✅ 校准通过' : '❌ 校准失败');
if (Math.abs(mine - eng) >= 0.01) process.exit(1);

console.log('\n══════ 第2篇 · 断缴场景（skip = 断缴年份）══════');
const SKIP = [1996, 1997, 1998, 1999, 2000, 2001]; // 1996.7-2001.6 断缴
console.log('（B 方案：李师傅 1991-07~1996-06 缴5年 → 1996-07~2001-06 断缴5年 → 2001-07~2026-06 缴25年，累计30年）');
console.log('  断缴年份 skip =', SKIP.join(','), '（1996 与 2001 部分月仍缴，按引擎首/末年逻辑计入）');

const balA = eng;                          // 连续35年
const balB = replicate({ ...A, skip: SKIP });
console.log('\n  连续35年 余额 =', balA);
console.log('  断缴5年 余额 =', balB, ' （少', R2(balA - balB), '）');

console.log('\n══════ 纪律2：余额回传引擎，让引擎出总额 ══════���');
function runWith(lbl, years, acc) {
  const rr = E.calculate(config, {
    name: lbl, province: 'jilin', cityType: 'prov', personalAcc: acc,
    gender: 'male', genderType: 'male', birthYear: 1966, birthMonth: 5,
    workYear: 1991, workMonth: 7, avgIndex: 1.0, totalYears: years,
  });
  const L = rr.legal;
  console.log('\n【' + lbl + '】' + L.ageStr + ' 计发月数 ' + L.months);
  console.log('  基础 ' + R2(L.basicPension.amount) + ' 个账 ' + R2(L.personalAccount.amount) + ' 增发 ' + R2(L.extraPension.amount) + ' 合计 ' + R2(L.total));
  return L;
}
const A2 = runWith('A 连续缴35年', 35, balA);
const B2 = runWith('B 断缴5年(累计30年)', 30, balB);
console.log('\n⇒ 断缴 5 年的代价：月领少 ' + R2(A2.total - B2.total) + ' 元');
