// 档位篇正文数字全量验算（吉林 · 60岁男职工 · 长春 · 2025-12退休）
const ROOT = 'C:/Users/14041/WorkBuddy/2026-07-16-10-20-33/养老金计算平台/'
const m = require(ROOT + 'reports/matrix-jilin-start22-2026-09-12/matrix.json')
const e = require(ROOT + 'engine/pension-engine.js')
const prov = require(ROOT + 'cloudfunctions/calculate/provinces-data.js')

const g = (age, tier) => m.rows.find(r => r.age === age && r.tier === tier)
const f = (n) => Number(n).toFixed(2)
let pass = 0, fail = 0
const ok = (label, got, want, tol = 0.01) => {
  const p = Math.abs(got - want) <= tol
  p ? pass++ : fail++
  console.log((p ? '  ✅ ' : '  ❌ ') + label + ' = ' + got + (p ? '' : '   期望 ' + want))
}
const eq = (label, got, want) => {
  const p = String(got) === String(want)
  p ? pass++ : fail++
  console.log((p ? '  ✅ ' : '  ❌ ') + label + ' = ' + got + (p ? '' : '   期望 ' + want))
}

console.log('【一、六档缴基与月领（正文第一节）】')
const TIERS = [
  [60, 4393, 3719.27], [80, 5858, 4396.95], [100, 7322, 5074.62],
  [150, 10983, 6768.83], [200, 14644, 8463.02], [300, 21966, 11851.40],
]
for (const [tier, pay, total] of TIERS) {
  const r = g(60, tier)
  ok(`  ${tier}档 缴基 ${pay}`, r.payBase, pay, 0)
  ok(`  ${tier}档 月领 ${total}`, r.total, total)
}

console.log('\n【二、三档构成对账（正文第一节拆分）】')
const COMP = { 60: [2376.35, 492.04, 612.47, 238.41], 100: [2938.92, 820.06, 1020.79, 294.85], 300: [5751.79, 2460.19, 3062.37, 577.05] }
for (const t of [60, 100, 300]) {
  const r = g(60, t), [b, tr, pe, ex] = COMP[t]
  ok(`  ${t}档 基础`, r.basic, b)
  ok(`  ${t}档 过渡`, r.transitional, tr)
  ok(`  ${t}档 个人`, r.personal, pe)
  ok(`  ${t}档 增发`, r.extra, ex)
  ok(`  ${t}档 四项合计=月领`, +(b + tr + pe + ex).toFixed(2), r.total)
}

console.log('\n【三、兑换率恒定 0.4628（正文第二节）】')
const TS = [60, 80, 100, 150, 200, 300]
const SLOPES = [0.4626, 0.4629, 0.4628, 0.4628, 0.4628]
for (let i = 1; i < TS.length; i++) {
  const a = g(60, TS[i - 1]), b = g(60, TS[i])
  ok(`  ${TS[i - 1]}→${TS[i]} 斜率`, +((b.total - a.total) / (b.payBase - a.payBase)).toFixed(4), SLOPES[i - 1], 0.0001)
}
const lo = g(60, 60), hi = g(60, 300)
ok('  全程 60→300 斜率 0.4628', +((hi.total - lo.total) / (hi.payBase - lo.payBase)).toFixed(4), 0.4628, 0.0001)

console.log('\n【四、制度边界 0.6 / 3.0（正文第三节）】')
ok('  60档缴基/社平 = 0.6000', +(lo.payBase / 7322).toFixed(4), 0.6, 0.0001)
ok('  300档缴基/社平 = 3.0000', +(hi.payBase / 7322).toFixed(4), 3.0, 0.0001)

console.log('\n【五、替代率与倍数（正文第四节）】')
ok('  60档 真实替代率 84.66%', +(lo.total / lo.payBase * 100).toFixed(2), 84.66)
ok('  100档 真实替代率 69.31%', +(g(60, 100).total / g(60, 100).payBase * 100).toFixed(2), 69.31)
ok('  300档 真实替代率 53.95%', +(hi.total / hi.payBase * 100).toFixed(2), 53.95)
ok('  缴基倍数 5.00', +(hi.payBase / lo.payBase).toFixed(2), 5.00)
ok('  月领倍数 3.19', +(hi.total / lo.total).toFixed(2), 3.19)
ok('  报告字段 replaceRate(300档,分母100档) 161.86%', +hi.replaceRate.toFixed(2), 161.86)

console.log('\n【六、结构占比（正文第五节）】')
for (const [t, pct, poolPct] of [[60, 16.5, 70.7], [100, 20.1, 55.4], [300, 25.8, 40.0]]) {
  const r = g(60, t)
  ok(`  ${t}档 个账占月领 ${pct}%`, +(r.personal / r.total * 100).toFixed(1), pct, 0.05)
  ok(`  ${t}档 统筹÷本人缴基 ${poolPct}%`, +((r.total - r.personal) / r.payBase * 100).toFixed(1), poolPct, 0.05)
}

