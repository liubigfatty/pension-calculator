// 完整测试江苏省5个案例 - 用正确的官方数据
const { calculate } = require('./engine/pension-engine.js')
const fs = require('fs')

// 读取江苏省配置
const jiangsuConfig = JSON.parse(fs.readFileSync('./provinces/jiangsu.json', 'utf8'))

let passCount = 0
let failCount = 0

// ============ 案例1：江苏-女-1974-01（无视同·50岁退休） ============
console.log('=== 案例1：江苏-女-1974-01（正式核定·无视同缴费·50岁退休） ===')
console.log('数据来源：用户2026-06-09提供·官方核定表')
console.log('')

const testCase1 = {
  birthYear: 1974,
  birthMonth: 1,
  workYear: 1998,
  workMonth: 7,
  retireYear: 2024,
  retireMonth: 1,
  personType: 'fw',
  totalYears: 25.33,      // 25年4个月
  avgIndex: 1.2762,
  personalAcc: 190912.85,
  baseRetire: 8613,
  baseProv: 8613,
  months: 195,
  sightYears: 0,
}

const result1 = calculate(jiangsuConfig, testCase1)

console.log('【基础养老金】引擎：', result1.legal.basicPension.amount, '元，官方：', 2483.29, '元，差异：', (result1.legal.basicPension.amount - 2483.29).toFixed(2), '元')
console.log('【个人账户养老金】引擎：', result1.legal.personalAccount.amount, '元，官方：', 979.04, '元，差异：', (result1.legal.personalAccount.amount - 979.04).toFixed(2), '元')
console.log('【过渡性养老金】引擎：', result1.legal.transitionalPension.amount, '元，官方：', 0, '元，差异：', (result1.legal.transitionalPension.amount - 0).toFixed(2), '元')
console.log('【合计】引擎：', result1.legal.total, '元，官方：', 3462.40, '元，差异：', (result1.legal.total - 3462.40).toFixed(2), '元')

const diff1 = Math.abs(result1.legal.total - 3462.40)
if (diff1 <= 1.0) { console.log('✅ 案例1通过！（差异', diff1.toFixed(2), '元）'); passCount++ }
else { console.log('❌ 案例1失败！（差异', diff1.toFixed(2), '元）'); failCount++ }

console.log(''); console.log('='.repeat(80)); console.log('')

// ============ 案例2：江苏-男-1964-03（有视同·60岁退休） ============
console.log('=== 案例2：江苏-男-1964-03（淮安·正式核定·有视同缴费·60岁退休） ===')
console.log('数据来源：用户2026-06-09提供·官方核定表')
console.log('')

const testCase2 = {
  birthYear: 1964,
  birthMonth: 3,
  workYear: 1981,
  workMonth: 3,
  retireYear: 2024,
  retireMonth: 3,
  personType: 'male',
  totalYears: 43.08,      // 43年1个月（官方核定表）
  sightYears: 14.83,    // 14年10个月（1981-03到1996-01）
  avgIndex: 0.3246,
  transIndex: 0.8634,     // 官方核定表：过渡性养老金平均缴费工资指数
  pre1996Years: 14.83,    // 官方核定表：14年10个月
  transPensionOld: 479.83, // 备注：按原办法计算的过渡性养老金
  personalAcc: 67874.03,  // 官方核定表：个人账户储存额
  baseRetire: 8613,
  baseProv: 8613,
  months: 139,
}

const result2 = calculate(jiangsuConfig, testCase2)

console.log('【基础养老金】引擎：', result2.legal.basicPension.amount, '元，官方：', 2457.64, '元，差异：', (result2.legal.basicPension.amount - 2457.64).toFixed(2), '元')
console.log('【个人账户养老金】引擎：', result2.legal.personalAccount.amount, '元，官方：', 488.30, '元，差异：', (result2.legal.personalAccount.amount - 488.30).toFixed(2), '元')
console.log('【过渡性养老金】引擎：', result2.legal.transitionalPension.amount, '元，官方：', 817.43, '元，差异：', (result2.legal.transitionalPension.amount - 817.43).toFixed(2), '元')
console.log('【合计】引擎：', result2.legal.total, '元，官方：', 3763.40, '元，差异：', (result2.legal.total - 3763.40).toFixed(2), '元')

const diff2 = Math.abs(result2.legal.total - 3763.40)
if (diff2 <= 1.0) { console.log('✅ 案例2通过！（差异', diff2.toFixed(2), '元）'); passCount++ }
else { console.log('❌ 案例2失败！（差异', diff2.toFixed(2), '元）'); console.log('  调试：', result2.legal.transitionalPension.description); failCount++ }

console.log(''); console.log('='.repeat(80)); console.log('')

// ============ 案例3：江苏-张家港-女-1974-01（无视同·低指数·50岁退休） ============
console.log('=== 案例3：江苏-张家港-女-1974-01（正式核定·无视同缴费·低指数·50岁退休） ===')
console.log('数据来源：用户2026-06-09提供·官方核定表（张家港）')
console.log('')

const testCase3 = {
  birthYear: 1974,
  birthMonth: 1,
  workYear: 1997,
  workMonth: 5,
  retireYear: 2024,
  retireMonth: 1,
  personType: 'fw',
  totalYears: 26.75,      // 26年9个月
  avgIndex: 0.6100,
  personalAcc: 88596.22,
  baseRetire: 8615,
  baseProv: 8615,
  months: 195,
  sightYears: 0,
}

const result3 = calculate(jiangsuConfig, testCase3)

