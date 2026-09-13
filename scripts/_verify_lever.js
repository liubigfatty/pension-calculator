/**
 * 验算：吉林「年限 vs 档位」两个杠杆的效率对比
 * 对应文档：公众号内容库/09-测算案例与规划/_结论-吉林提档该怎么下判断（2026-09-13）.md
 *
 * 口径：男职工 1965-09 生 · 2025-12 退休（60岁3个月）· 长春 ·
 *       全实缴无视同 · 灵活就业 20% · 2025 年已公布基数（不外推）
 *
 * 运行：node scripts/_verify_lever.js
 */
const path = require('path')
const ROOT = path.join(__dirname, '..')
const e = require(path.join(ROOT, 'engine/pension-engine.js'))
const prov = require(path.join(ROOT, 'cloudfunctions/calculate/provinces-data.js'))
const cfg = prov.getConfig('jilin')
const h = cfg.avg_salary_history

let pass = 0, fail = 0
function ok(label, actual, expect, tol = 0.01) {
  const d = Math.abs(actual - expect)
  const good = d <= tol
  good ? pass++ : fail++
  console.log((good ? '✅ ' : '❌ ') + label + '  实际=' + (typeof actual === 'number' ? actual.toFixed(2) : actual) +
    '  期望=' + expect + (good ? '' : '  差=' + d.toFixed(4)))
}
function sec(t) { console.log('\n【' + t + '】') }

// 参工月份 → 全实缴年限（均晚于吉林建账 1995-07，视同为 0）
const STARTS = [
  { st: '2010-12', yrs: 15.00 },
  { st: '2005-12', yrs: 20.00 },
  { st: '2000-12', yrs: 25.00 },
  { st: '1995-07', yrs: 30.42 }
]
const BASE = { gender: 'male', genderType: 'male', birthYear: 1965, birthMonth: 9,
  cityType: 'cc', retireDateInput: { year: 2025, month: 12 } }

function principal(idx, sy, sm) {
  let t = h[String(sy)] * idx * 0.08 * (12 - sm + 1)
  for (let y = sy + 1; y <= 2024; y++) t += h[String(y)] * idx * 0.08 * 12
  return t + h['2024'] * idx * 0.08 * 11
}

const R = []
for (const s of STARTS) {
  const [sy, sm] = s.st.split('-').map(Number)
  for (const t of [100, 300]) {
    const L = e.calculate(cfg, { ...BASE, workYear: sy, workMonth: sm, avgIndex: t / 100 }).legal
    const p = principal(t / 100, sy, sm)
    R.push({ yrs: s.yrs, t, total: L.total, basic: L.basicPension.amount,
      per: L.personalAccount.amount, ex: L.extraPension.amount || 0,
      sight: L.sightYears, p, fee: p * 2.5 })
  }
}
const g = (y, t) => R.find(r => Math.abs(r.yrs - y) < 0.01 && r.t === t)

sec('0. 口径前提：全实缴、无视同')
for (const y of [15, 20, 25, 30.42]) {
  ok('  ' + y + '年 视同年限=0', g(y, 100).sight, 0, 0)
}

sec('1. 八组月领（引擎直出）')
ok('  15年 100档 月领', g(15, 100).total, 1890.02)
ok('  15年 300档 月领', g(15, 300).total, 4473.33)
ok('  20年 100档 月领', g(20, 100).total, 2415.06)
ok('  20年 300档 月领', g(20, 300).total, 5649.52)
ok('  25年 100档 月领', g(25, 100).total, 2934.95)
ok('  25年 300档 月领', g(25, 300).total, 6750.45)
ok('  30.42年 100档 月领', g(30.42, 100).total, 3481.58)
ok('  30.42年 300档 月领', g(30.42, 300).total, 7878.40)

sec('2. 构成对账：基础+个人账户+增发 = 合计')
for (const y of [15, 20, 25, 30.42]) for (const t of [100, 300]) {
  const r = g(y, t)
  ok('  ' + y + '年 ' + t + '档', r.basic + r.per + r.ex, r.total, 0.02)
}

sec('3. 长缴增发：20 年及以内不触发，25/30.42 年触发')
ok('  15年 增发=0', g(15, 100).ex, 0, 0)
ok('  20年 增发=0', g(20, 100).ex, 0, 0)
ok('  25年 100档 增发', g(25, 100).ex, 57.38)
ok('  30.42年 100档 增发', g(30.42, 100).ex, 133.88)

sec('4. 总缴费（灵活就业 20% = 本金 × 2.5）')
ok('  15年 100档', g(15, 100).fee, 191791, 1)
ok('  15年 300档', g(15, 300).fee, 575373, 1)
ok('  30.42年 100档', g(30.42, 100).fee, 232856, 1)
ok('  30.42年 300档', g(30.42, 300).fee, 698569, 1)

sec('5. 时间杠杆根源：社平涨幅')
ok('  1995 年吉林月社平', h['1995'], 369.17)
ok('  2024 年吉林月社平', h['2024'], 7322)
ok('  30 年涨幅（倍）', h['2024'] / h['1995'], 19.83, 0.01)
ok('  1995 年 100 档一年个人缴费', h['1995'] * 0.08 * 12, 354.4, 0.5)
ok('  2024 年 100 档一年个人缴费', h['2024'] * 0.08 * 12, 7029.12, 0.5)

