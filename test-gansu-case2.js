/**
 * 甘肃案例2测试 - 1965-10男，1988-07参工，2026-01退休
 * 特殊：建账时间2003-01，延迟退休3个月
 */

const { calculate } = require('./engine/pension-engine.js')
const fs = require('fs')

// 读取甘肃配置
const gansuConfig = JSON.parse(fs.readFileSync('./provinces/gansu.json', 'utf8'))

// 临时修改建账时间为2003-01（这个案例的特殊情况）
gansuConfig.account_start = { year: 2003, month: 1 }

// 测试输入
const testInput = {
  birthYear: 1965,
  birthMonth: 10,
  workYear: 1988,
  workMonth: 7,
  retireYear: 2026,
  retireMonth: 1,
  cityType: 'prov',
  sightYears: 14.42,
  totalYears: 37.5,
  personalAccInput: 314079.5,
  avgIndex: 2.5955,
  baseRetireInput: 7746,
  baseProvInput: 7746,
  months: 137.3,  // 核定表给出的计发月数（注意：引擎认 months 不是 monthsInput）
}

console.log('=== 甘肃案例2 引擎验证 ===')
console.log('案例信息：1965-10男，1988-07参工，2026-01退休')
console.log('建账时间：2003-01（特殊！）')
console.log('延迟退休：3个月（1965-10出生→2026-01退休）')
console.log('')

const result = calculate(gansuConfig, testInput)

// 输出法定退休结果
const legal = result.legal
console.log('引擎计算结果：')
console.log('  基础养老金:', legal.basicPension.amount)
console.log('  个人账户养老金:', legal.personalAccount.amount)
console.log('  过渡性养老金:', legal.transitionalPension.amount)
console.log('  调节金:', legal.adjustmentFund.amount)
console.log('  合计:', legal.total)
console.log('')

// 官方核定表数据
const official = {
  basePension: 5222.01,
  personalPension: 2287.54,
  transitionalPension: 3478.92,
  totalPension: 10988.47
}

console.log('官方核定表：')
console.log('  基础养老金:', official.basePension)
console.log('  个人账户养老金:', official.personalPension)
console.log('  过渡性养老金:', official.transitionalPension)
console.log('  调节金: 0（视同14.42<15）')
console.log('  合计:', official.totalPension)
console.log('')

// 对比
console.log('对比验证：')
const baseDiff = Math.abs(legal.basicPension.amount - official.basePension)
const personalDiff = Math.abs(legal.personalAccount.amount - official.personalPension)
const transDiff = Math.abs(legal.transitionalPension.amount - official.transitionalPension)
const totalDiff = Math.abs(legal.total - official.totalPension)

console.log('  基础养老金: 引擎=' + legal.basicPension.amount + ', 官方=' + official.basePension + ', 差=' + baseDiff.toFixed(2) + (baseDiff < 0.5 ? ' ✅' : ' ❌'))
console.log('  个人账户养老金: 引擎=' + legal.personalAccount.amount + ', 官方=' + official.personalPension + ', 差=' + personalDiff.toFixed(2) + (personalDiff < 0.5 ? ' ✅' : ' ❌'))
console.log('  过渡性养老金: 引擎=' + legal.transitionalPension.amount + ', 官方=' + official.transitionalPension + ', 差=' + transDiff.toFixed(2) + (transDiff < 0.5 ? ' ✅' : ' ❌'))
console.log('  合计: 引擎=' + legal.total + ', 官方=' + official.totalPension + ', 差=' + totalDiff.toFixed(2) + (totalDiff < 0.5 ? ' ✅' : ' ❌'))
console.log('')

if (baseDiff < 0.5 && personalDiff < 0.5 && transDiff < 0.5 && totalDiff < 0.5) {
  console.log('✅ 全部通过！')
} else {
  console.log('❌ 有差异，需要排查')
}
