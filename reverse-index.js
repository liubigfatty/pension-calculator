// reverse-index.js
// 反向推算：如果余额是31.8万，实际缴费指数是多少？

const PROV_BASE = {
  1998: 1945,
  1999: 2042,
  2000: 2144,
  2001: 2252,
  2002: 2364,
  2003: 2482,
  2004: 2607,
  2005: 2737,
  2006: 2874,
  2007: 3017,
  2008: 3168,
  2009: 3327,
  2010: 3493,
  2011: 3668,
  2012: 3851,
  2013: 4044,
  2014: 4246,
  2015: 4458,
  2016: 4681,
  2017: 4915,
  2018: 5161,
  2019: 5419,
  2020: 5690,
  2021: 5974,
  2022: 6273,
  2023: 6587,
  2024: 6916,
  2025: 7123,
}

const accRates = {
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

function calcWithIndex(avgIndex) {
  let totalAcc = 0
  
  // 1998年：7-12月
  const base1998 = PROV_BASE[1998]
  const pay1998 = base1998 * avgIndex * 0.08 * 6
  totalAcc = (totalAcc + pay1998) * (1 + accRates[1998])
  
  // 1999-2025年
  for (let y = 1999; y <= 2025; y++) {
    const baseY = PROV_BASE[y]
    const rate = accRates[y]
    if (!baseY || !rate) continue
    
    const annualPay = baseY * avgIndex * 0.08 * 12
    totalAcc = totalAcc * (1 + rate) + annualPay
  }
  
  return totalAcc
}

console.log('=== 反向推算实际缴费指数 ===')
console.log('目标余额: 318353 元')
console.log('')

// 尝试不同的指数
const target = 318353
const testIndices = [1.0, 1.5, 1.8, 2.0, 2.2, 2.5, 3.0]

testIndices.forEach(idx => {
  const balance = calcWithIndex(idx)
  const diff = balance - target
  console.log(`指数 ${idx.toFixed(1)}: 余额 ${balance.toFixed(0)} 元, 差异 ${diff.toFixed(0)} 元`)
})

console.log('')
console.log('=== 结论 ===')
console.log('如果实际余额是31.8万，实际缴费指数大约在 1.8~2.0 之间')
console.log('（因为指数1.0 → 18.6万，指数2.0 → 37.1万）')
