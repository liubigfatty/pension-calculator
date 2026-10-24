// 复核《长春48岁灵活就业交不动了》第六节「弹性提前」的追平年龄
// 问题：延迟退休的回收月数含「多缴的保费」，提前退休却没含「少缴的保费」⇒ 双口径陷阱
// MEMORY 五公式：t = (A×N + C) ÷ X ；追平年龄 = 提前退时年龄 + (N + t)/12
const path = require('path')
const { calculate } = require(path.resolve('./engine/pension-engine.js'))
const jl = require(path.resolve('./cloudfunctions/calculate/provinces/jilin.js'))
const config = jl.getEngineConfig ? jl.getEngineConfig() : jl
const R0 = x => Math.round(x)
const R2 = x => Math.round(x * 100) / 100

function monthly(gender, retireY, retireM, stopWork) {
  // stopWork: 提前退休者从退休当月停止缴费 ⇒ 缴费年限算到提前时点
  const birth = gender === 'female' ? { y: 1978, m: 9 } : { y: 1978, m: 9 }
  const r = calculate(config, {
    province: 'jilin', cityType: 'cc',
    birthYear: birth.y, birthMonth: birth.m,
    workYear: 2007, workMonth: 4,
    avgIndex: 0.6,
    retireDateInput: { year: retireY, month: retireM },
    gender: gender,
  })
  return r.legal.total
}

// 保费（60档）：缴费基数用全省社平 getBase('prov')，灵活就业 20% 全自付
// ⚠️ 外推必须用引擎自己的 getBase，不能自己假设增长率（上一版用 4% ⇒ 高估 C 两成）
const { getBase } = require(path.resolve('./engine/pension-engine.js'))
function premium(year) {
  const v = getBase('prov', year, config)   // getBase 直接返回数字
  if (typeof v !== 'number' || !isFinite(v)) throw new Error('无基数: ' + year)
  return v * 0.6 * 0.20 * 12
}
// 某年某月起连续 n 个月的保费
function premiumMonths(startY, startM, n) {
  let total = 0, y = startY, m = startM
  for (let i = 0; i < n; i++) {
    total += premium(y) / 12
    m++
    if (m > 12) { m = 1; y++ }
  }
  return total
}

const CASES = [
  { tag: '女', gender: 'female', legalY: 2035, legalM: 12, earlyY: 2033, earlyM: 9, ageAtEarly: 55 },
  { tag: '男', gender: 'male', legalY: 2041, legalM: 9, earlyY: 2038, earlyM: 9, ageAtEarly: 60 },
]

console.log('='.repeat(84))
console.log('弹性提前退休 · 追平年龄（两种口径对照）')
console.log('='.repeat(84))
for (const c of CASES) {
  const legal = monthly(c.gender, c.legalY, c.legalM)
  const early = monthly(c.gender, c.earlyY, c.earlyM)
  const X = legal - early                       // 之后每月少拿
  const N = (c.legalY - c.earlyY) * 12 + (c.legalM - c.earlyM)   // 提前月数
  const A = early                                // 提前期月领
  const C = premiumMonths(c.earlyY, c.earlyM, N) // 提前期少缴的保费
  const t_with = (A * N + C) / X
  const t_without = (A * N) / X
  console.log(`\n【${c.tag}】法定 ${c.legalY}-${String(c.legalM).padStart(2,'0')} 月领 ${R2(legal)} ；最早提前 ${c.earlyY}-${String(c.earlyM).padStart(2,'0')} 月领 ${R2(early)}`)
  console.log(`  提前 N = ${N} 个月 ；提前期白拿 A×N = ${R0(A * N).toLocaleString()} ；之后每月少拿 X = ${R2(X)}`)
  console.log(`  提前期少缴保费 C = ${R0(C).toLocaleString()}`)
  console.log(`  ── 口径① 含 C（与延迟退休口径一致：延迟算了多缴，提前也应算少缴）`)
  console.log(`     t = ${R2(t_with)} 个月 = ${R2(t_with / 12)} 年 ⇒ 追平年龄 ${R2(c.ageAtEarly + (N + t_with) / 12)} 岁`)
  console.log(`  ── 口径② 不含 C（假设本就不打算再缴）`)
  console.log(`     t = ${R2(t_without)} 个月 = ${R2(t_without / 12)} 年 ⇒ 追平年龄 ${R2(c.ageAtEarly + (N + t_without) / 12)} 岁`)
  console.log(`  ⚠️ 两口径相差 ${R2((t_with - t_without) / 12)} 年`)
}

console.log('\n' + '='.repeat(84))
console.log('对照：延迟退休的回收月数是否已含「多缴保费」（是 ⇒ 提前也必须含 C 才口径一致）')
console.log('='.repeat(84))
for (const c of CASES) {
  const legal = monthly(c.gender, c.legalY, c.legalM)
  const late = monthly(c.gender, c.legalY + 1, c.legalM)
  const X2 = late - legal
  const lost = legal * 12
  const c1 = premiumMonths(c.legalY, c.legalM, 12)
  console.log(`【${c.tag}】+1年：月领 ${R2(late)}，月增 ${R2(X2)}；少领12个月 ${R0(lost).toLocaleString()}；多缴1年保费 ${R0(c1).toLocaleString()}`)
  console.log(`  回收月数 = (少领 + 多缴) ÷ 月增 = ${R2((lost + c1) / X2)} 个月  ← 已含多缴保费`)
}
