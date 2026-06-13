// 测试脚本：验证江苏省引擎升级（修正版）
// 用法：node test_jiangsu.js

const fs = require('fs')
const path = require('path')

// 读取引擎
const engineCode = fs.readFileSync(
  path.join(__dirname, 'engine/pension-engine.js'),
  'utf8'
)

// 执行引擎代码（获取 calculate 函数）
const engineFn = new Function('require', 'module', 'exports', 'fs', 'path', engineCode)
const moduleObj = { exports: {} }
engineFn(require, moduleObj, moduleObj.exports, fs, path)
const { calculate } = moduleObj.exports

// 读取江苏省配置
const jiangsuConfig = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, 'provinces/jiangsu.json'),
    'utf8'
  )
)

// 测试用例4：江苏南京江宁，女，1976-01出生，1995-09工作，2026-01退休
const testCase4 = {
  province: 'jiangsu',
  birthYear: 1976,
  birthMonth: 1,
  workYear: 1995,
  workMonth: 9,
  retireYear: 2026,
  retireMonth: 1,
  personalAcc: 57722.76,  // 修正：官方个人账户储存额
  totalYears: 30,
  sightYears: 0.33,  // 1995年底前约4个月（视同缴费年限）
  avgIndex: 0.8608,
  baseRetire: 8917,  // 2025年计发基数（官方核定表显示）
  baseProv: 8917,
  // 江苏特殊参数（修正）
  transIndex: 1.0,  // 修正：1996年底前平均缴费工资指数（官方表显示1.0000）
  pre1996Years: 19.0833,  // 修正：1996年底前缴费年限（约19年1个月）
  gender: 'female',
  retirementAge: 50,
  months: 195  // 50岁退休，计发月数195个月
}

console.log('===== 测试用例4：江苏南京江宁，女，2026-01退休 =====')
console.log('输入参数：', JSON.stringify(testCase4, null, 2))
console.log('\n计算过程：')

try {
  const result = calculate(jiangsuConfig, testCase4)
  
  const basePension = result.legal.basicPension.amount
  const personalPension = result.legal.personalAccount.amount
  const transPension = result.legal.transitionalPension.amount
  const total = result.legal.total
  
  console.log('\n计算结果：')
  console.log('- 基础养老金：', basePension.toFixed(2), '元')
  console.log('- 个人账户养老金：', personalPension.toFixed(2), '元')
  console.log('- 过渡性养老金：', transPension.toFixed(2), '元')
  console.log('- 合计：', total.toFixed(2), '元')
  
  console.log('\n官方核定表数据：')
  console.log('- 基础养老金：2488.91元')
  console.log('- 个人账户养老金：296.01元')
  console.log('- 过渡性养老金：2042.01元')
  console.log('- 合计：4827元')
  
  const diff1 = Math.abs(basePension - 2488.91)
  const diff2 = Math.abs(personalPension - 296.01)
  const diff3 = Math.abs(transPension - 2042.01)
  const diff4 = Math.abs(total - 4827)
  
  console.log('\n差异分析：')
  console.log('- 基础养老金差异：', diff1.toFixed(2), '元')
  console.log('- 个人账户养老金差异：', diff2.toFixed(2), '元')
  console.log('- 过渡性养老金差异：', diff3.toFixed(2), '元')
  console.log('- 总差异：', diff4.toFixed(2), '元')
  
  if (diff1 < 1 && diff2 < 1 && diff3 < 1 && diff4 < 1) {
    console.log('\n✅ 测试通过！')
  } else {
    console.log('\n⚠️ 存在差异，需要检查')
  }
} catch (err) {
  console.error('❌ 计算错误：', err.message)
  console.error(err.stack)
}

console.log('\n')

// 测试用例1：江苏张家港，女，1974-01出生，1997-05工作，2024-01退休
// 需要确认正确的计发基数
const testCase1 = {
  province: 'jiangsu',
  birthYear: 1974,
  birthMonth: 1,
  workYear: 1997,
  workMonth: 5,
  retireYear: 2024,
  retireMonth: 1,
  personalAcc: 65600,
  totalYears: 26.75,
  sightYears: 0,
  avgIndex: 0.6100,
  // 尝试不同的计发基数
  baseRetire: 8615,  // 猜测值（需要确认）
  baseProv: 8615,
  // 江苏特殊参数
  transIndex: 0.6100,
  pre1996Years: 0,  // 1997年工作，无1996年底前缴费年限
  gender: 'female',
  retirementAge: 50,
  months: 195  // 50岁退休
}

console.log('===== 测试用例1：江苏张家港，女，2024-01退休（基数待确认） =====')
console.log('输入参数：', JSON.stringify(testCase1, null, 2))
console.log('\n计算过程：')

try {
  const result = calculate(jiangsuConfig, testCase1)
  
  const basePension = result.legal.basicPension.amount
  const personalPension = result.legal.personalAccount.amount
  const transPension = result.legal.transitionalPension.amount
  const total = result.legal.total
  
  console.log('\n计算结果（使用基数8615）：')
  console.log('- 基础养老金：', basePension.toFixed(2), '元')
  console.log('- 个人账户养老金：', personalPension.toFixed(2), '元')
  console.log('- 过渡性养老金：', transPension.toFixed(2), '元')
  console.log('- 合计：', total.toFixed(2), '元')
  
  console.log('\n官方核定表数据：')
  console.log('- 基础养老金：1854.7元')
  console.log('- 个人账户养老金：454.34元')
  console.log('- 过渡性养老金：0元')
  console.log('- 合计：2309.1元')
  
  const diff1 = Math.abs(basePension - 1854.7)
  const diff2 = Math.abs(personalPension - 454.34)
  const diff3 = Math.abs(total - 2309.1)
  
  console.log('\n差异分析：')
  console.log('- 基础养老金差异：', diff1.toFixed(2), '元')
  console.log('- 个人账户养老金差异：', diff2.toFixed(2), '元')
  console.log('- 总差异：', diff3.toFixed(2), '元')
  
  if (diff1 < 1 && diff2 < 1 && diff3 < 1) {
    console.log('\n✅ 测试通过！（基数8615正确）')
  } else {
    console.log('\n⚠️ 基数可能不对，需要确认2024-01退休使用的计发基数')
  }
} catch (err) {
  console.error('❌ 计算错误：', err.message)
  console.error(err.stack)
}

console.log('\n')
console.log('===== 测试完成 =====')
console.log('\n💡 需要确认：')
console.log('1. 测试用例1（张家港）2024-01退休使用的计发基数是多少？')
console.log('   官方基础养老金=1854.7元，反推基数约为8615元')
console.log('   可能是2023年公布的2022年度平均工资？')
