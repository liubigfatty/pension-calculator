// 吉林养老金「真实口径」情景矩阵
// 结构：三类人群 × 缴费档位；参保起点固定 22 岁（本科毕业），参工月固定 7 月（毕业季）
//
// 真实口径（2026-09-12 修订 · v6）：
//   退休时点锁定 2025-12，出生年月由延迟退休政策反推（不再统一按 7 月生）：
//     女工人（原法定 50 岁）→ 1975-08 生，延迟 4 个月 → 实际 50 岁 4 个月退休
//     女干部（原法定 55 岁）→ 1970-09 生，延迟 3 个月 → 实际 55 岁 3 个月退休
//     男职工（原法定 60 岁）→ 1965-09 生，延迟 3 个月 → 实际 60 岁 3 个月退休
//   视同缴费年限、建账时间由引擎按吉林省规则自动核定（吉政发〔1995〕18号：建账 1995-07）
//
// 用法：node scripts/calc_matrix_start22.js
const fs = require('fs')
const path = require('path')

const ROOT = 'C:/Users/14041/WorkBuddy/2026-07-16-10-20-33/养老金计算平台'
const CF = ROOT + '/cloudfunctions/calculate'
const engine = require(CF + '/pension-engine.js')
const { getConfig } = require(CF + '/provinces-data.js')
const { buildCohorts } = require(ROOT + '/scripts/cohort.js')

const config = getConfig('jilin')

const START_AGE = 22                  // 参保起点：本科毕业
const RETIRE_YEAR = 2025
const RETIRE_MONTH = 12
const WORK_MONTH = 7                  // 毕业季参加工作
const CITY = 'cc'                     // 长春市
const PROV_SOCIAL = 7322              // 全省计发基数（替代率分母）

const TIERS = [60, 80, 100, 150, 200, 300]

// 三类人群的真实出生年月（按延迟退休政策反推）
const COHORTS = buildCohorts(RETIRE_YEAR, RETIRE_MONTH, START_AGE, WORK_MONTH)
const AGES = Object.keys(COHORTS).map(Number).sort((a, b) => a - b)

const rows = []
for (const age of AGES) {
  const c = COHORTS[age]
  for (const tier of TIERS) {
    const r = engine.calculate(config, {
      gender: c.type === 'male' ? 'male' : 'female', genderType: c.type,
      birthYear: c.birthYear, birthMonth: c.birthMonth,
      workYear: c.work.year, workMonth: c.work.month,
      avgIndex: tier / 100, cityType: CITY,
      // 传退休年月对象（引擎要求 {year, month} 对象，字符串无效）
      retireDateInput: { year: RETIRE_YEAR, month: RETIRE_MONTH },
    }).legal
    rows.push({
      age, tier, genderType: c.type, genderLabel: c.label,
      birth: c.birthYear + '-' + String(c.birthMonth).padStart(2, '0'),
      work: c.work.year + '-' + String(c.work.month).padStart(2, '0'),
      delayMonths: c.delay,
      realAgeStr: c.realAgeStr,
      years: +c.years.toFixed(4),
      startAge: START_AGE,
      months: r.months,
      basic: r.basicPension.amount,
      extra: r.extraPension.amount,
      personal: r.personalAccount.amount,
      balance: Math.round(r.personalAccount.balance),
      transitional: r.transitionalPension.amount,
      sightYears: +(r.sightYears || 0).toFixed(2),
      actualYears: +(r.actualYears || 0).toFixed(2),
      totalYears: +(r.totalYears || 0).toFixed(2),
      total: r.total,
      replaceRate: +(r.total / PROV_SOCIAL * 100).toFixed(2),
      payBase: Math.round(r.baseProv * tier / 100),
    })
  }
}

const outDir = ROOT + '/reports/matrix-jilin-start22-2026-09-12'
fs.mkdirSync(outDir, { recursive: true })
fs.writeFileSync(path.join(outDir, 'matrix.json'), JSON.stringify({
  meta: {
    province: 'jilin', name: '吉林省', city: CITY, cityName: '长春市',
    retireMonth: RETIRE_YEAR + '-' + RETIRE_MONTH,
    workMonth: WORK_MONTH, startAge: START_AGE,
    cohorts: Object.fromEntries(AGES.map(a => [a, {
      label: COHORTS[a].label, birth: COHORTS[a].birthYear + '-' + String(COHORTS[a].birthMonth).padStart(2, '0'),
      work: COHORTS[a].work.year + '-' + String(COHORTS[a].work.month).padStart(2, '0'),
      delayMonths: COHORTS[a].delay, realAgeStr: COHORTS[a].realAgeStr,
    }])),
    ages: AGES, tiers: TIERS,
    provSocial: PROV_SOCIAL, baseRetire: 7978.25,
    basis: '延迟退休出生年月依据：国办发〔2025〕5号附件对照表',
    generatedAt: new Date().toISOString(),
  },
  rows,
}, null, 2))

console.log('=== 22 岁参保 · 真实口径 v6（退休 2025-12，出生年月按政策反推）===')
for (const age of AGES) {
  const c = COHORTS[age]
  const sample = rows.find(r => r.age === age)
  console.log('\n--- 原法定 ' + age + ' 岁（' + c.label + '）出生 ' + c.birthYear + '-' + String(c.birthMonth).padStart(2, '0')
    + '，延迟 ' + c.delay + ' 个月，实际 ' + c.realAgeStr + ' 退休')
  console.log('    参工 ' + c.work.year + '-07，缴费年限 ' + sample.totalYears
    + ' 年 = 实缴 ' + sample.actualYears + ' + 视同 ' + sample.sightYears
    + '，计发月数 ' + sample.months)
  console.log(['档位', '金额', '替代率', '过渡性'].join('\t'))
  for (const t of TIERS) {
    const r = rows.find(x => x.age === age && x.tier === t)
    console.log([t + '档', r.total, r.replaceRate + '%', r.transitional].join('\t'))
  }
}
console.log('\n样本数：', rows.length, '｜ 输出：', path.join(outDir, 'matrix.json'))
