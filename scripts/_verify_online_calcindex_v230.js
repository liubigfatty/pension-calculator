// 验证线上 calcIndex 副本（v2.3.0）的实际行为——不只是与本地一致，而是行为正确
//
// 用 `cli cloud functions download` 拉回的副本独立运行：
//   1. 31 省合规数据（参保地 60%/100%/300% 档）：指数应恰好 0.6 / 1.0 / 3.0，零告警
//      ——证明「废除通用夹取」对合规用户零影响
//   2. 跨省流动（国办发〔2009〕66号）：按退休地社平作分母，跑出区间且带 warning
//   3. 超低/超高档：不再被夹取，数值为实际比值 + warning
//   4. 省级明文保留：沪分段保底、渝上限分段、桂建账前<1按1
//   5. 上海 2014 起无明文 ⇒ 不保底
const path = require('path')
const ROOT = path.join(__dirname, '..')
const DL = path.join(ROOT, '_verify_dl/calcindex_v230')

const C = require(path.join(DL, 'calcIndex.js'))
const DATA = require(path.join(DL, 'provinces-data.js'))

let pass = 0, fail = 0
const errs = []

function check(label, actual, expected, tol) {
  tol = tol == null ? 5e-5 : tol
  const ok = Math.abs(actual - expected) <= tol
  if (ok) { pass++ } else {
    fail++
    errs.push(`${label}: 实际 ${actual}，期望 ${expected}`)
  }
  console.log(`  ${ok ? '✅' : '❌'} ${label}: ${actual}${ok ? '' : ` (期望 ${expected})`}`)
}

function calc(code, year, tier, baseHist) {
  const cfg = DATA[code]
  const h = baseHist || cfg.avg_salary_history
  const base = Math.round((h[year] || 0) * tier * 100) / 100
  return C.calculateIndex({
    provinceConfig: cfg, provinceCode: code,
    contribution: [{ year, months: 12, baseAvg: base }],
    granularity: 'A'
  })
}

const CODES = Object.keys(C.PROVINCE_RULES).filter(c => DATA[c]).sort()
const Y = 2025

console.log('='.repeat(66))
console.log('线上 calcIndex 副本 v2.3.0 — 行为验证')
console.log('='.repeat(66))

console.log('\n[1] 31 省合规数据：参保地 60%/100%/300% 档 → 指数应恰好 0.6 / 1.0 / 3.0，零告警')
{
  let bad = 0
  for (const code of CODES) {
    for (const [tier, exp] of [[0.6, 0.6], [1.0, 1.0], [3.0, 3.0]]) {
      const h = DATA[code].avg_salary_history
      const years = Object.keys(h).map(Number).filter(y => h[y] > 0).sort((a, b) => b - a)
      const y = years[0]
      if (y == null) continue
      const r = calc(code, y, tier)
      const okVal = Math.abs(r.avgIndex - exp) <= 5e-5
      const okWarn = (r.warnings || []).length === 0
      if (!okVal || !okWarn) {
        bad++
        errs.push(`${code} ${tier}档: avgIndex=${r.avgIndex}(期望${exp}) warnings=${(r.warnings || []).length}`)
      } else { pass++ }
    }
  }
  console.log(`  ${bad === 0 ? '✅' : '❌'} ${CODES.length} 省 × 3 档 = ${CODES.length * 3} 组：${bad === 0 ? '全部恰好命中且零告警' : bad + ' 组偏离'}`)
  if (bad) fail++
}

