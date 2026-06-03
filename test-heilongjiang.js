/**
 * 黑龙江省养老金核定表验证测试
 * 案例：女性，1970年9月生，2010年5月工作，2025年9月退休
 * 来源：官方核定表截图（头条@职场老楚）
 */

const engine = require('./engine/pension-engine')
const config = require('./provinces/heilongjiang.json')

// 官方核定表数据
const official = {
  basePension: 1025.83,
  personalAccount: 410.26,
  transitional: 0.00,
  total: 1436.09,
  months: 170,
  base: 7570, // 上年全省平均工资
  avgIndex: 0.7580,
  totalYears: 185 / 12, // 15.4167年
  sightYears: 0,
  personalAccBalance: 69743.68
}

const input = {
  birthYear: 1970,
  birthMonth: 9,
  workYear: 2010,
  workMonth: 5,
  gender: 'female',
  genderType: 'fc', // 55岁退休
  avgIndex: official.avgIndex,
  personalAccInput: official.personalAccBalance,
  totalYears: official.totalYears,
  sightYears: official.sightYears,
  baseRetireInput: official.base,
  baseProvInput: official.base,
  monthsInput: official.months,
  cityType: 'prov'
}

console.log('=== 黑龙江省养老金核定表验证 ===\n')
console.log('参保信息：')
console.log(`  出生：1970年9月，性别：女，工作：2010年5月`)
console.log(`  退休：2025年9月（55岁），缴费：185个月（15.42年）`)
console.log(`  平均指数：${official.avgIndex}，账户余额：${official.personalAccBalance}`)
console.log(`  上年全省平均工资：${official.base}元/月`)
console.log()

const result = engine.calculate(config, input)
const legal = result.legal

// 对比表格
const comparisons = [
  { name: '基础养老金', engine: legal.basicPension.amount, official: official.basePension },
  { name: '个人账户养老金', engine: legal.personalAccount.amount, official: official.personalAccount },
  { name: '过渡性养老金', engine: legal.transitionalPension.amount, official: official.transitional },
  { name: '养老金合计', engine: legal.total, official: official.total }
]

console.log('┌─────────────────┬──────────┬──────────┬────────┐')
console.log('│ 项目            │ 引擎计算 │ 官方核定 │ 差异   │')
console.log('├─────────────────┼──────────┼──────────┼────────┤')

let allPass = true
for (const row of comparisons) {
  const diff = Math.round((row.engine - row.official) * 100) / 100
  const pass = Math.abs(diff) < 0.5
  if (!pass) allPass = false
  const status = pass ? '✅' : '❌'
  console.log(`│ ${row.name.padEnd(15)} │ ${String(row.engine.toFixed(2)).padStart(8)} │ ${String(row.official.toFixed(2)).padStart(8)} │ ${diff >= 0 ? '+' : ''}${diff.toFixed(2)} ${status} │`)
}

console.log('└─────────────────┴──────────┴──────────┴────────┘')
console.log()

// 详细计算过程
console.log('详细计算过程：')
console.log(`  ${legal.basicPension.description}`)
console.log(`  ${legal.personalAccount.description}`)
console.log(`  ${legal.transitionalPension.description}`)
console.log()

if (allPass) {
  console.log('🎉 验证通过！引擎计算结果与官方核定表完全一致。')
} else {
  console.log('⚠️ 存在差异，需要排查。')
}
