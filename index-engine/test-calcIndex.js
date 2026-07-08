/**
 * calcIndex 引擎单测 — 吉林样本（Excel 296行逐月数据）
 * 
 * 验证:
 *   1) 正向计算：逐月明细 → 平均指数 + 账户余额
 *   2) 反向推算：已知余额 → 反推平均指数
 *   3) 与手工校准值比对（02-校准报告.md 的结论）
 */

const fs = require('fs')
const path = require('path')

// 加载引擎
const { calculateIndex, inferIndexFromBalance, UNIFIED_RATES } = require('../index-engine/calcIndex.js')

// ─── 加载吉林省份配置 ────────────────────────────────>
const jilinPath = path.join(__dirname, '..', 'provinces', 'jilin.json')
const jilinConfig = JSON.parse(fs.readFileSync(jilinPath, 'utf-8'))

console.log('═'.repeat(70))
console.log('calcIndex 引擎单测 — 吉林样本验证')
console.log('═'.repeat(70))
console.log(`省份: ${jilinConfig.name}`)
console.log(`社平年数: ${Object.keys(jilinConfig.avg_salary_history || {}).length}`)
console.log(`利率表年数: ${Object.keys(UNIFIED_RATES).length} (1996-2025)`)
console.log()

// ─── 吉林样本：从 Excel 提取的聚合数据（真实值）───────────
// 数据来源: 个人缴费信息查询.xls（吉林长春，296行逐月，295月/25年）
// 聚合方式：按费款所属期(YYYYMM)年份分组，月均基数 = Σ基数 ÷ 月数

const jilinYearlyData = [
  // { year, months, baseAvg(元/月) } — 从Excel逐月数据聚合
  { year: 1998, months: 6,  baseAvg: 353.0 },
  { year: 1999, months: 12, baseAvg: 353.0 },
  { year: 2000, months: 12, baseAvg: 436.8 },
  { year: 2001, months: 12, baseAvg: 2154.0 },
  { year: 2002, months: 12, baseAvg: 488.0 },
  { year: 2003, months: 12, baseAvg: 589.0 },
  { year: 2004, months: 13, baseAvg: 1500.0 },   // 含补缴(13月)
  { year: 2005, months: 12, baseAvg: 1500.0 },
  { year: 2006, months: 12, baseAvg: 1500.0 },
  { year: 2007, months: 12, baseAvg: 2200.0 },
  { year: 2008, months: 12, baseAvg: 2183.3 },
  { year: 2009, months: 12, baseAvg: 1598.7 },
  { year: 2010, months: 12, baseAvg: 1522.0 },
  { year: 2011, months: 12, baseAvg: 1786.0 },
  { year: 2012, months: 12, baseAvg: 2074.0 },
  { year: 2013, months: 12, baseAvg: 10941.0 },
  { year: 2014, months: 12, baseAvg: 11174.0 },
  { year: 2015, months: 12, baseAvg: 8300.4 },
  { year: 2016, months: 12, baseAvg: 11352.0 },
  { year: 2017, months: 12, baseAvg: 10857.6 },
  { year: 2018, months: 12, baseAvg: 14714.6 },
  { year: 2019, months: 12, baseAvg: 15151.2 },
  { year: 2020, months: 13, baseAvg: 14475.0 },   // 含补缴(13月)
  { year: 2021, months: 12, baseAvg: 16639.8 },
  { year: 2022, months: 11, baseAvg: 18533.0 },   // 到11月
]

// ═══════════════════════════════════════════════════════
//  测试1: 正向计算
// ═══════════════════════════════════════════════════════
console.log('─'.repeat(70))
console.log('测试1: 正向计算 (颗粒度A — 逐年聚合)')
console.log('─'.repeat(70))

const result = calculateIndex({
  provinceConfig: jilinConfig,
  contribution: jilinYearlyData,
  granularity: 'A'
})

if (result.error) {
  console.log(`❌ 错误: ${result.error}`)
  process.exit(1)
}

console.log()
console.log('📊 计算结果:')
console.log(`   平均缴费工资指数: ${result.avgIndex}`)
console.log(`   个人账户余额:     ¥${result.accountBalance.toLocaleString()}`)
console.log(`   累计缴费月数:     ${result.totalMonths} 月 (${result.totalYears.toFixed(2)} 年)`)

