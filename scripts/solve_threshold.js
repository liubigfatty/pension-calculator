// 阈值求解器：求「达到目标金额所需的最低缴费档位」
// 与矩阵（离散采样）不同，本脚本在连续档位上二分逼近，再取最接近的整数档
//
// 用法：
//   node scripts/solve_threshold.js --province=jilin --city=cc --start=22 \
//     --ages=50,55,60 --target=5000 --retire=2025-12 \
//     --workmonth=7 --genders=50:fw,55:fc,60:male
//
// 真实口径（2026-09-12 修订 · v6）：
//   - 退休时点锁定，出生年月由延迟退休政策反推（不再统一按 7 月生）
//     女工人 1975-08 / 女干部 1970-09 / 男职工 1965-09
//   - 性别身份按人群映射：50=女工人(fw) / 55=女干部(fc) / 60=男职工(male)
//   - 视同缴费年限、建账时间由引擎按省份规则自动核定
//
// 输出：各退休年龄下达到目标金额所需的最低档位（精确解 + 最近整数档）
const fs = require('fs')
const path = require('path')

const ROOT = 'C:/Users/14041/WorkBuddy/2026-07-16-10-20-33/养老金计算平台'
const CF = ROOT + '/cloudfunctions/calculate'
const { buildCohorts, solveBirth } = require(ROOT + '/scripts/cohort.js')

function arg(name, def) {
  const p = process.argv.find(a => a.startsWith('--' + name + '='))
  return p ? p.slice(name.length + 3) : def
}

const PROVINCE = arg('province', 'jilin')
const CITY = arg('city', 'cc')
const START_AGE = Number(arg('start', 22))          // 参保起点年龄
const TARGET = Number(arg('target', 5000))          // 目标金额
const RETIRE = arg('retire', '2025-12')
const AGES = arg('ages', '50,55,60').split(',').map(Number)
const WORK_MONTH = Number(arg('workmonth', 7))      // 参加工作月份（7=毕业季）
const GENDER_MAP = (() => {
  const raw = arg('genders', '50:fw,55:fc,60:male')
  const m = {}
  if (raw) raw.split(',').forEach(s => { const p = s.split(':'); if (p.length === 2) m[Number(p[0])] = p[1] })
  return m
})()

const [RY, RM] = RETIRE.split('-').map(Number)
const RETIRE_YM = { year: RY, month: RM }

const engine = require(CF + '/pension-engine.js')
const { getConfig } = require(CF + '/provinces-data.js')
const config = getConfig(PROVINCE)

function genderOf(age) {
  return GENDER_MAP[age] || (age >= 60 ? 'male' : 'fw')
}
function genderField(gt) {
  return (gt === 'male') ? 'male' : 'female'
}

// ---------- 人口口径：按延迟退休政策反推出生年月 ----------
// 优先使用 cohort 模块自动反推；反推不到时回退到「退休年 − 原法定年龄 + 7 月生」
const COHORTS = {}
for (const age of AGES) {
  const gt = genderOf(age)
  let b = null
  try { b = solveBirth(gt, RY, RM) } catch (e) { b = null }
  if (b) {
    COHORTS[age] = {
      type: gt, label: b.label,
      birth: { year: b.birthYear, month: b.birthMonth },
      work: { year: b.birthYear + START_AGE, month: WORK_MONTH },
      delay: b.delay, realAgeStr: `${Math.floor(b.realAgeMonths / 12)}岁${b.realAgeMonths % 12 ? (b.realAgeMonths % 12) + '个月' : '整'}`,
    }
  } else {
    COHORTS[age] = {
      type: gt, label: gt,
      birth: { year: RY - age, month: 7 },
      work: { year: RY - age + START_AGE, month: WORK_MONTH },
      delay: 0, realAgeStr: age + '岁',
    }
  }
}

// ---------- 单点计算 ----------
function calc(age, tier) {
  const c = COHORTS[age]
  const r = engine.calculate(config, {
    gender: genderField(c.type), genderType: c.type,
    birthYear: c.birth.year, birthMonth: c.birth.month,
    workYear: c.work.year, workMonth: c.work.month,
    avgIndex: tier / 100, cityType: CITY,
    // 传退休年月对象（引擎要求 {year, month} 对象，字符串无效）
    retireDateInput: { year: RY, month: RM },
  }).legal
  return {
    age, tier, genderType: c.type, genderLabel: c.label,
    birth: c.birth.year + '-' + String(c.birth.month).padStart(2, '0'),
    work: c.work.year + '-' + String(c.work.month).padStart(2, '0'),
    delayMonths: c.delay, realAgeStr: c.realAgeStr,
    total: r.total, months: r.months,
    basic: r.basicPension.amount,
    extra: r.extraPension.amount,
    personal: r.personalAccount.amount,
    transitional: r.transitionalPension.amount,
    balance: Math.round(r.personalAccount.balance),
    sightYears: +(r.sightYears || 0).toFixed(2),
    actualYears: +(r.actualYears || 0).toFixed(2),
    totalYears: +(r.totalYears || 0).toFixed(4),
    payBase: Math.round(r.baseProv * tier / 100),
  }
}