sec('6. 投入产出放大倍数（结论 1 的核心）')
ok('  延年限 15→30.42（100档）钱倍数', g(30.42, 100).fee / g(15, 100).fee, 1.214, 0.001)
ok('  延年限 15→30.42（100档）月领倍数', g(30.42, 100).total / g(15, 100).total, 1.842, 0.001)
ok('  提档 15年 100→300 钱倍数', g(15, 300).fee / g(15, 100).fee, 3.0, 0.001)
ok('  提档 15年 100→300 月领倍数', g(15, 300).total / g(15, 100).total, 2.367, 0.001)

sec('7. 每万元边际效率（结论 2 的核心）')
const eff = (c, d) => d / c * 10000
ok('  延年限 15→30.42（100档）元/月每万元',
  eff(g(30.42, 100).fee - g(15, 100).fee, g(30.42, 100).total - g(15, 100).total), 387.57, 0.1)
ok('  提档 100→300（15年）元/月每万元',
  eff(g(15, 300).fee - g(15, 100).fee, g(15, 300).total - g(15, 100).total), 67.35, 0.1)
ok('  两者倍数', eff(g(30.42, 100).fee - g(15, 100).fee, g(30.42, 100).total - g(15, 100).total) /
  eff(g(15, 300).fee - g(15, 100).fee, g(15, 300).total - g(15, 100).total), 5.75, 0.02)

sec('8. 性价比（月领÷总缴费）：随年限升、随档位降')
ok('  15年 100档', g(15, 100).total / g(15, 100).fee * 100, 0.985, 0.001)
ok('  30.42年 100档', g(30.42, 100).total / g(30.42, 100).fee * 100, 1.495, 0.001)
ok('  15年 300档', g(15, 300).total / g(15, 300).fee * 100, 0.777, 0.001)
ok('  性价比：年限更长 > 年限更短', (g(30.42, 100).total / g(30.42, 100).fee) > (g(15, 100).total / g(15, 100).fee) ? 1 : 0, 1, 0)
ok('  性价比：档位更高 < 档位更低', (g(15, 300).total / g(15, 300).fee) < (g(15, 100).total / g(15, 100).fee) ? 1 : 0, 1, 0)

sec('9. 绝对回本年数：年限越久越快，档位越高越慢')
ok('  15年 100档', g(15, 100).fee / g(15, 100).total / 12, 8.46, 0.01)
ok('  30.42年 100档', g(30.42, 100).fee / g(30.42, 100).total / 12, 5.57, 0.01)
ok('  15年 300档', g(15, 300).fee / g(15, 300).total / 12, 10.72, 0.01)
ok('  30.42年 300档', g(30.42, 300).fee / g(30.42, 300).total / 12, 7.39, 0.01)

sec('10. 提档的边际回本（相对同年限 100 档多花的部分）')
ok('  15年', (g(15, 300).fee - g(15, 100).fee) / (g(15, 300).total - g(15, 100).total) / 12, 12.37, 0.01)
ok('  25年', (g(25, 300).fee - g(25, 100).fee) / (g(25, 300).total - g(25, 100).total) / 12, 9.87, 0.01)
ok('  30.42年', (g(30.42, 300).fee - g(30.42, 100).fee) / (g(30.42, 300).total - g(30.42, 100).total) / 12, 8.83, 0.01)
ok('  临界年龄 15年提档', 60.25 + 12.37, 72.62, 0.02)
ok('  低于预期寿命 76.71 岁', 72.62 < 76.71 ? 1 : 0, 1, 0)

sec('11. 极端对照：缴 15 年 300 档 vs 缴 30.42 年 100 档')
const dFee = g(15, 300).fee - g(30.42, 100).fee
const dTot = g(15, 300).total - g(30.42, 100).total
ok('  多花的钱', dFee, 342517, 2)
ok('  月领只多', dTot, 991.75, 0.02)
ok('  每万元只换到', eff(dFee, dTot), 28.96, 0.05)

sec('12. 活到 76.71 岁的净收益（领 16.46 年）')
const LY = 76.71 - 60.25
ok('  15年提档 净收益', (g(15, 300).total - g(15, 100).total) * 12 * LY - (g(15, 300).fee - g(15, 100).fee), 126673, 5)
ok('  30.42年提档 净收益', (g(30.42, 300).total - g(30.42, 100).total) * 12 * LY - (g(30.42, 300).fee - g(30.42, 100).fee), 402747, 5)

sec('13. 企业职工口径（个人只出 8%）')
ok('  15年提档 边际回本', (g(15, 300).p - g(15, 100).p) / (g(15, 300).total - g(15, 100).total) / 12, 4.95, 0.01)
ok('  30.42年提档 边际回本', (g(30.42, 300).p - g(30.42, 100).p) / (g(30.42, 300).total - g(30.42, 100).total) / 12, 3.53, 0.01)

console.log('\n' + '='.repeat(46))
console.log('验算结果：✅ ' + pass + ' 通过   ❌ ' + fail + ' 失败')
console.log('='.repeat(46))
process.exit(fail ? 1 : 0)
