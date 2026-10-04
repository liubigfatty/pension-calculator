/**
 * 守 r.flex（弹性提前退休）自洽性 —— 2026-10-04 修复后的回归哨兵
 *
 * 背景：修复前 flexBasic/flexExtra/flexTrans 传的是**原始** totalYears/actualYears
 *       （＝缴到法定退休的年限），只有 flexPersonal 用 flexDate
 *       ⇒ 「人退了但社保还继续缴到法定年龄」，月领偏高约 6%，
 *          且展示的 flexTotalYears（已减提前月数）压根没参与算钱。
 *
 * 断言（不看具体数字，看自洽 —— 引擎再改也逃不掉）：
 *   A. r.flex.total  == 独立调用 legal(retireDateInput = flex.date).total   （±0.05）
 *      ⇒ 即「弹性提前」＝「把退休时点换成提前那天重新算一遍，缴费缴到那天为止」
 *   B. r.flex.totalYears == 该独立调用的 totalYears                          （±0.02）
 *      ⇒ 展示的年限必须就是算钱用的年限
 *   C. r.flex.total < r.legal.total                                          （提前必然更少）
 *
 * 用法：node scripts/_verify_flex_branch.js
 */
const path = require('path');
const { calculate } = require(path.resolve('./engine/pension-engine.js'));

const PROV_DIR = path.resolve('./cloudfunctions/calculate/provinces');
const R2 = (x) => Math.round(x * 100) / 100;

const CASES = [
  {
    tag: '吉林·女工50档(李姐)', province: 'jilin', cityType: 'prov',
    gender: 'female', genderType: 'fw50', birthYear: 1979, birthMonth: 3, workYear: 2004, workMonth: 7,
    note: '覆盖 flexExtra（吉林长缴增发）',
  },
  {
    tag: '吉林·男(老张)', province: 'jilin', cityType: 'prov',
    gender: 'male', genderType: 'male', birthYear: 1966, birthMonth: 3, workYear: 1991, workMonth: 7,
    note: '覆盖 flexExtra + 提前量较小',
  },
  {
    tag: '吉林·女干部55档', province: 'jilin', cityType: 'prov',
    gender: 'female', genderType: 'fw55', birthYear: 1971, birthMonth: 3, workYear: 1996, workMonth: 7,
    note: '覆盖 flexExtra',
  },
  {
    tag: '辽宁·男(有视同缴费)', province: 'liaoning', cityType: 'prov',
    gender: 'male', genderType: 'male', birthYear: 1966, birthMonth: 5, workYear: 1991, workMonth: 7,
    note: '覆盖 flexTrans（过渡性养老金）',
  },
];

let fail = 0;
console.log('════ r.flex 自洽性回归 ════\n');

for (const c of CASES) {
  const { tag, note, ...rest } = c;
  const cfgMod = require(path.join(PROV_DIR, c.province + '.js'));
  const config = cfgMod.getEngineConfig ? cfgMod.getEngineConfig() : cfgMod;
  const base = { ...rest, avgIndex: 1, personalAccInput: 0, name: tag };

  const r = calculate(config, base);
  const L = r.legal || {}, F = r.flex || {};
  if (!F.date) { console.log(`⏭  ${tag}：该人群无弹性提前方案（canFlex=${r.comparison?.canFlex}），跳过`); continue; }

  // 干净口径：把退休时点换成提前那天，重新独立算一遍
  const r2 = calculate(config, { ...base, retireDateInput: { year: F.date.year, month: F.date.month } });
  const E = r2.legal || {};

  const dTotal = R2(F.total - E.total);
  const dYears = Math.round((F.totalYears - E.totalYears) * 100) / 100;
  const okA = Math.abs(dTotal) <= 0.05;
  const okB = Math.abs(dYears) <= 0.02;
  const okC = F.total < L.total;
  const ok = okA && okB && okC;
  if (!ok) fail++;

  console.log(`${ok ? '✅' : '❌'} ${tag}   [${c.province}/${c.cityType}]  ${note}`);
  console.log(`   法定    ${L.ageStr}  年限${R2(L.totalYears)}年  月领 ${L.total}`);
  console.log(`   弹性    ${F.ageStr}  年限${R2(F.totalYears)}年  月领 ${F.total}   （提前 ${r.comparison?.flexAdvance ?? '-'} 个月）`);
  console.log(`   干净口径 ${E.ageStr}  年限${R2(E.totalYears)}年  月领 ${E.total}`);
  console.log(`   A 金额一致: ${okA ? '✓' : '✗'} 差 ${dTotal}  |  B 年限一致: ${okB ? '✓' : '✗'} 差 ${dYears}  |  C 提前更少: ${okC ? '✓' : '✗'}`);
  if (r.warnings && r.warnings.length) console.log(`   ⚠ ${r.warnings.map((w) => w.msg || w).join('; ')}`);
  console.log('');
}

console.log(fail ? `❌ ${fail} 条不自洽` : '🎉 r.flex 全部自洽（金额/年限同源，且提前必然更少）');
process.exit(fail ? 1 : 0);
