// 正文数字全量验算（真实口径 · 精确年限版）
const m = require('C:/Users/14041/WorkBuddy/2026-07-16-10-20-33/养老金计算平台/reports/matrix-jilin-start22-2026-09-12/matrix.json')
const t = require('C:/Users/14041/WorkBuddy/2026-07-16-10-20-33/养老金计算平台/reports/threshold-jilin-5000-2026-09-12/threshold.json')

const get = (age, tier) => m.rows.find(r => r.age === age && r.tier === tier)
const f = (n) => Number(n).toFixed(2)
const ok = (label, got, want, tol = 0.01) => {
  const pass = Math.abs(got - want) <= tol
  console.log((pass ? '  ✅ ' : '  ❌ ') + label + ' = ' + got + (pass ? '' : '  期望 ' + want))
}

console.log('【一、正文引用的档位金额】')
for (const age of [50, 55, 60]) {
  const r1 = get(age, 100), r3 = get(age, 300)
  console.log(`  ${age}岁 100档 = ${f(r1.total)}  300档 = ${f(r3.total)}  年限 ${r1.totalYears}(实缴${r1.actualYears}+视同${r1.sightYears})  月数 ${r1.months}`)
}

console.log('\n【二、60岁100档构成（正文第一节）】')
const a6 = get(60, 100)
console.log(`  基础 ${f(a6.basic)} + 过渡 ${f(a6.transitional)} + 个账 ${f(a6.personal)} + 增发 ${f(a6.extra)} = ${f(a6.basic + a6.transitional + a6.personal + a6.extra)}`)
ok('  合计对账', +(a6.basic + a6.transitional + a6.personal + a6.extra).toFixed(2), a6.total)
ok('  正文写"5,074.62"', a6.total, 5074.62)
ok('  正文写"超 74.62"', +(a6.total - 5000).toFixed(2), 74.62)
ok('  正文写"过渡性 820.06"', a6.transitional, 820.06)
ok('  正文写"增发 294.85"', a6.extra, 294.85)

console.log('\n【三、门槛表（正文第三节）】')
const EXPECT = { 50: { tier: 211, pay: 15449, total: 5004.27 }, 55: { tier: 145, pay: 10617, total: 5005.21 }, 60: { tier: 98, pay: 7176, total: 5006.86 } }
for (const r of t.results) {
  const n = r.nearestResult, e = EXPECT[r.age]
  console.log(`  ${r.age}岁: 精确 ${r.exact} 档 → ${n.tier} 档 = ${n.total} (缴基 ${n.payBase}, ${n.totalYears}年)`)
  ok('    档位', n.tier, e.tier)
  ok('    缴基', n.payBase, e.pay)
  ok('    金额', n.total, e.total)
  ok('    超出', +(n.total - 5000).toFixed(2), +(e.total - 5000).toFixed(2))
}

console.log('\n【四、比例与倍数（正文引用）】')
const a0 = get(50, 100), a5 = get(55, 100)
ok('  50→60岁 100档涨幅', +(a6.total / a0.total - 1).toFixed(4), 0.6926, 0.001)
ok('  50岁比60岁少', +(1 - a0.total / a6.total).toFixed(4), 0.4091, 0.001)
ok('  55岁比60岁少', +(1 - a5.total / a6.total).toFixed(4), 0.2319, 0.001)
ok('  300/100 倍数(60岁)', +(get(60, 300).total / a6.total).toFixed(3), 2.335, 0.001)
ok('  计发月数 195/139-1', +(195 / 139 - 1).toFixed(4), 0.403, 0.001)
ok('  门槛缴基倍数 15449/7176', +(15449 / 7176).toFixed(3), 2.153, 0.001)

console.log('\n【五、基础养老金公式反验（吉林双基数）】')
const PRECISE = { 50: 28 + 5 / 12, 55: 33 + 5 / 12, 60: 38 + 5 / 12 }
for (const age of [50, 55, 60]) {
  const calc = ((7978.25 + 7322) / 2) * PRECISE[age] * 0.01
  const actual = get(age, 100).basic
  ok(`  ${age}岁基础 (7978.25+7322)/2×${PRECISE[age].toFixed(4)}×1%`, +calc.toFixed(2), actual, 0.5)
}

console.log('\n【六、缴费基数换算】')
ok('  60档', +(7322 * 0.6).toFixed(0), 4393, 1)
ok('  100档', 7322, 7322)
ok('  300档', 7322 * 3, 21966)
ok('  98档', +(7322 * 0.98).toFixed(0), 7176, 1)
ok('  145档', +(7322 * 1.45).toFixed(0), 10617, 1)
ok('  211档', +(7322 * 2.11).toFixed(0), 15449, 1)

console.log('\n【七、出生年月与延迟退休（正文口径表 · 依据国办发〔2025〕5号）】')
const { solveBirth } = require('C:/Users/14041/WorkBuddy/2026-07-16-10-20-33/养老金计算平台/scripts/cohort.js')
const EXPECT_COHORT = {
  50: { type: 'fw',   label: '女工人', birth: '1975-08', delay: 4, realAge: '50岁4个月', work: '1997-07' },
  55: { type: 'fc',   label: '女干部', birth: '1970-09', delay: 3, realAge: '55岁3个月', work: '1992-07' },
  60: { type: 'male', label: '男职工', birth: '1965-09', delay: 3, realAge: '60岁3个月', work: '1987-07' },
}
const eq = (label, got, want) => console.log((got === want ? '  ✅ ' : '  ❌ ') + label + ' = ' + got + (got === want ? '' : '  期望 ' + want))
for (const age of [50, 55, 60]) {
  const row = m.rows.find(x => x.age === age)
  const e = EXPECT_COHORT[age]
  // 1) 矩阵记录 vs 正文期望
  eq(`  ${age}岁 出生`, row.birth, e.birth)
  eq(`  ${age}岁 参加工作`, row.work, e.work)
  eq(`  ${age}岁 实际退休年龄`, row.realAgeStr, e.realAge)
  ok(`  ${age}岁 延迟月数`, row.delayMonths, e.delay, 0)
  // 2) 用 cohort 模块独立反推，验证「按政策反推」可复现
  const b = solveBirth(e.type, 2025, 12)
  eq(`  ${age}岁 独立反推出生`, b.birthYear + '-' + String(b.birthMonth).padStart(2, '0'), e.birth)
  ok(`  ${age}岁 独立反推延迟`, b.delay, e.delay, 0)
  // 3) 出生 + 法定年龄 + 延迟 必须落回 2025-12
  const tm = b.baseAge * 12 + b.delay
  const ry = b.birthYear + Math.floor((b.birthMonth - 1 + tm) / 12)
  const rm = ((b.birthMonth - 1 + tm) % 12) + 1
  eq(`  ${age}岁 退休年月回推`, ry + '-' + rm, '2025-12')
}
