// 读者案例（1978-09生／长春／灵活就业60档／2007-04起缴）四原则验算
// ① 有能力继续缴  ② 4050补贴  ③ 缴居民累计个账  ④ 居民医保兜底
// 另：延迟退休的「投资回收月数」（完整口径：延迟期少领的养老金 + 多缴的保费，都算成本）
const path = require('path')
const { calculate, getAccRate, getBase } = require(path.resolve('./engine/pension-engine.js'))
const m = require(path.resolve('./cloudfunctions/calculate/provinces/jilin.js'))
const config = m.getEngineConfig ? m.getEngineConfig() : m
const R2 = x => Math.round(x * 100) / 100
const R0 = x => Math.round(x)
const amt = o => (o && typeof o === 'object') ? (o.amount || 0) : (o || 0)

const BASE = { province: 'jilin', cityType: 'cc', name: 'reader', birthYear: 1978, birthMonth: 9, workYear: 2007, workMonth: 4, avgIndex: 0.6 }
const STOP = { year: 2026, month: 9 }
const YEARS_AT_STOP = ((STOP.year - 2007) * 12 + (STOP.month - 4) + 1) / 12

function salaryOf(y) { const b = getBase('prov', y, config); return (b && typeof b === 'object') ? (b.value != null ? b.value : b.base) : b }
function premiumOf(y) { return salaryOf(y) * 0.6 * 0.2 * 12 }          // 60档，20%全自付
function roll(bal, y0, y1) { let b = bal; for (let y = y0 + 1; y <= y1; y++) b *= (1 + getAccRate(y, config)); return b }

const CASES = [
  { g: 'female', gt: 'fc', label: '女（灵活就业 55 档）', subStart: 2027, subYears: 3, medNeed: 25 },
  { g: 'male', gt: 'male', label: '男（60 档）', subStart: 2029, subYears: 3, medNeed: 30 },
]

