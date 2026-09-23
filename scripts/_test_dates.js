// 测试：不同「出生月 / 工作月 / 退休时点」组合下的年限与金额
const ROOT = 'C:/Users/14041/WorkBuddy/2026-07-16-10-20-33/养老金计算平台'
const engine = require(ROOT + '/cloudfunctions/calculate/pension-engine.js')
const { getConfig } = require(ROOT + '/cloudfunctions/calculate/provinces-data.js')
const config = getConfig('jilin')

const CASES = [
  { tag: 'A 生7/工7/退2025-12', birthMonth: 7, workMonth: 7, retire: { year: 2025, month: 12 } },
  { tag: 'B 生12/工7/退2025-12', birthMonth: 12, workMonth: 7, retire: { year: 2025, month: 12 } },
  { tag: 'C 生7/工7/退2025-07', birthMonth: 7, workMonth: 7, retire: { year: 2025, month: 7 } },
]

const AGES = [50, 55, 60]
const GENDER_MAP = { 50: 'fw', 55: 'fc', 60: 'male' }
const START = 22

for (const c of CASES) {
  console.log('\n======== ' + c.tag + ' ========')
  console.log('年龄 年限(实缴+视同)  计发月数  100档金额   基础     过渡    个账     增发')
  for (const age of AGES) {
    const yrs = age - START
    const gt = GENDER_MAP[age]
    const r = engine.calculate(config, {
      gender: gt === 'male' ? 'male' : 'female', genderType: gt,
      birthYear: 2025 - age, birthMonth: c.birthMonth,
      workYear: 2025 - yrs, workMonth: c.workMonth,
      avgIndex: 1.0, cityType: 'cc',
      retireDateInput: c.retire,
    }).legal
    console.log(
      `${age}  ${(r.totalYears || 0).toFixed(2)}(${(r.actualYears || 0).toFixed(2)}+${(r.sightYears || 0).toFixed(2)})`.padEnd(20),
      String(r.months).padEnd(8),
      String(r.total).padEnd(10),
      String(r.basicPension.amount).padEnd(9),
      String(r.transitionalPension.amount).padEnd(8),
      String(r.personalAccount.amount).padEnd(9),
      r.extraPension.amount
    )
  }
}
