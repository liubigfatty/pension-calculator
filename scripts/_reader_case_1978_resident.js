// 读者案例：停缴灵活就业后转缴城乡居民养老保险，到底换来什么
// 1978-09 生 / 长春 / 灵活就业 60 档 / 2007-04 起缴 / 2026-09 停（19.5 年）
const path = require('path')
const { calculate, getBase, getAccRate } = require(path.resolve('./engine/pension-engine.js'))
const m = require(path.resolve('./cloudfunctions/calculate/provinces/jilin.js'))
const config = m.getEngineConfig ? m.getEngineConfig() : m
const R2 = x => Math.round(x * 100) / 100
const R0 = x => Math.round(x)

// ---------- 参数 ----------
const RES_R = 0.0361          // 吉林城乡居民记账利率（2025 公布 3.61%）
const CC_BASE_RES = 224       // 长春市本级 2026 年基础养老金（元/月）
const PROV_MIN = 154          // 全省最低基础养老金（2025-07 起）
// 吉林居民养老 10 档 + 补贴（吉人社联〔2025〕135 号；2000 以上补贴封顶 170）
const TIERS = [
  [100, 30], [200, 40], [300, 50], [500, 70], [1000, 120],
  [1500, 145], [2000, 170], [3000, 170], [4000, 170], [5000, 170],
]
const STOP_Y = 2026, STOP_M = 9   // 停缴时点

function baseProv(y) { const b = getBase('prov', y, config); return (b && typeof b === 'object') ? (b.value != null ? b.value : b.base) : b }
// 职工 60 档年保费（20% 全自付）
function prem60(y) { return baseProv(y) * 0.6 * 0.20 * 12 }

// 停缴时点（2026-09）的职工个人账户余额 & 累计缴费基数
function accAtStop() {
  // 引擎按 workYear→retireDateInput 估算；取一个极近的退休时点逼近"停缴时点"
  const r = calculate(config, {
    province: 'jilin', cityType: 'cc', personalAcc: 0, name: 'stop',
    gender: 'female', genderType: 'fc',
    birthYear: 1978, birthMonth: 9, workYear: 2007, workMonth: 4,
    avgIndex: 0.6, retireDateInput: { year: 2026, month: 10 },
  })
  const L = r.legal || {}
  const pa = L.personalAccount && L.personalAccount.amount != null ? L.personalAccount.amount : L.personalAccount
  return { pa: pa, months: L.months, bal: pa * L.months, years: L.totalYears }
}
const S = accAtStop()

// 2007-04 → 2026-09 累计缴费基数总额（= 社平 × 0.6 × 月数）
function contribBaseTotal() {
  let s = 0
  for (let y = 2007; y <= 2026; y++) {
    const v = (config.avg_salary_history || {})[y]; if (!v) continue
    const b = y === 2007 ? 4 : 1, e = y === 2026 ? 9 : 12
    s += v * 0.6 * (e - b + 1)
  }
  return s
}
const CBT = contribBaseTotal()

console.log('=== 停缴时点（2026-09）家底 ===')
console.log('  缴费年限:', R2(S.years), '年')
console.log('  个人账户余额:', R0(S.bal), '元  (月领', R2(S.pa), '× 计发月数', S.months, ')')
console.log('  累计缴费基数总额:', R0(CBT), '元')
console.log('  → 其中进个人账户(8%):', R0(CBT * 0.08), '进统筹(12%):', R0(CBT * 0.12), ' 全自付20%:', R0(CBT * 0.20))

// ---------- 居民养老：从 sy 年缴到 ey 年，每年 tier 元 ----------
function residentAcc(sy, ey, tier, subsidy, startBal) {
  let bal = startBal || 0
  for (let y = sy; y <= ey; y++) {
    bal = (bal + tier + subsidy) * (1 + RES_R)
  }
  return bal
}

const CASES = [
  { tag: '女', gender: 'female', genderType: 'fc', retY: 2035, retM: 12, months: 156.5, legalTotal: 3096.41, stopTotal: 1999.35, contCost: 107918 },
  { tag: '男', gender: 'male', genderType: 'male', retY: 2041, retM: 9, months: 117, legalTotal: 4711.57, stopTotal: 2482.09, contCost: 192587 },
]

