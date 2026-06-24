/**
 * 测试江西案例：1998年7月工作，2026年2月退休，指数1.0
 * 目的：验证记账利率和缴费基数是否正确
 */
const engine = require('./engine/pension-engine.js')
const provinces = require('./provinces')

const config = provinces['jiangxi']

const inputData = {
  city: 'prov',
  genderType: 'enterpriseFemale',  // 企业女职工50岁退休
  birthDate: { year: 1976, month: 2 },
  workDate: { year: 1998, month: 7 },
  retireDate: { year: 2026, month: 2 },
  avgIndex: 1.0,
  actualYears: 27.58,
  totalYears: 27.58,
  personalAccInput: null,  // 不输入余额，让引擎估算
}

console.log('=== 江西案例测试 ===')
console.log('工作日期: 1998.07')
console.log('退休日期: 2026.02')
console.log('平均缴费指数: 1.0')
console.log('实际缴费年限: 27.58年')
console.log('')

// 调用引擎计算
const result = engine.calculate(config, inputData)

console.log('计算结果:')
console.log('- 个人账户余额:', result.personalAccount.balance.toLocaleString(), '元')
console.log('- 个人账户养老金:', result.personalAccount.amount.toFixed(2), '元/月')
console.log('- 计发月数:', result.personalAccount.months)
console.log('')
console.log('详细描述:')
console.log(result.personalAccount.description)