console.log('\n【七、本金 / 含息（正文第六节·重跑引擎）】')
const cfg = prov.getConfig('jilin')
const h = cfg.avg_salary_history
// 个人账户自 1995-07 起：1995 年 6 个月 + 1996~2024 整年 + 2025 年 11 个月
function principal(idx, lastBase) {
  let t = h['1995'] * idx * 0.08 * 6
  for (let y = 1996; y <= 2024; y++) t += h[y] * idx * 0.08 * 12
  return t + lastBase * idx * 0.08 * 11
}
const BASE = { gender: 'male', genderType: 'male', birthYear: 1965, birthMonth: 9, workYear: 1987, workMonth: 7, cityType: 'cc', retireDateInput: { year: 2025, month: 12 } }
const A = e.calculate(cfg, { ...BASE, avgIndex: 1.0 }).legal
const B = e.calculate(cfg, { ...BASE, avgIndex: 3.0 }).legal
const p1 = principal(1.0, 7322), p3 = principal(3.0, 7322)
ok('  100档 本金 93,142', +p1.toFixed(0), 93142, 1)
ok('  300档 本金 279,427', +p3.toFixed(0), 279427, 1)
ok('  多交本金 186,285', +(p3 - p1).toFixed(0), 186285, 1)
ok('  100档 含息储存额 141,890', +A.personalAccount.balance.toFixed(0), 141890, 1)
ok('  300档 含息储存额 425,670', +B.personalAccount.balance.toFixed(0), 425670, 1)
ok('  含息差 283,780', +(B.personalAccount.balance - A.personalAccount.balance).toFixed(0), 283780, 1)
ok('  利息放大倍数 1.523', +(A.personalAccount.balance / p1).toFixed(3), 1.523, 0.001)
ok('  1995年吉林月社平 369（实际 369.17）', +h['1995'].toFixed(0), 369, 0)
ok('  1995年300档月缴基 1,107', +(h['1995'] * 3).toFixed(0), 1107, 1)

console.log('\n【八、月领差额拆解与回本（正文第六节）】')
const dTot = B.total - A.total
const dPer = B.personalAccount.amount - A.personalAccount.amount
const dPool = dTot - dPer
const dP = p3 - p1
ok('  月领多 6,776.78', +dTot.toFixed(2), 6776.78)
ok('  其中个人账户多 2,041.58', +dPer.toFixed(2), 2041.58)
ok('  其中统筹多 4,735.20', +dPool.toFixed(2), 4735.20)
ok('  两块之和=月领差', +(dPer + dPool).toFixed(2), +dTot.toFixed(2))
ok('  企业职工回本 2.29 年', +(dP / dTot / 12).toFixed(2), 2.29)
ok('  企业职工回本年龄 62.5', +(60.25 + dP / dTot / 12).toFixed(1), 62.5, 0.05)
ok('  灵活就业多掏 465,712', +(dP * 2.5).toFixed(0), 465712, 1)
ok('  灵活就业回本 5.73 年', +(dP * 2.5 / dTot / 12).toFixed(2), 5.73)
ok('  灵活就业回本年龄 66.0', +(60.25 + dP * 2.5 / dTot / 12).toFixed(1), 66.0, 0.05)
ok('  个账按本金回本 7.60 年', +(dP / dPer / 12).toFixed(2), 7.60)
const dBal = B.personalAccount.balance - A.personalAccount.balance
ok('  个账按含息回本 139 个月', +(dBal / dPer).toFixed(0), 139, 1)
ok('  139个月 = 11.58 年', +(139 / 12).toFixed(2), 11.58)
ok('  含息回本年龄 71.8', +(60.25 + 139 / 12).toFixed(1), 71.8, 0.05)
ok('  灵活就业为统筹多掏 279,427', +(dP * 1.5).toFixed(0), 279427, 1)
ok('  统筹回本 4.92 年', +(dP * 1.5 / dPool / 12).toFixed(2), 4.92)

console.log('\n【九、活到预期寿命的总账（正文第六节末）】')
const yrs = 76.71 - 60.25
ok('  领取年数 16.46', +yrs.toFixed(2), 16.46)
const gross = dTot * 12 * yrs
ok('  多领总额 1,338,550', +gross.toFixed(0), 1338550, 5)
ok('  企业职工净 +1,152,265', +(gross - dP).toFixed(0), 1152265, 5)
ok('  灵活就业净 +872,837', +(gross - dP * 2.5).toFixed(0), 872837, 5)

console.log('\n【十、缴费现金流（正文第七节）】')
ok('  300档灵活就业 4,393 元/月', +(21966 * 0.2).toFixed(0), 4393, 0.5)
ok('  300档灵活就业 52,718 元/年', +(21966 * 0.2 * 12).toFixed(0), 52718, 2)
ok('  100档灵活就业 1,464 元/月', +(7322 * 0.2).toFixed(0), 1464, 0.5)
ok('  100档灵活就业 17,573 元/年', +(7322 * 0.2 * 12).toFixed(0), 17573, 2)

console.log('\n【十一、口径自洽】')
eq('  全部档位缴费年限一致 38.42', [...new Set(m.rows.filter(r => r.age === 60).map(r => r.totalYears))].join(','), '38.42')
ok('  60岁计发月数 139', g(60, 100).months, 139, 0)

console.log(`\n===== 档位篇验算：${pass} 通过 / ${fail} 失败 =====`)
process.exit(fail ? 1 : 0)
