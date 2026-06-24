// reverse-calc.js
// 反向推算：如果要积累31.8万，每年需要缴多少？

function reverseCalc(targetBalance, years, avgInterestRate) {
  // 用年金公式反向推算每年缴费额
  // FV = PMT × [((1+r)^n - 1) / r]
  // PMT = FV / [((1+r)^n - 1) / r]
  
  const r = avgInterestRate
  const n = years
  const pmt = targetBalance / (((1 + r) ** n - 1) / r)
  
  console.log(`=== 反向推算 ===`)
  console.log(`目标余额: ${targetBalance} 元`)
  console.log(`缴费年限: ${n} 年`)
  console.log(`平均记账利率: ${(r * 100).toFixed(2)}%`)
  console.log(`年均缴费额（不含利息）: ${pmt.toFixed(2)} 元`)
  console.log(`月均缴费额: ${(pmt / 12).toFixed(2)} 元`)
  console.log('')
  
  // 反推平均缴费基数
  // 月缴费额 = 缴费基数 × 8%
  // 缴费基数 = 月缴费额 / 8%
  const avgMonthlyPay = pmt / 12
  const avgBase = avgMonthlyPay / 0.08
  console.log(`反推平均缴费基数: ${avgBase.toFixed(2)} 元/月`)
  console.log(`对应社平工资（指数1.0）: ${avgBase.toFixed(2)} 元/月`)
  console.log('')
  
  // 与江西历年社平对比
  console.log('江西历年社平工资（元/月）:')
  console.log('1998: 465, 2000: 584, 2005: 1141, 2010: 2364')
  console.log('2015: 4244, 2020: 5040, 2025: 7100')
  console.log(`反推平均值: ${avgBase.toFixed(2)} 元/月`)
  console.log('')
  
  if (avgBase > 7100) {
    console.log('⚠️ 反推基数高于2025年社平，说明:')
    console.log('  1. 实际缴费指数可能 > 1.0')
    console.log('  2. 或者记账利率高于我用的估值')
    console.log('  3. 或者社平工资数据不对')
  }
}

// 用6%平均利率估算
reverseCalc(318353, 27.58, 0.06)

console.log('')
console.log('=== 敏感性分析 ===')
console.log('如果记账利率是以下值，年均缴费额是多少？')
;[0.04, 0.05, 0.06, 0.07, 0.08].forEach(rate => {
  const r = rate
  const n = 27.58
  const pmt = 318353 / (((1 + r) ** n - 1) / r)
  console.log(`利率${(rate*100).toFixed(0)}%: 年均缴费 ${pmt.toFixed(0)} 元/年, 月均 ${(pmt/12).toFixed(0)} 元/月`)
})
