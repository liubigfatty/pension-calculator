// 对照：视同缴费年限对吉林省三个退休年龄结果的影响
const ROOT = 'C:/Users/14041/WorkBuddy/2026-07-16-10-20-33/养老金计算平台'
const engine = require(ROOT + '/cloudfunctions/calculate/pension-engine.js')
const { getConfig } = require(ROOT + '/cloudfunctions/calculate/provinces-data.js')
const config = getConfig('jilin')

const START = 22, RY = 2025, RM = 12, CITY = 'cc'

function run(age, tier, sightOverride) {
  const yrs = age - START
  const inp = {
    gender: 'male', genderType: 'male',
    birthYear: RY - age, birthMonth: RM,
    workYear: RY - yrs, workMonth: RM,
    avgIndex: tier / 100, cityType: CITY, retireAge: age,
  }
  if (sightOverride != null) inp.sightYears = sightOverride
  const r = engine.calculate(config, inp).legal
  return {
    total: r.total,
    basic: r.basicPension.amount,
    extra: r.extraPension.amount,
    personal: r.personalAccount.amount,
    trans: r.transitionalPension.amount,
    sight: r.sightYears,
    actual: r.actualYears,
    totalY: r.totalYears,
  }
}

function line(age, r) {
  const s = (n) => (n == null ? '?' : Number(n).toFixed(2))
  return age + '岁 实缴' + s(r.actual) + ' 视同' + s(r.sight) + ' 合计' + s(r.totalY) + '年 | 基础' + r.basic +
    ' 过渡' + r.trans + ' 个账' + r.personal + ' 增发' + r.extra + ' => ' + r.total
}

console.log('=== 100档: 默认(各按实际参保年份) ===')
for (const age of [50, 55, 60]) console.log(line(age, run(age, 100)))

console.log('')
console.log('=== 100档: 强制 sightYears=0 (视同转实缴) ===')
for (const age of [50, 55, 60]) console.log(line(age, run(age, 100, 0)))