console.log('【基础养老金】引擎：', result3.legal.basicPension.amount, '元，官方：', 1854.7, '元，差异：', (result3.legal.basicPension.amount - 1854.7).toFixed(2), '元')
console.log('【个人账户养老金】引擎：', result3.legal.personalAccount.amount, '元，官方：', 454.34, '元，差异：', (result3.legal.personalAccount.amount - 454.34).toFixed(2), '元')
console.log('【过渡性养老金】引擎：', result3.legal.transitionalPension.amount, '元，官方：', 0, '元，差异：', (result3.legal.transitionalPension.amount - 0).toFixed(2), '元')
console.log('【合计】引擎：', result3.legal.total, '元，官方：', 2309.1, '元，差异：', (result3.legal.total - 2309.1).toFixed(2), '元')

const diff3 = Math.abs(result3.legal.total - 2309.1)
if (diff3 <= 1.0) { console.log('✅ 案例3通过！（差异', diff3.toFixed(2), '元）'); passCount++ }
else { console.log('❌ 案例3失败！（差异', diff3.toFixed(2), '元）'); failCount++ }

console.log(''); console.log('='.repeat(80)); console.log('')

// ============ 案例4：江苏-南京-女-1976-01（有过渡性·指数分段） ============
console.log('=== 案例4：江苏-南京-女-1976-01（正式核定·有过渡性·指数分段·50岁退休） ===')
console.log('数据来源：用户2026-06-09提供·官方核定表（南京江宁）')
console.log('')

const testCase4 = {
  birthYear: 1976,
  birthMonth: 1,
  workYear: 1995,
  workMonth: 9,
  retireYear: 2026,
  retireMonth: 1,
  personType: 'fw',
  totalYears: 30,
  sightYears: 0.33,      // 0年4个月
  avgIndex: 0.8608,
  personalAcc: 57722.76,
  baseRetire: 8917,
  baseProv: 8917,
  months: 195,
  // ⚠️ 江苏省特殊参数
  transIndex: 1.0,
  pre1996Years: 19.0833, // 19年1个月
}

const result4 = calculate(jiangsuConfig, testCase4)

console.log('【基础养老金】引擎：', result4.legal.basicPension.amount, '元，官方：', 2488.91, '元，差异：', (result4.legal.basicPension.amount - 2488.91).toFixed(2), '元')
console.log('【个人账户养老金】引擎：', result4.legal.personalAccount.amount, '元，官方：', 296.01, '元，差异：', (result4.legal.personalAccount.amount - 296.01).toFixed(2), '元')
console.log('【过渡性养老金】引擎：', result4.legal.transitionalPension.amount, '元，官方：', 2042.01, '元，差异：', (result4.legal.transitionalPension.amount - 2042.01).toFixed(2), '元')
console.log('【合计】引擎：', result4.legal.total, '元，官方：', 4827, '元，差异：', (result4.legal.total - 4827).toFixed(2), '元')

const diff4 = Math.abs(result4.legal.total - 4827)
if (diff4 <= 1.0) { console.log('✅ 案例4通过！（差异', diff4.toFixed(2), '元）'); passCount++ }
else { console.log('❌ 案例4失败！（差异', diff4.toFixed(2), '元）'); console.log('  调试：', result4.legal.transitionalPension.description); failCount++ }

console.log(''); console.log('='.repeat(80)); console.log('')

// ============ 案例5：江苏-淮安洪泽-男-1965-09（延迟退休·新老办法） ============
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
  totalYears: 43.33,      // 43年4个月
  sightYears: 13.33,    // 13年4个月
  avgIndex: 0.4787,
  personalAcc: 87722.18,  // 修正为官方核定表数值
  baseRetire: 8917,        // 修正为官方核定表数值
  baseProv: 8917,
  months: 137.3,
  // ⚠️ 江苏省特殊参数
  transIndex: 0.9107,
  pre1996Years: 13.33,   // 13年4个月
  transPensionOld: 479.5, // 原办法过渡性养老金
}

const result5 = calculate(jiangsuConfig, testCase5)

console.log('【基础养老金】引擎：', result5.legal.basicPension.amount, '元，官方：', 2856.87, '元，差异：', (result5.legal.basicPension.amount - 2856.87).toFixed(2), '元')
console.log('【个人账户养老金】引擎：', result5.legal.personalAccount.amount, '元，官方：', 638.91, '元，差异：', (result5.legal.personalAccount.amount - 638.91).toFixed(2), '元')
console.log('【过渡性养老金】引擎：', result5.legal.transitionalPension.amount, '元，官方：', 1053.5, '元，差异：', (result5.legal.transitionalPension.amount - 1053.5).toFixed(2), '元')
console.log('【合计】引擎：', result5.legal.total, '元，官方：', 4549.3, '元，差异：', (result5.legal.total - 4549.3).toFixed(2), '元')

const diff5 = Math.abs(result5.legal.total - 4549.3)
if (diff5 <= 1.0) { console.log('✅ 案例5通过！（差异', diff5.toFixed(2), '元）'); passCount++ }
else { console.log('❌ 案例5失败！（差异', diff5.toFixed(2), '元）'); console.log('  调试：', result5.legal.transitionalPension.description); failCount++ }

console.log(''); console.log('='.repeat(80)); console.log('')

// ============ 总结 ============
console.log('=== 测试总结 ===')
console.log('通过：', passCount, '个')
console.log('失败：', failCount, '个')
console.log('总计：', passCount + failCount, '个')

if (failCount === 0) {
  console.log('')
  console.log('🎉 所有测试通过！江苏省引擎升级成功！')
} else {
  console.log('')
  console.log('⚠️ 有', failCount, '个测试失败，需要修复！')
}
