// 读者案例：1978-09 生，2007-04 起缴灵活就业，长春，60 档（最低档）
// 2026 年秋收入下降（老人生病、孩子上学），问：①现在停缴能开多少 ②继续缴怎么划算 ③要不要延迟退休
//
// 口径纪律：
//  - 引擎不支持"断缴"，停缴场景用「引擎算停缴时点余额 + 引擎利率表滚息」组合，
//    滚息利率一律取引擎 getAccRate(year, config)，不手写数值。
//  - 未来年份计发基数=引擎外推值，社平由「长春计发基数 ÷ 长春比值(2025=1.08962)」反推。
const path = require('path')
const { calculate, getAccRate, getBase } = require(path.resolve('./engine/pension-engine.js'))
const m = require(path.resolve('./cloudfunctions/calculate/provinces/jilin.js'))
const config = m.getEngineConfig ? m.getEngineConfig() : m
const R2 = x => Math.round(x * 100) / 100
const amt = o => (o && typeof o === 'object') ? (o.amount || 0) : (o || 0)

const BASE = {
  province: 'jilin', cityType: 'cc', name: 'reader',
  birthYear: 1978, birthMonth: 9,
  workYear: 2007, workMonth: 4,
  avgIndex: 0.6,
}
const STOP = { year: 2026, month: 9 }          // 停缴时点
const YEARS_AT_STOP = ((STOP.year - 2007) * 12 + (STOP.month - 4) + 1) / 12   // 19.5
// ⚠️ 缴费基数用的是「全省全口径社平」，不是长春计发基数。
// 吉林全省已并轨：计发基数(prov) ÷ 全口径社平 = 1.0000 ⇒ 直接取 getBase('prov', y)
// （曾用 getBase('cc')÷1.08962 反推，错：长春 2026 未单列、仍按 2025 预发，会导致未来年保费不涨反降）
function salaryOf(y) {
  const b = getBase('prov', y, config)
  return (b && typeof b === 'object') ? (b.value != null ? b.value : b.base) : b
}
// 灵活就业 60 档某年的实掏保费（20% 全自付）
function premiumOf(y) { return salaryOf(y) * 0.6 * 0.2 * 12 }

// 把一笔余额从 y0 年滚到 y1 年（利率取引擎）
function roll(bal, y0, y1) {
  let b = bal
  for (let y = y0 + 1; y <= y1; y++) b *= (1 + getAccRate(y, config))
  return b
}

function line(tag, L) {
  const meet = L.meetMin ? '✅' : '❌'
  console.log(`  ${tag}`)
  console.log(`    ${L.date.year}-${String(L.date.month).padStart(2, '0')} 退 (${L.ageStr}，月数 ${L.months})｜缴费 ${R2(L.totalYears)} 年（最低 ${L.minYears} ${meet}）`)
  console.log(`    基础 ${R2(amt(L.basicPension))} + 个账 ${R2(amt(L.personalAccount))} + 增发 ${R2(amt(L.extraPension))} = **${R2(L.total)} 元/月**`)
}

