// 测试江苏省引擎升级 - 用正确的官方数据
const { calculate } = require('./engine/pension-engine.js')
const fs = require('fs')

// 读取江苏省配置
const jiangsuConfig = JSON.parse(fs.readFileSync('./provinces/jiangsu.json', 'utf8'))

// 测试用例1：江苏-女-1974-01（正式核定·无视同缴费·50岁退休）
// 数据来源：用户2026-06-09提供·官方核定表
const testCase1 = {
  birthYear: 1974,
  birthMonth: 1,
  workYear: 1998,
  workMonth: 7,
  retireYear: 2024,
  retireMonth: 1,
  personType: 'fw',        // 女职工50岁退休
  totalYears: 25.33,      // 25年4个月
  avgIndex: 1.2762,       // 平均缴费工资指数
  personalAcc: 190912.85, // 个人账户储存额（官方核定表）
  baseRetire: 8613,        // 计发基数（官方核定表）
  baseProv: 8613,
  months: 195,             // 50岁退休，计发月数195个月
  sightYears: 0,           // 1998年工作，无视同缴费
  // 无过渡性养老金（1996年后工作）
}

console.log('=== 测试用例1：江苏-女-1974-01（正式核定·50岁退休） ===')
console.log('数据来源：用户2026-06-09提供·官方核定表')
console.log('')

const result1 = calculate(jiangsuConfig, testCase1)

console.log('【基础养老金】')
console.log('  引擎计算：', result1.legal.basicPension.amount, '元')
console.log('  官方核定表：', 2483.29, '元')
console.log('  差异：', (result1.legal.basicPension.amount - 2483.29).toFixed(2), '元')

console.log('')
console.log('【个人账户养老金】')
console.log('  引擎计算：', result1.legal.personalAccount.amount, '元')
console.log('  官方核定表：', 979.04, '元')
console.log('  差异：', (result1.legal.personalAccount.amount - 979.04).toFixed(2), '元')

console.log('')
console.log('【过渡性养老金】')
console.log('  引擎计算：', result1.legal.transitionalPension.amount, '元')
console.log('  官方核定表：', 0, '元（1998年工作，无视同缴费）')
console.log('  差异：', (result1.legal.transitionalPension.amount - 0).toFixed(2), '元')

console.log('')
console.log('【合计】')
console.log('  引擎计算：', result1.legal.total, '元')
console.log('  官方核定表：', 3462.40, '元')
console.log('  差异：', (result1.legal.total - 3462.40).toFixed(2), '元')

console.log('')
console.log('=== 验证结果 ===')
const tolerance = 1.0  // 1元容忍度
const diff1 = Math.abs(result1.legal.total - 3462.40)
if (diff1 <= tolerance) {
  console.log('✅ 测试用例1通过！（差异', diff1.toFixed(2), '元，在容忍范围内）')
} else {
  console.log('❌ 测试用例1失败！（差异', diff1.toFixed(2), '元）')
  console.log('')
  console.log('【调试信息】')
  console.log('  基础养老金计算：', result1.legal.basicPension.description)
  console.log('  个人账户养老金计算：', result1.legal.personalAccount.description)
  console.log('  过渡性养老金计算：', result1.legal.transitionalPension.description)
}
