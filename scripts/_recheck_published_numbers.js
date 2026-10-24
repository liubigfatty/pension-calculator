// 复核已发表文章里的存疑数字：
//  D4 048篇「60档34年 vs 100档20年，少花11.3万」
//  D5 P2「年限↑ ⇒ 基础养老金占比↓」在吉林是否成立（长缴增发可能逆转）
//  D9 T10-5「银行约40元/万元」的算法口径
const path = require('path')
const { calculate } = require(path.resolve('./engine/pension-engine.js'))
const jl = require(path.resolve('./cloudfunctions/calculate/provinces/jilin.js'))
const config = jl.getEngineConfig ? jl.getEngineConfig() : jl

const R0 = x => Math.round(x)
const R2 = x => Math.round(x * 100) / 100

// ---------- 成本模型 ----------
// 灵活就业：缴费基数 = 当年社平 × 档位；费率 20% 全自付
function cost(gear, startYear, endYear, rate) {
  const s = config.avg_salary_history
  let base = 0
  for (let y = startYear; y <= endYear; y++) {
    const v = s[y]
    if (v === undefined) { console.log('  ⚠️ 社平缺年', y); continue }
    base += v * gear * 12
  }
  return { base: base, pay: base * rate }
}

function monthly(gear, workYear, retireYear, gender) {
  const years = retireYear - workYear
  const birthYear = retireYear - (gender === 'female' ? 55 : 60)
  const r = calculate(config, {
    province: 'jilin', cityType: 'prov',
    birthYear: birthYear, birthMonth: 1,
    workYear: workYear, workMonth: 1,
    avgIndex: gear,
    retireDateInput: { year: retireYear, month: 1 },
    gender: gender,
  })
  const total = r.legal && r.legal.total || 0
  const basic = (r.legal && r.legal.basicPension && r.legal.basicPension.amount) || 0
  const pers = (r.legal && r.legal.personalAccount && r.legal.personalAccount.amount) || 0
  return { total, basic, pers, years, r }
}

console.log('='.repeat(78))
console.log('【D4】048篇：60%档缴34年  vs  100%档缴20年 —— 「少花11.3万」是否成立')
console.log('='.repeat(78))
const RET = 2026
const A = { gear: 0.6, ys: 34, sy: RET - 34 }
const B = { gear: 1.0, ys: 20, sy: RET - 20 }
for (const [tag, o] of [['A 60%档34年', A], ['B 100%档20年', B]]) {
  const c20 = cost(o.gear, o.sy, RET - 1, 0.20)   // 灵活就业 20%
  const c8 = cost(o.gear, o.sy, RET - 1, 0.08)    // 单位职工个人 8%
  console.log(`\n${tag}（${o.sy}—${RET - 1}）`)
  console.log(`  缴费基数总额 ${R0(c20.base).toLocaleString()} ；实掏@20% ${R0(c20.pay).toLocaleString()} ；@8% ${R0(c8.pay).toLocaleString()}`)
  o.cost = c20
}
console.log('\n--- 差额 ---')
console.log(`  基数总额差：A - B = ${R0(A.cost.base - B.cost.base).toLocaleString()}`)
console.log(`  实掏差@20%：A - B = ${R0(A.cost.pay - B.cost.pay).toLocaleString()}`)
console.log(`  ⇒ 文章写的「少花 11.3 万」：${Math.abs(A.cost.pay - B.cost.pay) > 100000 ? '✅ 量级对得上' : '❌ 对不上（差了一个数量级）'}`)

console.log('\n--- 月领（引擎实算，男 2026 退）---')
const mA = monthly(0.6, A.sy, RET, 'male')
const mB = monthly(1.0, B.sy, RET, 'male')
console.log(`  A 60%档34年：月领 ${R2(mA.total)}（基础 ${R2(mA.basic)} + 个账 ${R2(mA.pers)}）`)
console.log(`  B 100%档20年：月领 ${R2(mB.total)}（基础 ${R2(mB.basic)} + 个账 ${R2(mB.pers)}）`)
console.log(`  文章写 4,455 vs 3,018 → 引擎 ${R2(mA.total)} vs ${R2(mB.total)}`)

console.log('\n' + '='.repeat(78))
console.log('【D5】P2「年限↑ ⇒ 基础养老金占比↓」—— 吉林是否成立')
console.log('='.repeat(78))
console.log('  年限'.padEnd(8) + '月领'.padStart(10) + '基础'.padStart(10) + '个账'.padStart(10) + '基础占比'.padStart(10))
for (const ys of [15, 20, 25, 30, 34, 38, 42]) {
  const sy = RET - ys
  if (sy < 1990) continue
  const m = monthly(1.0, sy, RET, 'male')
  const share = m.total ? (m.basic / m.total * 100) : 0
  console.log(`  ${String(ys).padEnd(6)}${R2(m.total).toFixed(2).padStart(10)}${R2(m.basic).toFixed(2).padStart(10)}${R2(m.pers).toFixed(2).padStart(10)}${R2(share).toFixed(1).padStart(8)}%`)
}
console.log('  ⇒ 若基础占比随年限上升 ⇒ P2 在吉林确实被逆转（长缴增发叠加所致），伪规律判定需加「吉林反常」')

console.log('\n' + '='.repeat(78))
console.log('【D9】T10-5「银行约 40 元/万元」的算法口径')
console.log('='.repeat(78))
// 居民养老对照：79.22 元/万元（此前实算）。银行口径需明确：
//  口径1：本金+利息按退休后余命摊完（本金也发回）
//  口径2：只摊利息（本金保留）
const YEARS = 9          // 缴费到退休
const LIFE = 20          // 退休后摊 20 年（到 80 岁）
const rate = 0.026       // 记账/存款利率参考
let fv = 0, pv = 10000
for (let i = 0; i < YEARS; i++) fv = (fv + pv) * (1 + rate)   // 每年存1万，复利
console.log(`  每年存 1 万、存 ${YEARS} 年 @${(rate * 100).toFixed(2)}% ⇒ 退休时本利和 ${R0(fv).toLocaleString()}`)
console.log(`  口径1 本利全摊（${LIFE}年）：${R2(fv / (LIFE * 12))} 元/月 ⇒ 每万元 ${R2(fv / (LIFE * 12) / YEARS)} 元/月·万元`)
const fv2 = fv - pv * YEARS
console.log(`  口径2 只摊利息：${R2(fv2 / (LIFE * 12) / YEARS)} 元/月·万元`)
console.log(`  ⇒ 「40」更接近口径${Math.abs(fv / (LIFE * 12) / YEARS - 40) < Math.abs(fv2 / (LIFE * 12) / YEARS - 40) ? '1（本利全摊）' : '2（只摊利息）'}`)
