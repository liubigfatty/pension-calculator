/**
 * 详细打印：江西案例的个人账户余额计算过程
 * 目的：检查是否有计算错误
 */

const engine = require('./engine/pension-engine')
const jiangxi = require('./data/provinces/jiangxi')

// 直接调用 calcPersonalAccountPension，并打印每年计算过程
// 为了做到这一点，需要把 calcPersonalAccountPension 里的逻辑拿出来单跑

// ===== 1. 准备参数 =====
const inputData = {
  birthYear: 1975,
  birthMonth: 1,
  workYear: 1998,
  workMonth: 1,
  avgIndex: 1.0,
  personalAcc: null,   // 让引擎估算
  gender: 'female',
  identity: 'enterprise',
  genderType: 'ent55',
  retirePlan: 'normal'
}

console.log('===== 参数 =====')
console.log('出生：' + inputData.birthYear + '-' + inputData.birthMonth)
console.log('工作：' + inputData.workYear + '-' + inputData.workMonth)
console.log('缴费指数：' + inputData.avgIndex)
console.log('')

// ===== 2. 调用引擎，看完整结果 =====
try {
  const result = engine.calculate(jiangxi, inputData)
  
  console.log('===== 计算结果 =====')
  console.log('总养老金：' + result.legal.total + '元/月')
  console.log('个人账户养老金：' + result.legal.personalAccount.amount + '元/月')
  console.log('个人账户余额：' + result.legal.personalAccBalance + '元')
  console.log('')
  
  // 手动重新计算一遍，打印每年过程
  console.log('===== 手动计算一遍（对照）=====')
  
  const retireDate = { year: 2030, month: 1 }  // 1975年出生，55岁退休 = 2030年
  const accStart = { year: 1998, month: 1 }  // 江西1998年建账
  
  let totalAcc = 0
  let fYear = accStart.year
  let fMonth = accStart.month
  
  // 第一年（1998年，可能只有部分月份）
  let firstMonths = 12 - fMonth + 1  // 1998年1月开始，全年12个月
  console.log('[第一年] ' + fYear + '年，缴费' + firstMonths + '个月')
  
  const baseY = engine.getBase('prov', fYear, jiangxi)  // 应该是元/月
  const monthPayY = baseY * inputData.avgIndex * 0.08
  const accRateY = engine.getAccRate(fYear, jiangxi)
  
  console.log('  缴费基数（月）：' + baseY + '元/月')
  console.log('  月缴费额（8%）：' + monthPayY.toFixed(2) + '元/月')
  console.log('  首年缴费总额：' + (monthPayY * firstMonths).toFixed(2) + '元')
  console.log('  记账利率：' + (accRateY * 100).toFixed(2) + '%')
  
  totalAcc = (totalAcc + monthPayY * firstMonths) * (1 + accRateY)
  console.log('  年末累计：' + totalAcc.toFixed(2) + '元')
  console.log('')
  
  // 中间年份（1999-2029）
  console.log('[中间年份] 1999-2029年（示例打印几年）')
  for (let y = fYear + 1; y < retireDate.year; y++) {
    const baseYear = engine.getBase('prov', y, jiangxi)
    const annualPay = baseYear * inputData.avgIndex * 0.08 * 12
    const accRate = engine.getAccRate(y, jiangxi)
    
    const prevTotal = totalAcc
    totalAcc = (totalAcc + annualPay) * (1 + accRate)
    
    // 只打印几年，避免输出太多
    if (y % 5 === 0 || y === 2024) {
      console.log('  ' + y + '年：')
      console.log('    社平（月）：' + baseYear + '元')
      console.log('    年缴费额：' + annualPay.toFixed(2) + '元')
      console.log('    记账利率：' + (accRate * 100).toFixed(2) + '%')
      console.log('    年末累计：' + totalAcc.toFixed(2) + '元')
    }
  }
  console.log('')
  
  // 最后一年（2030年，退休前）
  const lastMonths = retireDate.month - 1  // 0个月（1月退休，不需要缴）
  console.log('[最后一年] ' + retireDate.year + '年，缴费' + lastMonths + '个月')
  
  if (lastMonths > 0) {
    const baseRetire = engine.getBase('prov', retireDate.year, jiangxi)
    const monthPay = baseRetire * inputData.avgIndex * 0.08
    const rate = engine.getAccRate(retireDate.year, jiangxi)
    totalAcc = (totalAcc + monthPay * lastMonths) * Math.pow(1 + rate, lastMonths / 12)
  }
  
  console.log('退休时个人账户累计：' + totalAcc.toFixed(2) + '元')
  console.log('')
  console.log('===== 对比 =====')
  console.log('手动计算：' + totalAcc.toFixed(2) + '元')
  console.log('引擎计算：' + result.legal.personalAccBalance + '元')
  
} catch (e) {
  console.error('计算失败：', e.message)
  console.error(e.stack)
}
