// test-jiangxi-case.js
// 江西企业女职工案例详细验算
// 出生: 1976-02, 工作: 1998-07, 指数: 1.0
// 目标: 看27.58年后个人账户能否到31.8万

const engine = require('./engine/pension-engine.js')

// 江西历年社平工资（元/年 → 转换为元/月）
// 数据来源: data/provinces/jiangxi.js
const jiangxiSalary = {
  1998: 5575 / 12,   // 约465元/月
  1999: 6069 / 12,   // 约506元/月
  2000: 7012 / 12,   // 约584元/月
  2001: 8026 / 12,   // 约669元/月
  2002: 9260 / 12,   // 约772元/月
  2003: 10521 / 12,  // 约877元/月
  2004: 11854 / 12,  // 约988元/月
  2005: 13688 / 12,  // 约1141元/月
  2006: 15590 / 12,  // 约1299元/月
  2007: 18400 / 12,  // 约1533元/月
  2008: 21000 / 12,  // 约1750元/月
  2009: 23720 / 12,  // 约1977元/月
  2010: 28363 / 12,  // 约2364元/月
  2011: 33239 / 12,  // 约2770元/月
  2012: 37696 / 12,  // 约3141元/月
  2013: 41775 / 12,  // 约3481元/月
  2014: 45842 / 12,  // 约3820元/月
  2015: 50932 / 12,  // 约4244元/月
  2016: 56136 / 12,  // 约4678元/月
  2017: 58962 / 12,  // 约4914元/月
  2018: 62820 / 12,  // 约5235元/月
  2019: 68420 / 12,  // 约5702元/月
  2020: 5040,        // 2020年开始用全口径，5040元/月
  2021: 5548,        // 元/月
  2022: 6091,        // 元/月
  2023: 6489,        // 元/月
  2024: 6738,        // 元/月
  2025: 7100,         // 元/月，预估
}

// 全国记账利率（2016年前用分段估算，2016年后逐年）
const interestRates = {
  1996: 0.0804,
  1997: 0.0707,
  1998: 0.0572,
  1999: 0.0489,
  2000: 0.0425,
  2001: 0.0476,
  2002: 0.0430,
  2003: 0.0198,
  2004: 0.0198,
  2005: 0.0255,
  2006: 0.0366,
  2007: 0.0405,
  2008: 0.0560,
  2009: 0.0455,
  2010: 0.0425,
  2011: 0.0465,
  2012: 0.0480,
  2013: 0.0490,
  2014: 0.0540,
  2015: 0.0525,
  2016: 0.0831,
  2017: 0.0709,
  2018: 0.0829,
  2019: 0.0761,
  2020: 0.0656,
  2021: 0.0535,
  2022: 0.0335,
  2023: 0.0258,
  2024: 0.0192,
  2025: 0.0150,
}

function calcAccountBalance() {
  const avgIndex = 1.0
  let totalAcc = 0
  let totalPay = 0  // 总缴费额（不含利息）
  
  console.log('=== 江西案例个人账户余额逐年计算 ===')
  console.log('工作开始: 1998-07, 指数: 1.0, 个人缴费比例: 8%')
  console.log('')
  
  // 1998年：7月-12月，6个月
  console.log('--- 1998年（7-12月，6个月）---')
  const base1998 = jiangxiSalary[1998]
  const monthPay1998 = base1998 * avgIndex * 0.08
  const pay1998 = monthPay1998 * 6
  totalPay += pay1998
  
  const rate1998 = interestRates[1998]
  totalAcc = (totalAcc + pay1998) * (1 + rate1998)
  
  console.log(`社平工资: ${base1998.toFixed(1)} 元/月`)
  console.log(`月缴费额: ${monthPay1998.toFixed(1)} 元`)
  console.log(`年缴费额: ${pay1998.toFixed(1)} 元`)
  console.log(`记账利率: ${(rate1998 * 100).toFixed(2)}%`)
  console.log(`年末余额: ${totalAcc.toFixed(2)} 元`)
  console.log('')
  
  // 1999-2025年：完整年度
  for (let y = 1999; y <= 2025; y++) {
    const baseY = jiangxiSalary[y]
    if (!baseY) {
      console.log(`警告: ${y}年社平工资缺失`)
      continue
    }
    
    const annualPay = baseY * avgIndex * 0.08 * 12
    totalPay += annualPay
    
    const rate = interestRates[y]
    if (!rate) {
      console.log(`警告: ${y}年记账利率缺失`)
      continue
    }
    
    // 正确逻辑: 上年累计 × (1 + 利率) + 本年缴费额
    totalAcc = totalAcc * (1 + rate) + annualPay
    
    if (y % 5 === 0 || y === 2025) {
      console.log(`${y}年:`)
      console.log(`  社平工资: ${baseY.toFixed(1)} 元/月`)
      console.log(`  年缴费额: ${annualPay.toFixed(1)} 元`)
      console.log(`  记账利率: ${(rate * 100).toFixed(2)}%`)
      console.log(`  年末余额: ${totalAcc.toFixed(2)} 元`)
      console.log('')
    }
  }
  
  console.log('=== 计算结果 ===')
  console.log(`总缴费额（不含利息）: ${totalPay.toFixed(2)} 元`)
  console.log(`利息总额: ${(totalAcc - totalPay).toFixed(2)} 元`)
  console.log(`最终余额: ${totalAcc.toFixed(2)} 元`)
  console.log('')
  
  // 与实际值对比
  const actual = 318353
  console.log(`实际余额: ${actual} 元`)
  console.log(`差异: ${(totalAcc - actual).toFixed(2)} 元`)
  console.log(`差异比例: ${((totalAcc - actual) / actual * 100).toFixed(2)}%`)
  
  return totalAcc
}

calcAccountBalance()
