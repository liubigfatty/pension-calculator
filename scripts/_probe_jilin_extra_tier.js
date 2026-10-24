/**
 * 吉林长缴增发（吉政办明电〔2015〕11号）门槛效应探针
 * 问题：108.68 怎么来的？为什么"少半年"就归零？
 * 答案要点：
 *   1. 触发 = 实际缴费年限 > 20（严格大于），用 actualYears
 *   2. 分段 = 累计缴费年限（含视同），21-25段0.15% / 26-30段0.20% / 31年+0.25%
 *   3. 金额 = Σ(段年数 × 段系数) × avgBase（计发基数均值）
 * 关键：是"门槛式"不是"线性式"，且触发(20年) ≠ 有钱(21年)
 */
const path = require('path')
const { calculate, getAccRate } = require(path.resolve('./engine/pension-engine.js'))
const jlMod = require(path.resolve('./cloudfunctions/calculate/provinces/jilin.js'))
const config = jlMod.getEngineConfig ? jlMod.getEngineConfig() : jlMod

const R2 = x => Math.round(x * 100) / 100

// 女：1978-09 生，2007-04 起缴，长春，60 档，2035-12 退（计发月数 156.5）
const base = {
  province: 'jilin', cityType: 'cc',
  birthYear: 1978, birthMonth: 9,
  workYear: 2007, workMonth: 4,
  avgIndex: 0.6,
  retireDateInput: { year: 2035, month: 12 },
  gender: 'female',
}

// 停缴场景必须同步个人账户余额：先算「缴到目标年限那个月」的余额，再用引擎利率滚到退休
function roll(bal, y0, m0, y1) {
  let b = bal
  for (let y = y0 + 1; y <= y1; y++) b *= (1 + getAccRate(y, config))
  return b
}
function accAtYears(years) {
  // 2007-04 起缴，缴满 years 年 ⇒ 停缴月份
  const totalMonths = Math.round(years * 12)
  const stopY = 2007 + Math.floor((totalMonths - 1) / 12)
  const stopM = ((4 - 1 + totalMonths - 1) % 12) + 1
  const rr = calculate(config, { ...base, retireDateInput: { year: stopY, month: stopM } })
  const bal = rr.legal.personalAccount.balance
  return roll(bal, stopY, stopM, 2035)
}

function probe(label, years) {
  const inp = years == null
    ? { ...base }
    : { ...base, totalYears: years, actualYears: years, personalAcc: accAtYears(years) }
  const r = calculate(config, inp)
  const L = r.legal
  const ex = L.extraPension || {}
  const bd = ex.bracketDetails || []
  console.log(`\n【${label}】`)
  console.log(`  缴费年限(引擎) = ${R2(L.totalYears)} 年`)
  console.log(`  基础养老金     = ${R2(L.basicPension.amount)}`)
  console.log(`  长缴增发       = ${R2(ex.amount || 0)}   ← 描述: ${ex.description || ''}`)
  bd.forEach(b => {
    console.log(`    段 ${b.range}: ${R2(b.years)} 年 × ${(b.rate * 100).toFixed(2)}% = 系数 ${b.contribution.toFixed(5)} → ${b.amount} 元`)
  })
  const coef = bd.reduce((s, b) => s + b.contribution, 0)
  if (coef > 0) {
    console.log(`  反推 avgBase = ${R2((ex.amount || 0) / coef)}（总系数 ${coef.toFixed(5)}）`)
  }
  console.log(`  月领合计       = ${R2(L.total)}`)
  return { years: L.totalYears, extra: ex.amount || 0, total: L.total, coef }
}

console.log('='.repeat(72))
console.log('吉林长缴增发 · 门槛效应探针（女·1978-09生·长春·60档）')
console.log('='.repeat(72))

const full = probe('① 继续缴到法定退休 2035-12', null)   // 引擎自算
const stop = probe('② 现在彻底停缴（19.5 年）', 19.5)
const y20  = probe('③ 只多缴半年 → 20 年整', 20)
const y20p = probe('④ 20 年 + 1 个月', 20 + 1 / 12)
const y21  = probe('⑤ 缴到 21 年', 21)
const y25  = probe('⑥ 缴到 25 年', 25)
const y26  = probe('⑦ 缴到 26 年', 26)

console.log('\n' + '='.repeat(72))
console.log('结论校验')
console.log('='.repeat(72))
console.log(`① 满缴增发 = ${R2(full.extra)}（对照旧稿 108.68）`)
console.log(`② 19.5 年增发 = ${R2(stop.extra)} ⇒ ${stop.extra === 0 ? '归零 ✔' : '非零 ✘'}`)
console.log(`③ 20 年整：触发但金额 = ${R2(y20.extra)} ⇒ ${y20.extra === 0 ? '★ 触发了却仍是 0 元（第一段从 21 年起）' : '有钱'}`)
console.log(`④ 20 年 1 个月：${R2(y20p.extra)}`)
console.log(`⑤ 21 年：${R2(y21.extra)}  ← 第一笔真正到手的钱`)
console.log(`⑥ 25 年：${R2(y25.extra)}`)
console.log(`⑦ 26 年：${R2(y26.extra)}  ← 跨进 0.20% 段`)
console.log(`\n差额：满缴 − 现在停 = ${R2(full.total - stop.total)} 元/月`)
console.log(`其中增发贡献 = ${R2(full.extra)} 元/月，占差额的 ${R2(full.extra / (full.total - stop.total) * 100)}%`)
