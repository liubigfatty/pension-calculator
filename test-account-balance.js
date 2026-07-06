/**
 * 测试：江西省，1998年参加工作，缴费指数1.0，个人账户余额估算
 * 案例数据：
 *   - 省份：江西
 *   - 参加工作：1998年
 *   - 实际缴费年限：27.58年
 *   - 缴费指数：1.0
 *   - 用户说个人账户余额：318353元（觉得不对）
 * 
 * 目的：检查 calcPersonalAccountPension 的估算逻辑是否正确
 */

const engine = require('./engine/pension-engine')
const jiangxi = require('./data/provinces/jiangxi')

// 模拟输入：江西企业女，1998年工作，2025年退休
const inputData = {
  birthYear: '1975',       // 1975年出生，2025年退休时50岁
  birthMonth: '1',
  workYear: '1998',
  workMonth: '1',
  avgIndex: '1.0',
  personalAcc: null,        // 不输入，让引擎估算
  gender: 'female',
  identity: 'enterprise',
  genderType: 'ent55',     // 企业女干部/管理岗 55岁退休
  retirePlan: 'normal'
}

console.log('===== 测试案例：江西企业女 =====')
console.log('出生：' + inputData.birthYear + '-' + inputData.birthMonth)
console.log('工作：' + inputData.workYear + '-' + inputData.workMonth)
console.log('缴费指数：' + inputData.avgIndex)
console.log('')

try {
  const result = engine.calculate(jiangxi, inputData)
  
  console.log('===== 计算结果 =====')
  console.log('法定退休总养老金：' + result.legal.total + '元')
  console.log('个人账户养老金：' + result.legal.personalAccount.amount + '元/月')
  console.log('个人账户余额：' + result.legal.personalAccBalance + '元')
  console.log('个人账户说明：' + result.legal.personalAccount.description)
  console.log('')
  console.log('===== 缴费年限 =====')
  console.log('实际缴费：' + result.legal.actualYears + '年')
  console.log('视同缴费：' + result.legal.sightYears + '年')
  console.log('累计缴费：' + result.legal.totalYears + '年')
  console.log('')
  console.log('===== 各分项 =====')
  console.log('基础养老金：' + result.legal.basicPension.amount + '元')
  console.log('过渡性养老金：' + result.legal.transitionalPension.amount + '元')
  console.log('个人账户养老金：' + result.legal.personalAccount.amount + '元')
  
} catch (e) {
  console.error('计算失败：', e.message)
  console.error(e.stack)
}
