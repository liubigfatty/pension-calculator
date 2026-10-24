/**
 * 哨兵：湖南 2026 计发基数 / 山西 2023 计发基数（2026-10-09 订正）
 *
 * ① 湖南：原 `base_rates[2026]=6843` 是把「社保缴费基准值（=2025全口径社平）」误当计发基数。
 *    湘人社规〔2026〕14号原文：6843 是 2026 年社会保险**缴费基准值**，只在计算"2026年度缴费工资指数"时调整，
 *    **未调整计发基数**；本仓库两张 2026 真实核定表（株洲 2026-03=7694、娄底 2026-06=7699）实证。
 *    ⇒ 删键，2026 年度回退上年 7694（官方未公布，按纪律不写死）。
 * ② 山西：原 `PROV_BASE[2023]=6987` 系 6897 数字换位（本文件注释自述 6897，两张 2023-04 核定表均用 6897）。
 *
 * ⚠️ 关键：**不传 baseRetire**，走引擎默认取数路径（案例库都手工注入 base_number，掩盖了此问题）。
 */
const path = require('path')
const { calculate } = require(path.resolve('./engine/pension-engine.js'))

let pass = 0, fail = 0
function chk(tag, actual, expected, tol) {
  const ok = Math.abs(actual - expected) <= (tol == null ? 1 : tol)
  console.log((ok ? '  ✅ ' : '  ❌ ') + tag + ' 实算=' + actual + ' 期望=' + expected)
  ok ? pass++ : fail++
}

function cfg(p) {
  const m = require(path.resolve('./cloudfunctions/calculate/provinces/' + p + '.js'))
  return m.getEngineConfig ? m.getEngineConfig() : m
}
function run(prov, input) {
  const r = calculate(cfg(prov), Object.assign({ province: prov, cityType: 'prov', retireType: 'standard', avgIndex: 1.0 }, input))
  return r.legal || r
}
// 从基础养老金描述里抠出计发基数（形如 "(7,694 + 7,694 × 1.00) / 2 ..."）
function baseOf(L) {
  const d = (L.basicPension && L.basicPension.description) || ''
  const m = d.match(/\(([\d,]+(?:\.\d+)?)\s*\+/)
  return m ? parseFloat(m[1].replace(/,/g, '')) : NaN
}

console.log('══ 湖南：2026 退休默认取数应为 7694（不是 6843）══')
{
  const L = run('hunan', {
    gender: 'male', birthYear: 1966, birthMonth: 3,
    workYear: 1994, workMonth: 10,
    retireDateInput: { year: 2026, month: 3 },
    personalAcc: 120000, totalYears: 31.33, sightYears: 8.17, months: 170,
  })
  const b = baseOf(L)
  console.log('   ' + (L.basicPension.description || ''))
  chk('2026年退休·计发基数 = 7694（回退上年）', b, 7694)
  chk('❗不该是 6843', b === 6843 ? 1 : 0, 0)

  const L2 = run('hunan', {
    gender: 'male', birthYear: 1965, birthMonth: 7,
    workYear: 1990, workMonth: 1,
    retireDateInput: { year: 2025, month: 7 },
    personalAcc: 150000, totalYears: 35, sightYears: 6, months: 170,
  })
  chk('2025年退休·计发基数仍 7694', baseOf(L2), 7694)
}

console.log('\n══ 山西：2023 退休默认取数应为 6897（不是 6987）══')
{
  const L = run('shanxi', {
    gender: 'male', birthYear: 1963, birthMonth: 4,
    workYear: 1985, workMonth: 7,
    retireDateInput: { year: 2023, month: 4 },
    personalAcc: 90000, totalYears: 37.75, sightYears: 10.5, months: 170,
  })
  const b = baseOf(L)
  console.log('   ' + (L.basicPension.description || ''))
  chk('2023年退休·计发基数 = 6897', b, 6897)
  chk('❗不该是 6987', b === 6987 ? 1 : 0, 0)

  const L2 = run('shanxi', {
    gender: 'male', birthYear: 1964, birthMonth: 6,
    workYear: 1986, workMonth: 1,
    retireDateInput: { year: 2025, month: 6 },
    personalAcc: 100000, totalYears: 39, sightYears: 10, months: 170,
  })
  chk('2025年退休·计发基数仍 7253', baseOf(L2), 7253)
}

console.log('\n=== ' + pass + ' / ' + (pass + fail) + ' ===')
if (fail) process.exit(1)