// 探针取计发基数（替代率分母）
const probe = engine.calculate(config, {
  gender: 'male', genderType: 'male',
  birthYear: RY - AGES[0], birthMonth: 7,
  workYear: RY - 20, workMonth: WORK_MONTH,
  avgIndex: 1, cityType: CITY,
  retireDateInput: { year: RY, month: RM },
}).legal
const SOC = probe.baseProv

// ---------- 二分逼近 ----------
function solve(age) {
  let lo = 10, hi = 600
  if (calc(age, hi).total < TARGET) return null   // 即使 600 档也达不到
  let guard = 0
  while (hi - lo > 0.005 && guard++ < 200) {
    const mid = (lo + hi) / 2
    if (calc(age, mid).total >= TARGET) hi = mid
    else lo = mid
  }
  const exact = Math.ceil(hi * 100) / 100
  const nearest = Math.round(exact)                 // 最接近的整数档
  const above = Math.ceil(exact)                    // 确保达标的最低整数档
  return {
    age, exact, nearest, above,
    nearestResult: calc(age, nearest),
    aboveResult: calc(age, above),
  }
}

const results = AGES.map(solve)

// ---------- 控制台输出 ----------
console.log('=== ' + PROVINCE + ' · 参保起点 ' + START_AGE + ' 岁 · 目标 ' + TARGET + ' 元 ===')
console.log('全省计发基数（替代率分母）：', SOC, '元')
console.log('口径：退休 ' + RETIRE + ' · 参工 ' + WORK_MONTH + ' 月 · 出生年月按延迟退休政策反推\n')
for (const age of AGES) {
  const c = COHORTS[age]
  console.log('【' + c.label + '】原法定 ' + age + ' 岁 → 出生 ' + c.birth.year + '-' + String(c.birth.month).padStart(2, '0')
    + '，延迟 ' + c.delay + ' 个月，实际 ' + c.realAgeStr + ' 退休')
}
console.log('')
for (const r of results) {
  if (!r) { console.log(r?.age + ' 岁：即使 600 档也达不到 ' + TARGET); continue }
  const n = r.nearestResult
  console.log(r.age + ' 岁（' + n.genderLabel + '）缴费年限 ' + n.totalYears + ' 年（实缴 ' + n.actualYears + ' + 视同 ' + n.sightYears + '），计发月数 ' + n.months)
  console.log('  精确解        ≈ ' + r.exact.toFixed(2) + ' 档')
  console.log('  最接近整数档  = ' + r.nearest + ' 档 → ' + n.total + ' 元'
    + '（' + (n.total >= TARGET ? '过线 +' : '差 ') + Math.abs(n.total - TARGET).toFixed(2) + '）'
    + '  缴基 ' + n.payBase)
  console.log('  达标最低整数  = ' + r.above + ' 档 → ' + r.aboveResult.total + ' 元（+' + (r.aboveResult.total - TARGET).toFixed(2) + '）  缴基 ' + r.aboveResult.payBase)
  console.log('')
}

const outDir = ROOT + '/reports/threshold-' + PROVINCE + '-' + TARGET + '-' + new Date().toISOString().slice(0, 10)
fs.mkdirSync(outDir, { recursive: true })
fs.writeFileSync(path.join(outDir, 'threshold.json'), JSON.stringify({
  meta: {
    province: PROVINCE, city: CITY, startAge: START_AGE, target: TARGET,
    retireMonth: RETIRE, workMonth: WORK_MONTH,
    cohorts: COHORTS, provSocial: SOC,
    basis: '延迟退休出生年月依据：国办发〔2025〕5号附件对照表',
    generatedAt: new Date().toISOString(),
  },
  results: results.map(r => r && ({
    age: r.age, exact: r.exact, nearest: r.nearest, above: r.above,
    nearestResult: r.nearestResult, aboveResult: r.aboveResult,
  })),
}, null, 2))
console.log('输出：', path.join(outDir, 'threshold.json'))