for (const C of CASES) {
  const nYears = C.retY - 2027 + 1             // 2027 起到退休当年
  console.log(`\n========== ${C.tag}（法定 ${C.retY}-${String(C.retM).padStart(2, '0')} 退，计发月数 ${C.months}）==========`)
  console.log(`停缴后转缴居民：${nYears} 年（2027–${C.retY}）`)

  console.log('\n【路径A】停缴职工 → 缴居民 → 到职工退休时并入职工账户（年限不折算）')
  console.log('档位   | 年缴 | 补贴 | 总投入 | 居民账户终值 | 并入后月增 | 月领合计 | 每万元产出')
  for (const [tier, sub] of TIERS) {
    if (tier < 1000) continue
    const total = tier * nYears
    const acc = residentAcc(2027, C.retY, tier, sub, 0)   // 居民账户独立滚
    const merged = accAtStopBalTo(C) + acc                 // 职工个账滚到退休 + 居民账户
    const monthlyAdd = acc / C.months
    const totalM = C.stopTotal + monthlyAdd
    console.log(
      `${String(tier).padStart(5)} | ${String(tier).padStart(4)} | ${String(sub).padStart(4)} | ${String(R0(total)).padStart(6)} | ${String(R0(acc)).padStart(12)} | ${String(R2(monthlyAdd)).padStart(10)} | ${String(R2(totalM)).padStart(8)} | ${R2(monthlyAdd / (total / 10000))}`
    )
  }

  console.log('\n【路径B】同样这笔钱，继续缴职工 60 档（对照）')
  // 每万元买到的月领增量：继续缴 vs 彻底停
  const contMonths = C.contCost / (C.legalTotal - C.stopTotal)
  console.log(`  继续缴总成本 ${R0(C.contCost)} 元 → 月领 ${C.legalTotal}（停缴 ${C.stopTotal}），增量 ${R2(C.legalTotal - C.stopTotal)}，回本 ${R2(contMonths)} 个月`)
  console.log(`  每万元产出: ${R2((C.legalTotal - C.stopTotal) / (C.contCost / 10000))} 元/月`)

  console.log('\n【路径C】假设能放弃职工、纯走居民（警示对比）')
  // ⚠️ 现实中走不通：职工已缴 19.5 年 ≥ 15 年，按人社部发〔2014〕17号第三条不符合"职工转居民"条件
  const ccBase = CC_BASE_RES
  // 停缴时点个账 71,394 按职工记账利率滚到退休
  const stopBalTo = S.bal * Math.pow(1 + getAccRate(2026, config), C.retY - STOP_Y)
  const resAgeY = 2038, resAgeM = 9   // 居民养老统一 60 周岁
  const nResY = resAgeY - 2027 + 1    // 缴到 60 岁
  console.log(`  停缴时个账 ${R0(S.bal)} 滚到 ${C.retY} 年 ≈ ${R0(stopBalTo)}（职工记账利率 ${(getAccRate(2026, config) * 100).toFixed(2)}%）`)
  console.log(`  居民养老统一 60 周岁领取 = ${resAgeY}-09；缴至 60 岁共 ${nResY} 年`)
  for (const tier of [2000, 5000]) {
    const sub = tier >= 2000 ? 170 : 0
    const accRes = residentAcc(2027, resAgeY, tier, sub, 0)          // 居民账户独立滚
    const accAll = stopBalTo + accRes                                 // 职工个账并入
    const yRes = 19.5 + nResY
    const longAdd = Math.max(0, Math.floor(yRes) - 15) * 5            // 吉林超15年每多缴1年+5元/月
    const monthly = ccBase + accAll / 139 + longAdd
    console.log(`  ${tier} 档 ×${nResY} 年：居民账户 ${R0(accRes)} + 职工并入 ${R0(stopBalTo)} = ${R0(accAll)}`)
    console.log(`      → 个人账户 ${R2(accAll / 139)} + 基础 ${ccBase} + 年限加发 ${longAdd} = 月领 ${R2(monthly)}（比继续缴职工少 ${R2(C.legalTotal - monthly)}）`)
  }

  console.log('\n【路径A vs B】回本对比（关键决策依据）')
  const a5000 = residentAcc(2027, C.retY, 5000, 170, 0)
  const aAdd = a5000 / C.months
  const aCost = 5000 * nYears
  console.log(`  停职工+缴居民5000档：投入 ${R0(aCost)} → 月增 ${R2(aAdd)} → 回本 ${R2(aCost / aAdd / 12)} 年，月领 ${R2(C.stopTotal + aAdd)}`)
  console.log(`  继续缴职工 60 档   ：投入 ${R0(C.contCost)} → 月增 ${R2(C.legalTotal - C.stopTotal)} → 回本 ${R2(C.contCost / (C.legalTotal - C.stopTotal) / 12)} 年，月领 ${C.legalTotal}`)
  console.log(`  ⇒ 职工比居民：月领多 ${R2(C.legalTotal - C.stopTotal - aAdd)} 元，回本快 ${R2(aCost / aAdd / 12 - C.contCost / (C.legalTotal - C.stopTotal) / 12)} 年`)
}

// 职工个账滚到退休时点的终值
function accAtStopBalTo(C) {
  const r = calculate(config, {
    province: 'jilin', cityType: 'cc', personalAcc: 0, name: 'x',
    gender: C.gender, genderType: C.genderType,
    birthYear: 1978, birthMonth: 9, workYear: 2007, workMonth: 4,
    avgIndex: 0.6, retireDateInput: { year: C.retY, month: C.retM },
  })
  const L = r.legal || {}
  const pa = L.personalAccount && L.personalAccount.amount != null ? L.personalAccount.amount : L.personalAccount
  return pa * L.months
}

console.log('\n=== 遗属待遇对比（吉林口径）===')
console.log('  职工（灵活就业）：丧葬补助金 + 抚恤金，按人社部发〔2021〕18 号 → 约 37,415.58 元')
console.log('  居民：丧葬补助金 = 4 个月上年末全省最低基础养老金 → 2026 年 154×4 = 616 元')
console.log('  差额:', R0(37415.58 - 616), '元')
