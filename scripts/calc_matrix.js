// 通用养老金情景矩阵生成器（正元引擎实算）
// 用法：
//   node scripts/calc_matrix.js \
//     --province=jilin --city=cc \
//     --ages=55:f:女工人,58:f:女干部,63:m:男职工 \
//     --years=15,20,25,30 --tiers=60,80,100,150,200,300 \
//     --retire=2025-12 \
//     --out=reports/matrix-jilin-delay-2026-09-10 \
//     --name=吉林省
//
// 年龄格式：年龄[:性别(m/f)][:身份标签]，性别缺省时 >=60 视为男
// 三轴：缴费年限 × 缴费档位 × 退休年龄；统一"退休时点"，缴费起点 = 退休年 - 缴费年限
const fs = require('fs')
const path = require('path')

const ROOT = 'C:/Users/14041/WorkBuddy/2026-07-16-10-20-33/养老金计算平台'
const CF = ROOT + '/cloudfunctions/calculate'

function arg(name, def) {
  const p = process.argv.find(a => a.startsWith('--' + name + '='))
  return p ? p.slice(name.length + 3) : def
}

const PROVINCE = arg('province', 'jilin')
const CITY = arg('city', 'cc')
const RETIRE = arg('retire', '2025-12')
const YEARS = arg('years', '15,20,25,30').split(',').map(Number)
const TIERS = arg('tiers', '60,80,100,150,200,300').split(',').map(Number)
const AGES_RAW = arg('ages', '55:f:女工人,58:f:女干部,63:m:男职工')
const OUT = arg('out', ROOT + '/reports/matrix-' + PROVINCE + '-delay-2026-09-10')
const NAME = arg('name', PROVINCE)

const agesInfo = AGES_RAW.split(',').map(s => {
  const p = s.split(':')
  const age = Number(p[0])
  const g = p[1] === 'm' ? 'male' : p[1] === 'f' ? 'female' : (age >= 60 ? 'male' : 'female')
  return { age, gender: g, role: p[2] || '' }
})

const [RY, RM] = RETIRE.split('-').map(Number)

const engine = require(CF + '/pension-engine.js')
const { getConfig } = require(CF + '/provinces-data.js')
const config = getConfig(PROVINCE)

// ---------- 探针：取全省计发基数，作为替代率分母 ----------
const probeInput = {
  gender: agesInfo[0].gender, genderType: agesInfo[0].gender,
  birthYear: RY - agesInfo[0].age, birthMonth: RM,
  workYear: RY - 20, workMonth: RM,
  avgIndex: 1, cityType: CITY, retireAge: agesInfo[0].age,
}
const probe = engine.calculate(config, probeInput)
const PROV_SOCIAL = probe.legal.baseProv
const BASE_RETIRE = probe.legal.baseRetire

// ---------- 三轴穷举 ----------
const rows = []
for (const info of agesInfo) {
  for (const yrs of YEARS) {
    for (const tier of TIERS) {
      const input = {
        gender: info.gender, genderType: info.gender,
        birthYear: RY - info.age, birthMonth: RM,
        workYear: RY - yrs, workMonth: RM,
        avgIndex: tier / 100, cityType: CITY, retireAge: info.age,
      }
      const L = engine.calculate(config, input).legal
      rows.push({
        age: info.age,
        role: info.role,
        years: yrs,
        tier,
        startAge: info.age - yrs,           // 参保年龄（= 退休年龄 - 缴费年限）
        totalYears: +L.totalYears.toFixed(3),
        months: L.months,
        basic: L.basicPension.amount,
        extra: L.extraPension.amount,
        personal: L.personalAccount.amount,
        balance: Math.round(L.personalAccount.balance),
        transitional: L.transitionalPension.amount,
        total: L.total,
        replaceRate: +(L.total / PROV_SOCIAL * 100).toFixed(2),
        baseRetire: L.baseRetire,
        baseProv: L.baseProv,
        payBase: Math.round(L.baseProv * tier / 100),
      })
    }
  }
}

fs.mkdirSync(OUT, { recursive: true })
const meta = {
  province: PROVINCE,
  name: NAME,
  city: CITY,
  retireMonth: RETIRE,
  ages: agesInfo.map(a => a.age),
  agesInfo,
  ageLabels: agesInfo.reduce((m, a) => (m[a.age] = a.role, m), {}),
  years: YEARS,
  tiers: TIERS,
  provSocial: PROV_SOCIAL,
  baseRetire: BASE_RETIRE,
  generatedAt: new Date().toISOString(),
}
fs.writeFileSync(path.join(OUT, 'matrix.json'), JSON.stringify({ meta, rows }, null, 2))

// ---------- 控制台预览 ----------
for (const info of agesInfo) {
  console.log('\n===== ' + info.age + ' 岁退休' + (info.role ? '（' + info.role + '）' : '') + ' 计发月数 ' + rows.find(r => r.age === info.age).months + ' =====')
  console.log(['年限/档位'].concat(TIERS.map(t => t + '档')).join('\t'))
  for (const yrs of YEARS) {
    console.log([yrs + '年'].concat(TIERS.map(t => rows.find(x => x.age === info.age && x.years === yrs && x.tier === t).total)).join('\t'))
  }
}
console.log('\n样本数：', rows.length)
console.log('全省计发基数：', PROV_SOCIAL, '｜ 退休地计发基数：', BASE_RETIRE)
console.log('输出：', path.join(OUT, 'matrix.json'))
