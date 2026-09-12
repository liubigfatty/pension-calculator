/**
 * 2026-09-12 延迟退休修复 · 独立评估脚本
 *
 * 【为什么要重写一份】
 * 上一轮验证用的是 scripts/cohort.js —— 那是我自己按政策写的模块，
 * 用它去验证我自己改的引擎，"交叉验证"其实是同源自证，不成立。
 * 本脚本改用「政策附表硬编码」作为独立基准：
 *   数据来源：全国人大常委会《关于实施渐进式延迟法定退休年龄的决定》
 *             附件1（男职工）/ 附件2（原55周岁女职工）/ 附件3（原50周岁女职工）
 *             及沈阳市人社局 2026-06-05 官方解读
 *
 * 【本脚本只读不改】不修改任何引擎文件。
 */
const ROOT = __dirname + '/..'
const engine = require(ROOT + '/cloudfunctions/calculate/pension-engine.js')
const { getConfig } = require(ROOT + '/cloudfunctions/calculate/provinces-data.js')

// ============ 政策附表硬编码（独立基准，不来自引擎、不来自 cohort.js）============
// 格式：[出生年, 出生月, 政策延迟月数, 政策退休时间 'YYYY-MM']
const TABLE = {
  male: { gt: 'male', baseAge: 60, label: '男职工（附件1）', cases: [
    [1965, 1, 1, '2025-02'], [1965, 2, 1, '2025-03'],
    [1965, 3, 1, '2025-04'], [1965, 4, 1, '2025-05'],
    [1965, 5, 2, '2025-07'], [1965, 8, 2, '2025-10'],
    [1965, 9, 3, '2025-12'], [1965, 12, 3, '2026-03'],
    [1966, 1, 4, '2026-05'], [1966, 5, 5, '2026-10'],
    [1966, 9, 6, '2027-03'], [1967, 1, 7, '2027-08'],
    [1968, 5, 11, '2029-04'], [1969, 1, 13, '2030-02'],
    [1972, 5, 23, '2034-04'], [1973, 1, 25, '2035-02'],
    [1975, 1, 31, '2037-08'], [1976, 9, 36, '2039-09'],
    [1976, 12, 36, '2039-12'], [1977, 1, 36, '2040-01'],
  ]},
  fc: { gt: 'fc', baseAge: 55, label: '原55周岁女职工（附件2）', cases: [
    [1970, 1, 1, '2025-02'], [1970, 4, 1, '2025-05'],
    [1970, 5, 2, '2025-07'], [1970, 9, 3, '2025-12'],
    [1970, 12, 3, '2026-03'], [1971, 5, 5, '2026-10'],
    [1972, 9, 9, '2028-06'], [1974, 5, 14, '2030-07'],
    [1976, 1, 19, '2032-08'], [1979, 5, 29, '2036-10'],
    [1981, 9, 36, '2039-09'], [1981, 12, 36, '2039-12'],
  ]},
  fw55: { gt: 'fw55', baseAge: 55, label: '灵活就业女55岁（同附件2）', cases: [
    [1970, 1, 1, '2025-02'], [1970, 5, 2, '2025-07'],
    [1970, 9, 3, '2025-12'], [1971, 5, 5, '2026-10'],
    [1974, 5, 14, '2030-07'], [1981, 9, 36, '2039-09'],
  ]},
  fw: { gt: 'fw', baseAge: 50, label: '原50周岁女职工（附件3）', cases: [
    [1975, 1, 1, '2025-02'], [1975, 2, 1, '2025-03'],
    [1975, 3, 2, '2025-05'], [1975, 4, 2, '2025-06'],
    [1976, 1, 7, '2026-08'], [1980, 1, 31, '2032-08'],
    [1984, 11, 60, '2039-11'], [1984, 12, 60, '2039-12'],
  ]},
}

// ============ 独立实现（按政策原文，供影响面精算用）============
function policyDelay(by, bm, baseYear, step, cap) {
  const diff = (by - baseYear) * 12 + (bm - 1)
  if (diff < 0) return 0
  return Math.min(Math.floor(diff / step) + 1, cap)
}
function policyRetire(by, bm, baseAge, delay) {
  const t = by * 12 + (bm - 1) + baseAge * 12 + delay
  return { year: Math.floor(t / 12), month: (t % 12) + 1 }
}
// 修复前的旧算法（用于量化影响面）
function oldDelay(by, bm, baseYear, step, cap) {
  const diff = (by - baseYear) * 12 + (bm - 1)
  if (diff <= 0) return 0
  return Math.min(Math.floor((diff - 1) / step) + 1, cap)
}
function oldRetire(by, bm, baseAge, delay) {
  const year = by + Math.floor((baseAge * 12 + delay) / 12)
  let month = bm + ((baseAge * 12 + delay) % 12)
  return { year, month: month > 12 ? month - 12 : month }
}