for (const [g, gt, label] of [['female', 'fc', '女（灵活就业 55 档）'], ['male', 'male', '男（60 档）']]) {
  console.log('\n████████████ ' + label + ' ████████████')
  const inp = { ...BASE, gender: g, genderType: gt, personalAcc: 0 }

  const rCont = calculate(config, inp)               // ① 继续缴到法定退休
  const L1 = rCont.legal
  line('① 继续按 60 档缴到法定退休', L1)

  // 停缴时点余额
  const rStopNow = calculate(config, { ...inp, retireDateInput: STOP })
  const B0 = rStopNow.legal.personalAccount.balance
  console.log(`\n  [中间量] 2026-09 个人账户余额 = ${R2(B0)} 元（引擎按 2007-04→2026-09 真实历年利率估算）`)

  // ② 现在彻底停缴
  const B1 = roll(B0, STOP.year, L1.date.year)
  const rStop = calculate(config, { ...inp, personalAcc: B1, totalYears: YEARS_AT_STOP, actualYears: YEARS_AT_STOP })
  line('\n② 现在（2026-09）彻底停缴，之后一分不缴', rStop.legal)

  // ③ 缓 N 年再续缴（N=2/3/5）
  console.log('\n  ③ 缓几年再续缴（断缴期账户仍计息）：')
  for (const N of [2, 3, 5]) {
    const resumeY = STOP.year + N                     // 恢复缴费年份
    if (resumeY >= L1.date.year) { console.log(`     缓 ${N} 年：已过退休年，跳过`); continue }
    // 恢复后新缴部分的积累（引擎算 resumeY-01 → 退休）
    const rNew = calculate(config, { ...inp, workYear: resumeY, workMonth: 1, retireDateInput: { year: L1.date.year, month: L1.date.month } })
    const Bnew = rNew.legal.personalAccount.balance
    const newYears = rNew.legal.totalYears
    const totalBal = roll(B0, STOP.year, L1.date.year) + Bnew
    const totalYears = YEARS_AT_STOP + newYears
    const rGap = calculate(config, { ...inp, personalAcc: totalBal, totalYears, actualYears: totalYears })
    console.log(`     缓 ${N} 年（${resumeY}-01 复缴）→ 缴 ${R2(totalYears)} 年，月领 ${R2(rGap.legal.total)} 元` +
      `（比彻底停 +${R2(rGap.legal.total - rStop.legal.total)}，比一直缴 −${R2(L1.total - rGap.legal.total)}）`)
  }

  // ④ 弹性提前退休
  const F = rCont.flex || {}
  if (F.date) {
    const Bf = roll(B0, STOP.year, F.date.year)
    const rFe = calculate(config, { ...inp, personalAcc: Bf, totalYears: YEARS_AT_STOP, actualYears: YEARS_AT_STOP, retireDateInput: { year: F.date.year, month: F.date.month } })
    console.log(`\n  ④ 弹性提前：${F.ageStr} @ ${F.date.year}-${String(F.date.month).padStart(2, '0')}`)
    console.log(`     一直缴着 → ${R2(F.total)} 元/月（最低需 ${F.minYears} ${F.meetMin ? '✅' : '❌'}）`)
    console.log(`     现在就停 → ${R2(rFe.legal.total)} 元/月`)
  }

  // ⑤ 弹性延迟（继续缴）
  console.log('\n  ⑤ 弹性延迟（边干边缴）：')
  for (const d of [1, 2, 3]) {
    const rd = { year: L1.date.year + d, month: L1.date.month }
    const r = calculate(config, { ...inp, retireDateInput: rd })
    console.log(`     +${d} 年 → ${rd.year}-${String(rd.month).padStart(2, '0')} 缴 ${R2(r.legal.totalYears)} 年，月领 ${R2(r.legal.total)}（较法定 +${R2(r.legal.total - L1.total)}）`)
  }

  // ⑥ 继续缴 vs 停缴：增量成本与回本
  console.log('\n  ⑥ 继续缴的成本（60 档，20% 全自付）：')
  let cost = 0
  const yrs = []
  for (let y = STOP.year + 1; y <= L1.date.year; y++) { const p = premiumOf(y); cost += p; yrs.push(`${y}:${Math.round(p)}`) }
  console.log(`     逐年：${yrs.join('  ')}`)
  console.log(`     2027→${L1.date.year} 合计再掏 ${Math.round(cost).toLocaleString()} 元`)
  const dMonth = L1.total - rStop.legal.total
  const backM = cost / dMonth
  console.log(`     换来月领多 ${R2(dMonth)} 元 → 回本 ${R2(backM)} 个月 = ${R2(backM / 12)} 年`)
  console.log(`     回本年龄 ≈ ${R2(L1.date.year + (L1.date.month - 1) / 12 + backM / 12 - 1978.75)} 岁`)
}

console.log('\n===== 口径提示 =====')
console.log('· 未来年份计发基数、社平均为引擎外推值（吉林社平数组止于 2026）')
console.log('· 2027 年起记账利率按 2.60%（2026 值）回退')
console.log('· 60 档＝缴费下限，已无更低档次可降')
