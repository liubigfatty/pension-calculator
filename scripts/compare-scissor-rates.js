/**
 * 剪刀财经《缴费基数&记账利率 1996-2025年》 vs 引擎数据 逐行比对
 * 
 * 数据来源：用户提供的截图（剪刀财经第282集）
 * 截图中的"个人账户记账利率"列为权威基准
 */

// ─── 剪刀财经截图数据（从图中手工提取）──────────────>
const SCISSOR_RATES = {
  1996: 0.0804, 1997: 0.0567, 1998: 0.0447, 1999: 0.0225, 2000: 0.0225,
  2001: 0.0225, 2002: 0.0225, 2003: 0.0198, 2004: 0.0198, 2005: 0.0225,
  2006: 0.0252, 2007: 0.0414, 2008: 0.0414, 2009: 0.0225, 2010: 0.0225,
  2011: 0.0350, 2012: 0.0350, 2013: 0.0300, 2014: 0.0350, 2015: 0.0350,
  2016: 0.0831, 2017: 0.0712, 2018: 0.0829, 2019: 0.0761, 2020: 0.0604,
  2021: 0.0535,  // ⚠️ 注意！
  2022: 0.0612,  // ⚠️ 注意！
  2023: 0.0397, 2024: 0.0262, 2025: 0.0150
}

// ─── 引擎当前数据 ───>
const NATIONAL_PRE2016 = {
  1996: 0.0804, 1997: 0.0567, 1998: 0.0447, 1999: 0.0225, 2000: 0.0225,
  2001: 0.0225, 2002: 0.0225, 2003: 0.0198, 2004: 0.0198, 2005: 0.0225,
  2006: 0.0252, 2007: 0.0414, 2008: 0.0414, 2009: 0.0225, 2010: 0.0225,
  2011: 0.0350, 2012: 0.0350, 2013: 0.0300, 2014: 0.0350, 2015: 0.0350
}

const NATIONAL_2016 = {
  2016: 0.0831, 2017: 0.0712, 2018: 0.0829, 2019: 0.0761, 2020: 0.0604,
  2021: 0.0669,  // ⚠️ 引擎当前值
  2022: 0.0397,  // ⚠️ 引擎当前值
  2023: 0.0397, 2024: 0.0262, 2025: 0.0150
}

// ─── 逐行比对 ───>
console.log('═'.repeat(80))
console.log('剪刀财经截图 vs 引擎数据 — 逐行比对报告')
console.log('═'.repeat(80))
console.log()

let matchCount = 0, diffCount = 0, diffList = []

const allYears = []
for (let y = 1996; y <= 2025; y++) allYears.push(y)

console.log('┌──────┬───────────────┬───────────────┬───────────────┬──────────┐')
console.log('│ 年份 │ 剪刀财经(基准) │ 引擎 pre2016  │ 引擎 2016+    │ 状态     │')
console.log('├──────┼───────────────┼───────────────┼───────────────┼──────────┤')

for (const year of allYears) {
  const scissor = SCISSOR_RATES[year]
  const pre16 = NATIONAL_PRE2016[year]
  const post16 = NATIONAL_2016[year]
  
  let engineVal = null
  let engineSource = ''
  
  if (year < 2016 && pre16 !== undefined) {
    engineVal = pre16
    engineSource = 'pre2016'
  } else if (year >= 2016 && post16 !== undefined) {
    engineVal = post16
    engineSource = '2016+'
  }
  
  const match = Math.abs((engineVal || 0) - scissor) < 0.0001
  const status = match ? '✅' : '❌ 差异'
  
  if (match) matchCount++
  else {
    diffCount++
    diffList.push({ year, scissor, engineVal, engineSource })
  }
  
  console.log(
    `│ ${year} │ ${(scissor * 100).toFixed(2).padStart(10)}%  │ ` +
    ((pre16 || 0) * 100).toFixed(2).padStart(10) + '%  │ ' +
    ((post16 || 0) * 100).toFixed(2).padStart(10) + '%  │ ' +
    `${status}     `
  )
}
console.log('└──────┴───────────────┴───────────────┴───────────────┴──────────┘')
console.log()

console.log(`总计: ${matchCount} 年匹配 / ${diffCount} 年有差异`)
console.log()

if (diffList.length > 0) {
  console.log('⚠️  差异详情:')
  console.log('─'.repeat(60))
  for (const d of diffList) {
    console.log(
      `  ${d.year}: 剪刀财经=${(d.scissor * 100).toFixed(2)}%, ` +
      `引擎(${d.engineSource})=${(d.engineVal * 100).toFixed(2)}%, ` +
      `差值=${((d.scissor - d.engineVal) * 100).toFixed(2)}%`
    )
  }
  console.log()
}

// ─── 合并后的完整干净表（用于新引擎）────────────────────>
console.log('═'.repeat(80))
console.log('合并后的完整利率表（剪刀财经为基准，1996-2025）')
console.log('═'.repeat(80))

// 用剪刀财经数据作为唯一真相源
const UNIFIED_RATES = { ...SCISSOR_RATES }

console.log()
for (const [year, rate] of Object.entries(UNIFIED_RATES)) {
  console.log(`  ${year}: ${(rate * 100).toFixed(2)}%`)
}
