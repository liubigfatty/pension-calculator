// 停缴职工期间：钱放哪儿最划算？缴居民 vs 存银行
// 读者：1978-09 生 / 长春 / 灵活就业 60 档 / 2007-04 起缴 / 2026-09 停（19.5 年）
const path = require('path')
const { calculate, getBase, getAccRate } = require(path.resolve('./engine/pension-engine.js'))
const m = require(path.resolve('./cloudfunctions/calculate/provinces/jilin.js'))
const config = m.getEngineConfig ? m.getEngineConfig() : m
const R2 = x => Math.round(x * 100) / 100
const R0 = x => Math.round(x)

const RES_R = 0.0361     // 吉林城乡居民记账利率 2025 = 3.61%
const RES_SUB = 170      // 2000 元以上档次政府补贴（封顶）
const BANK_R = [0.015, 0.020]   // 银行定期假设：1.5% / 2.0%

const CASES = [
  { tag: '女', retY: 2035, months: 156.5, stopTotal: 1999.35 },
  { tag: '男', retY: 2041, months: 117, stopTotal: 2482.09 },
]

// 期初缴费、年末计息：bal = (bal + pmt) * (1+r)
function fvBegin(pmt, r, n) {
  let bal = 0
  for (let i = 0; i < n; i++) bal = (bal + pmt) * (1 + r)
  return bal
}

console.log('=== 停缴期间（2027 起）每年 5,000 元，放居民养老 vs 存银行 ===\n')

for (const C of CASES) {
  const n = C.retY - 2027 + 1
  console.log(`---------- ${C.tag}（法定 ${C.retY} 退，计发月数 ${C.months}，缓缴 ${n} 年）----------`)
  const cost = 5000 * n

  // A 缴居民 → 退休时并入职工个人账户
  const fvRes = fvBegin(5000 + RES_SUB, RES_R, n)
  const mRes = fvRes / C.months
  console.log(`A 缴居民 5000 档（补贴 ${RES_SUB}/年，利率 ${(RES_R * 100).toFixed(2)}%）`)
  console.log(`   投入 ${R0(cost)} → 账户终值 ${R0(fvRes)} → 并入职工后月增 ${R2(mRes)} 元/月（÷${C.months}），终身`)
  console.log(`   每万元产出: ${R2(mRes / (cost / 10000))} 元/月`)

  // B 存银行（按期初存入、年末计息）
  for (const r of BANK_R) {
    const fvBank = fvBegin(5000, r, n)
    console.log(`B 存银行（年化 ${(r * 100).toFixed(1)}%）`)
    console.log(`   投入 ${R0(cost)} → ${C.retY} 年本息 ${R0(fvBank)}`)
    for (const endAge of [80, 85]) {
      const months = (endAge - (C.retY - 1978)) * 12 - 9 // 粗略：退休次月起算
      const mBank = fvBank / months
      console.log(`     若领到 ${endAge} 岁（${months} 个月）：每月可摊 ${R2(mBank)} 元，取完为止`)
      console.log(`     ⇒ 居民是银行的 ${R2(mRes / mBank)} 倍`)
    }
  }

  // C 继续缴职工（对照，每万元产出）
  console.log(`C 继续缴职工 60 档：每万元产出 ${C.tag === '女' ? 101.66 : 115.76} 元/月（门槛：一年约 ${R0(getBase('prov', 2026, config) * 0.6 * 0.2 * 12)} 元）`)
  console.log()
}

console.log('=== 为什么缴居民比存银行划算（女，9 年，5,000/年）===')
const fvR = fvBegin(5170, RES_R, 9)
const fvB = fvBegin(5000, 0.015, 9)
console.log(`  ① 政府补贴白给：170 × 9 = 1,530 元（相当于本金的 ${R2(1530 / 45000 * 100)}%）`)
console.log(`  ② 利率高：3.61% vs 1.5% ⇒ 终值 ${R0(fvR)} vs ${R0(fvB)}，多 ${R0(fvR - fvB)} 元`)
console.log(`  ③ 终身领取：银行取完就没了，居民转职工后按月领一辈子，且随职工养老金年度调整`)
console.log(`  ④ 可继承：居民个人账户余额可依法继承（未领完的部分）`)

console.log('\n=== 各档次对照（女，缴到 2035，共 9 年）===')
console.log('年缴 | 补贴 | 投入   | 账户终值 | 月增    | 每万元产出')
for (const [tier, sub] of [[1000, 120], [2000, 170], [3000, 170], [5000, 170]]) {
  const fv = fvBegin(tier + sub, RES_R, 9)
  const mm = fv / 156.5
  const c = tier * 9
  console.log(`${String(tier).padStart(4)} | ${String(sub).padStart(4)} | ${String(R0(c)).padStart(6)} | ${String(R0(fv)).padStart(8)} | ${String(R2(mm)).padStart(7)} | ${R2(mm / (c / 10000))}`)
}