console.log('\n[2] 废除夹取：超低/超高档按实际比值，并产生 warning')
{
  const r40 = calc('shandong', Y, 0.4)
  check('山东 40% 档（旧逻辑会被夹成 0.6000）', r40.avgIndex, 0.4)
  const w40 = (r40.warnings || [])[0]
  console.log(`     warning: ${w40 ? w40.type : '（缺失）'}`)
  if (!w40 || w40.type !== 'below_0_6') { fail++; errs.push('40% 档未产生 below_0_6 warning') } else pass++

  const r500 = calc('shandong', Y, 5.0)
  check('山东 500% 档（旧逻辑会被夹成 3.0000）', r500.avgIndex, 5.0)
  const w500 = (r500.warnings || [])[0]
  console.log(`     warning: ${w500 ? w500.type : '（缺失）'}`)
  if (!w500 || w500.type !== 'above_3_0') { fail++; errs.push('500% 档未产生 above_3_0 warning') } else pass++
}

console.log('\n[3] 跨省流动（国办发〔2009〕66号）：按退休地社平作分母')
{
  const hj = DATA.jiangxi.avg_salary_history, hs = DATA.shanghai.avg_salary_history
  const y = Object.keys(hj).map(Number).filter(v => hj[v] > 0 && hs[v] > 0).sort((a, b) => b - a)[0]
  const exp = Math.round(hj[y] * 0.6 / hs[y] * 10000) / 10000
  const r = C.calculateIndex({
    provinceConfig: DATA.shanghai, provinceCode: 'shanghai',
    contribution: [{ year: y, months: 12, baseAvg: Math.round(hj[y] * 0.6 * 100) / 100 }],
    granularity: 'A'
  })
  check(`江西 60% 档 → 上海退休（${y} 年）`, r.avgIndex, exp)
  console.log(`     基数 ${(hj[y] * 0.6).toFixed(0)} ÷ 上海社平 ${hs[y]} = ${exp}（旧逻辑=0.6000，虚增 ${((0.6 / exp - 1) * 100).toFixed(0)}%）`)
  const w = (r.warnings || [])[0]
  if (!w) { fail++; errs.push('跨省流动未产生 warning') } else pass++
  const d = r.yearsDetail[0]
  if (d.indexRaw == null || d.outOfRange !== 'low') { fail++; errs.push('yearsDetail 未暴露 indexRaw/outOfRange') } else pass++
  console.log(`     yearsDetail: indexRaw=${d.indexRaw} outOfRange=${d.outOfRange}`)
}

console.log('\n[4] 省级明文规则保留')
{
  // 上海 2011 年（明文 <1 按 1）
  const rSH11 = calc('shanghai', 2011, 0.5)
  check('上海 2011 年 0.5 → 明文保底 1.0', rSH11.avgIndex, 1.0)
  // 上海 2020 年（2014 起无明文 ⇒ 实际比值）
  const rSH20 = calc('shanghai', 2020, 0.5)
  check('上海 2020 年 0.5 → 无明文，不保底', rSH20.avgIndex, 0.5)
  // 重庆 1995 年（明文上限 2）
  const rCQ95 = calc('chongqing', 1995, 2.5)
  check('重庆 1995 年 2.5 → 明文上限 2.0', rCQ95.avgIndex, 2.0)
  const rCQ20 = calc('chongqing', 2020, 2.5)
  check('重庆 2020 年 2.5 → 上限 3.0，不夹取', rCQ20.avgIndex, 2.5)
}

console.log('\n[5] 广西建账前 <1 按 1（省级明文）')
{
  const rule = C.PROVINCE_RULES.guangxi
  const startYear = parseInt(String(rule.accountStart).slice(0, 4), 10)
  const y = Math.max(startYear - 1, parseInt(Object.keys(DATA.guangxi.avg_salary_history).map(Number).sort((a, b) => a - b)[0], 10))
  const r = calc('guangxi', y, 0.5)
  check(`广西 ${y} 年（建账 ${rule.accountStart} 前）0.5 → 按 1`, r.avgIndex, 1.0)
}

console.log('\n' + '='.repeat(66))
console.log(`结果：通过 ${pass}，失败 ${fail}`)
if (fail) {
  console.log('\n失败明细：')
  errs.forEach(e => console.log('  - ' + e))
  process.exitCode = 1
} else {
  console.log('✅ 线上 calcIndex v2.3.0 行为全部正确')
}