for (const C of CASES) {
  const inp = { ...BASE, gender: C.g, genderType: C.gt, personalAcc: 0 }
  const rCont = calculate(config, inp)
  const L1 = rCont.legal
  const A = L1.total                                    // 法定退休月领

  // 停缴时点余额 → 滚到退休
  const rStopNow = calculate(config, { ...inp, retireDateInput: STOP })
  const B0 = rStopNow.legal.personalAccount.balance
  const rStop = calculate(config, { ...inp, personalAcc: roll(B0, STOP.year, L1.date.year), totalYears: YEARS_AT_STOP, actualYears: YEARS_AT_STOP })

  console.log('\n████████████ ' + C.label + ' ████████████')
  console.log(`  法定退休 ${L1.date.year}-${String(L1.date.month).padStart(2, '0')}（${L1.ageStr}），缴费 ${R2(L1.totalYears)} 年`)
  console.log(`  继续缴 → ${R2(A)} 元/月 ｜ 现在彻底停 → ${R2(rStop.legal.total)} 元/月`)

  // ── 继续缴的总成本（无补贴）
  let costAll = 0
  const byYear = {}
  for (let y = STOP.year + 1; y <= L1.date.year; y++) { const p = premiumOf(y); byYear[y] = p; costAll += p }
  const gain = A - rStop.legal.total
  console.log(`\n【原则一】继续缴到退休：再掏 ${R0(costAll).toLocaleString()} 元，月领多 ${R2(gain)}，回本 ${R2(costAll / gain)} 个月 = ${R2(costAll / gain / 12)} 年`)

  // ── 原则二：4050 补贴（实际缴费的 50%，最长 3 年 / 36 个月）
  let sub = 0
  const subList = []
  for (let i = 0; i < C.subYears; i++) {
    const y = C.subStart + i
    if (y > L1.date.year) break
    const s = byYear[y] * 0.5
    sub += s
    subList.push(`${y}:${R0(s)}`)
  }
  const costSub = costAll - sub
  console.log(`\n【原则二】4050 补贴（实缴 50%，最长 3 年）：`)
  console.log(`  可领年份 ${subList.join('  ')} → 共补贴 ${R0(sub).toLocaleString()} 元`)
  console.log(`  补贴后实际再掏 ${R0(costSub).toLocaleString()} 元（省 ${R0(sub).toLocaleString()}）`)
  console.log(`  ⇒ 回本缩短到 ${R2(costSub / gain)} 个月 = ${R2(costSub / gain / 12)} 年（快 ${R2((costAll - costSub) / gain)} 个月）`)
  console.log(`  ⇒ 每万元产出：无补贴 ${R2(gain / costAll * 10000)} 元/月，有补贴 ${R2(gain / costSub * 10000)} 元/月`)

  // ── 原则四：医保兜底
  const MED_YEARS = YEARS_AT_STOP                        // 医保与养老同步起缴的估算年限
  const medGap = C.medNeed - MED_YEARS
  console.log(`\n【原则四】医保兜底（长春 2026）：`)
  console.log(`  职工医保 统账结合 589.49×12=${R0(589.49 * 12)}＋大额100 = ${R0(589.49 * 12 + 100)} 元/年`)
  console.log(`  职工医保 单建统筹 388.94×12=${R0(388.94 * 12)}＋大额100 = ${R0(388.94 * 12 + 100)} 元/年`)
  console.log(`  居民医保 410 元/年（含长护险10，财政补 700）`)
  console.log(`  ⇒ 转居民后年省：统账 ${R0(589.49 * 12 + 100 - 410)} 元／单建 ${R0(388.94 * 12 + 100 - 410)} 元`)
  console.log(`  ⇒ 医保退休免缴门槛 ${C.medNeed} 年，已缴约 ${R2(MED_YEARS)} 年，还差 ${R2(medGap)} 年`)

  // ── 延迟退休：投资回收月数（完整口径）
  console.log(`\n【延迟退休】投资回收月数（法定 ${R2(A)} 元/月）：`)
  console.log('  延迟  退休时点   月领      月增X    多缴保费C   少领N月A×N   回收月数t  追平年龄')
  for (const d of [1, 2, 3]) {
    const rd = { year: L1.date.year + d, month: L1.date.month }
    const r = calculate(config, { ...inp, retireDateInput: rd })
    const B = r.legal.total
    const X = B - A
    const N = d * 12
    let Cc = 0
    for (let y = L1.date.year + 1; y <= rd.year; y++) Cc += premiumOf(y)
    const lostPension = A * N                            // 延迟期间没领到的钱
    const tFull = (lostPension + Cc) / X                 // 保守口径（无额外收入）
    const tLazy = Cc / X                                 // 乐观口径（延迟期仍有收入）
    const retAge = (rd.year + (rd.month - 1) / 12) - (1978 + 8 / 12)
    console.log(`  +${d}年  ${rd.year}-${String(rd.month).padStart(2, '0')}  ${R2(B)}  +${R2(X)}  ${R0(Cc).toLocaleString().padStart(7)}  ${R0(lostPension).toLocaleString().padStart(9)}  ${R2(tFull).toLocaleString().padStart(6)}(保守)  ${R2(retAge + tFull / 12)} 岁`)
    console.log(`                                                               ${R2(tLazy).toLocaleString().padStart(6)}(有收入)  ${R2(retAge + tLazy / 12)} 岁`)
  }

  // ── 提前退休对照（同一把尺子）
  const F = rCont.flex || {}
  if (F.date) {
    const N = (L1.date.year - F.date.year) * 12 + (L1.date.month - F.date.month)
    const X = A - F.total
    console.log(`\n  [对照] 弹性提前 ${F.date.year}-${String(F.date.month).padStart(2, '0')}：月领 ${R2(F.total)}，少 ${R2(X)}`)
    console.log(`         提前 ${N} 个月白拿 ${R0(F.total * N).toLocaleString()} 元 ⇒ 追平需 ${R2(F.total * N / X)} 个月 = ${R2(F.total * N / X / 12)} 年`)
  }
}

console.log('\n===== 口径 =====')
console.log('· 保费=全省社平×60%×20%×12（吉林已并轨，计发基数=全口径社平）')
console.log('· 未来年社平/计发基数为引擎外推值（吉林社平数组止于 2026）')
console.log('· 4050：长春按实缴养老保险费的 50% 补贴，上限=100%档次的1/2；一般最长 3 年（36个月）')
console.log('· 医保年限按与养老同步起缴估算（2007-04），实际以本人医保缴费记录为准')