console.log('══════ 〇、基准自洽性检查（延迟月数 + 基准年龄 + 出生年月 = 退休年月）══════\n')
let bad = 0
for (const key of Object.keys(TABLE)) {
  const g = TABLE[key]
  for (const [by, bm, expDelay, expDate] of g.cases) {
    const t = by * 12 + (bm - 1) + g.baseAge * 12 + expDelay
    const d = `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`
    if (d !== expDate) {
      bad++
      console.log(`  ⚠️ ${g.gt} ${by}-${String(bm).padStart(2,'0')} 表内不自洽：延迟${expDelay} ⇒ ${d}，但表写 ${expDate}`)
    }
  }
}
console.log(bad === 0 ? '  ✅ 全部节点自洽\n' : `  ${bad} 个节点不自洽，基准不可信\n`)

let pass = 0, fail = 0
const failures = []

console.log('══════ 一、引擎 vs 政策附表硬编码 ══════\n')
const cfg = getConfig('jilin')
for (const key of Object.keys(TABLE)) {
  const g = TABLE[key]
  console.log(`【${g.label}】`)
  for (const [by, bm, expDelay, expDate] of g.cases) {
    const r = engine.calculate(cfg, {
      gender: g.gt === 'male' ? 'male' : 'female', genderType: g.gt,
      birthYear: by, birthMonth: bm,
      workYear: 2000, workMonth: 7, avgIndex: 1, cityType: null,
    }).legal
    // 引擎不直接暴露 delayMonths，用 legal.age 反推（age = baseAge + delay/12）
    const gotDelay = Math.round((r.age - g.baseAge) * 12)
    const gotDate = `${r.date.year}-${String(r.date.month).padStart(2, '0')}`
    const okDelay = gotDelay === expDelay
    const okDate = gotDate === expDate
    const ok = okDelay && okDate
    if (ok) pass++; else { fail++; failures.push(`${g.gt} ${by}-${String(bm).padStart(2,'0')} 期望 延迟${expDelay}/退休${expDate}，实得 延迟${gotDelay}/退休${gotDate}`) }
    console.log(`  ${by}-${String(bm).padStart(2,'0')}  延迟 ${String(gotDelay).padStart(2)}/${String(expDelay).padStart(2)}  退休 ${gotDate}/${expDate}  ${ok ? '✅' : '❌'}`)
  }
  console.log('')
}

console.log('══════ 二、影响面精算（修复前 vs 政策）══════\n')
console.log('人群      样本量   延迟月数变化   退休年月变化   两者皆有')
const SCAN = { male: [1960, 1985], fc: [1965, 1990], fw55: [1965, 1990], fw: [1970, 1995] }
const PARAMS = { male: [1965, 4, 36, 60], fc: [1970, 4, 36, 55], fw55: [1970, 4, 36, 55], fw: [1975, 2, 60, 50] }
for (const gt of Object.keys(SCAN)) {
  const [y0, y1] = SCAN[gt]
  const [baseYear, step, cap, baseAge] = PARAMS[gt]
  let n = 0, dDelay = 0, dDate = 0, both = 0
  // ⚠️ fw（原50岁女职工）特殊：修复前引擎走 return 0 短路，延迟恒为 0（P3，本次未修）
  //    所以它的"修复前"不是 oldDelay()，而是常数 0
  const useShortCircuit = (gt === 'fw')
  for (let y = y0; y <= y1; y++) {
    for (let m = 1; m <= 12; m++) {
      n++
      const od = useShortCircuit ? 0 : oldDelay(y, m, baseYear, step, cap)
      const nd = policyDelay(y, m, baseYear, step, cap)
      const orr = oldRetire(y, m, baseAge, od)
      const nr = policyRetire(y, m, baseAge, nd)
      const c1 = od !== nd
      const c2 = orr.year !== nr.year || orr.month !== nr.month
      if (c1) dDelay++
      if (c2) dDate++
      if (c1 && c2) both++
    }
  }
  const p = x => (x / n * 100).toFixed(1).padStart(5) + '%'
  console.log(`${gt.padEnd(8)}  ${String(n).padStart(5)}   ${String(dDelay).padStart(4)} ${p(dDelay)}   ${String(dDate).padStart(4)} ${p(dDate)}   ${String(both).padStart(4)} ${p(both)}`)
}

console.log('\n══════ 三、结论 ══════')
console.log(`政策附表节点：${pass} 通过 / ${fail} 失败`)
if (failures.length) {
  console.log('\n失败明细：')
  failures.forEach(f => console.log('  ❌ ' + f))
}