console.log()
console.log('📋 逐年明细 (前5年 + 最后3年):')
const detail = result.yearsDetail
for (let i = 0; i < Math.min(5, detail.length); i++) {
  const d = detail[i]
  console.log(
    `   ${d.year} | ${d.months}月 | 基数¥${d.baseAvg.toFixed(0)} | ` +
    `社平¥${(d.socialAvg || 0).toFixed(0)} | ` +
    `指数${(d.index || 0).toFixed(3)} | 利率${((d.rate || 0) * 100).toFixed(2)}% | ` +
    `余额¥${(d.balanceAfterYear || 0).toFixed(2)}`
  )
}
console.log('   ...')
for (let i = Math.max(5, detail.length - 3); i < detail.length; i++) {
  const d = detail[i]
  console.log(
    `   ${d.year} | ${d.months}月 | 基数¥${d.baseAvg.toFixed(0)} | ` +
    `社平¥${(d.socialAvg || 0).toFixed(0)} | ` +
    `指数${(d.index || 0).toFixed(3)} | 利率${((d.rate || 0) * 100).toFixed(2)}% | ` +
    `余额¥${(d.balanceAfterYear || 0).toFixed(2)}`
  )
}

// 校验关键节点值
console.log()
console.log('🔍 关键年份校验:')
const y1998 = detail.find(d => d.year === 1998)
const y2022 = detail.find(d => d.year === 2022)
if (y1998) {
  const expected1998 = 0.647  // 来自02-校准报告.md
  const ok1998 = Math.abs(y1998.index - expected1998) < 0.05
  console.log(`   1998年指数: ${y1998.index.toFixed(3)} (期望≈${expected1998}) ${ok1998 ? '✅' : '❌'}`)
}
if (y2022) {
  const expected2022 = 2.785  // 来自02-校准报告.md
  const ok2022 = Math.abs(y2022.index - expected2022) < 0.05
  console.log(`   2022年指数: ${y2022.index.toFixed(3)} (期望≈${expected2022}) ${ok2022 ? '✅' : '❌'}`)
}

// ═══════════════════════════════════════════════════════
//  测试2: 反向推算
// ═══════════════════════════════════════════════════════
console.log()
console.log('─'.repeat(70))
console.log('测试2: 反向推算 (已知余额 → 反推指数)')
console.log('─'.repeat(70))

// 用正向计算得到的"真实余额"作为已知值，反推应得到相近指数
const knownBalance = result.accountBalance
console.log(`   已知余额: ¥${knownBalance.toLocaleString()} (来自正向计算)`)
console.log()

const inferred = inferIndexFromBalance({
  provinceConfig: jilinConfig,
  contribution: jilinYearlyData,
  granularity: 'A',
  knownBalance: knownBalance,
  options: { tolerance: 1, maxIter: 50 }
})

console.log('📊 反推结果:')
console.log(`   推算指数:     ${inferred.inferredIndex}`)
console.log(`   原始指数:     ${result.avgIndex}`)
console.log(`   差异:         ${Math.abs((inferred.inferredIndex || 0) - result.avgIndex).toFixed(4)}`)
console.log(`   迭代次数:     ${inferred.iterations}`)
console.log(`   收敛:         ${inferred.converged ? '✅' : '❌'} ${inferred.method}`)

if (!inferred.converged && inferred.note) {
  console.log(`   备注:         ${inferred.note}`)
}

// ═══════════════════════════════════════════════════════
//  测试3: 利率表完整性
// ═══════════════════════════════════════════════════════
console.log()
console.log('─'.repeat(70))
console.log('测试3: 利率表完整性检查')
console.log('─'.repeat(70))

let rateGaps = []
for (let y = 1996; y <= 2025; y++) {
  if (UNIFIED_RATES[y] === undefined) {
    rateGaps.push(y)
  }
}
if (rateGaps.length === 0) {
  console.log(`   ✅ 1996-2025 共30年利率完整无缺失`)
} else {
  console.log(`   ❌ 缺失年份: ${rateGaps.join(', ')}`)
}

// 显示首尾几年
console.log()
console.log('   利率采样:')
;[1996, 2005, 2010, 2015, 2016, 2020, 2021, 2022, 2025].forEach(y => {
  console.log(`   ${y}: ${(UNIFIED_RATES[y] * 100).toFixed(2)}%`)
})

// ═══════════════════════════════════════════════════════
//  总结
// ═══════════════════════════════════════════════════════
console.log()
console.log('═'.repeat(70))
console.log('✅ 单测完成')
console.log('═'.repeat(70))
