/**
 * 验证：修正后的记账利率应用逻辑是否正确
 * 手动算两年（1998、1999），对比引擎计算结果
 */

const engine = require('./engine/pension-engine')
const jiangxi = require('./data/provinces/jiangxi')

console.log('===== 验证：记账利率应用逻辑 =====')
console.log('')

// 案例：江西，1998年1月开始缴费，指数1.0
const avgIndex = 1.0
const accStart = { year: 1998, month: 1 }

// ===== 第一年（1998年）=====
console.log('[第一年] 1998年')
const base1998 = engine.getBase('prov', 1998, jiangxi)  // 元/月
const monthPay1998 = base1998 * avgIndex * 0.08     // 月缴费额（元/月）
const firstMonths = 12 - accStart.month + 1            // 12个月（1月到12月）
const pay1998 = monthPay1998 * firstMonths           // 1998年缴费总额
const rate1998 = engine.getAccRate(1998, jiangxi)    // 记账利率

console.log('  社平工资（月）：' + base1998 + '元')
console.log('  月缴费额（8%）：' + monthPay1998.toFixed(2) + '元')
console.log('  首年缴费总额（12个月）：' + pay1998.toFixed(2) + '元')
console.log('  记账利率：' + (rate1998 * 100).toFixed(2) + '%')
console.log('')

// 第一甲不足一年，按单利计息
const total1998 = pay1998 * (1 + rate1998 * firstMonths / 12)
console.log('  第一年末累计（单利）：' + total1998.toFixed(2) + '元')
console.log('')

// ===== 第二年（1999年）=====
console.log('[第二年] 1999年')
const base1999 = engine.getBase('prov', 1999, jiangxi)
const annualPay1999 = base1999 * avgIndex * 0.08 * 12  // 年缴费额
const rate1999 = engine.getAccRate(1999, jiangxi)

console.log('  社平工资（月）：' + base1999 + '元')
console.log('  年缴费额：' + annualPay1999.toFixed(2) + '元')
console.log('  记账利率：' + (rate1999 * 100).toFixed(2) + '%')
console.log('')

// 正确逻辑：上年累计 × (1 + 利率) + 本年缴费额
const total1999_correct = total1998 * (1 + rate1999) + annualPay1999
console.log('  第二年末累计（正确）：' + total1999_correct.toFixed(2) + '元')

// 错误逻辑： (上年累计 + 本年缴费额) × (1 + 利率)
const total1999_wrong = (total1998 + annualPay1999) * (1 + rate1999)
console.log('  第二年末累计（错误）：' + total1999_wrong.toFixed(2) + '元')
console.log('  差异：' + (total1999_wrong - total1999_correct).toFixed(2) + '元')
console.log('')

// ===== 调用引擎，看实际计算 =====
console.log('===== 引擎计算（前5年）=====')
const inputData = {
  birthYear: 1975,
  birthMonth: 1,
  workYear: 1998,
  workMonth: 1,
  avgIndex: '1.0',
  personalAcc: null,
  gender: 'female',
  identity: 'enterprise',
  genderType: 'ent55',
  retirePlan: 'normal'
}

try {
  const result = engine.calculate(jiangxi, inputData)
  console.log('引擎计算的个人账户余额：' + result.legal.personalAccBalance + '元')
  console.log('说明：' + result.legal.personalAccount.description)
} catch (e) {
  console.error('计算失败：', e.message)
}
