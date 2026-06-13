// 测试案例5：淮安洪泽（用正确的官方数据）
const { calculate } = require('./engine/pension-engine.js')
const fs = require('fs')

// 读取江苏省配置
const jiangsuConfig = JSON.parse(fs.readFileSync('./provinces/jiangsu.json', 'utf8'))

console.log('=== 案例5：江苏-淮安洪泽-男-1965-09（正式核定·延迟3个月·新老办法并存） ===')
console.log('数据来源：用户2026-06-09提供·官方核定表（淮安洪泽）')
console.log('')

const testCase5 = {
  birthYear: 1965,
  birthMonth: 9,
  workYear: 1982,
  workMonth: 9,
  retireYear: 2025,
  retireMonth: 12,
  personType: 'male',
  totalYears: 43.33,      // 43年4个月（累计缴费年限）
  sightYears: 13.33,    // 13年4个月（1982-09到1996-01）
  avgIndex: 0.4787,       // 基础养老金平均缴费工资指数
  personalAcc: 87722.18,  // 个人账户储存额（官方核定表）
  baseRetire: 8917,        // 计发基数（官方核定表）
  baseProv: 8917,
  months: 137.3,          // 60岁3个月退休，计发月数137.3
  // ⚠️ 江苏省特殊参数
  transIndex: 0.9107,     // 过渡性养老金平均缴费工资指数（官方核定表）
  pre1996Years: 13.33,   // 参与过渡性养老金计算的缴费年限（13年4个月）
  transPensionOld: 479.5, // 原办法过渡性养老金（备注中说明）
}

const result5 = calculate(jiangsuConfig, testCase5)

console.log('【基础养老金】')
console.log('  引擎：', result5.legal.basicPension.amount, '元')
console.log('  官方：', 2856.87, '元')
console.log('  差异：', (result5.legal.basicPension.amount - 2856.87).toFixed(2), '元')

console.log('【个人账户养老金】')
console.log('  引擎：', result5.legal.personalAccount.amount, '元')
console.log('  官方：', 638.91, '元')
console.log('  差异：', (result5.legal.personalAccount.amount - 638.91).toFixed(2), '元')

console.log('【过渡性养老金】')
console.log('  引擎：', result5.legal.transitionalPension.amount, '元')
console.log('  官方：', 1053.5, '元（新办法），479.5元（原办法），取高值1053.5元')
console.log('  差异：', (result5.legal.transitionalPension.amount - 1053.5).toFixed(2), '元')

console.log('【合计】')
console.log('  引擎：', result5.legal.total, '元')
console.log('  官方：', 4549.3, '元')
console.log('  差异：', (result5.legal.total - 4549.3).toFixed(2), '元')

const diff5 = Math.abs(result5.legal.total - 4549.3)
if (diff5 <= 1.0) {
  console.log('')
  console.log('✅ 案例5通过！（差异', diff5.toFixed(2), '元）')
} else {
  console.log('')
  console.log('❌ 案例5失败！（差异', diff5.toFixed(2), '元）')
  console.log('')
  console.log('【调试信息】')
  console.log('  基础养老金：', result5.legal.basicPension.description)
  console.log('  个人账户养老金：', result5.legal.personalAccount.description)
  console.log('  过渡性养老金：', result5.legal.transitionalPension.description)
}
