// 验证 index-mini 云函数：直接调用云函数目录下的引擎 + 省份数据
// 模拟 index.js 的逻辑（不依赖 wx-server-sdk）
const path = require('path')
const CF_DIR = path.join(__dirname, '..', 'index-mini', 'cloudfunctions', 'calcIndex')
const { calculateIndex, inferIndexFromBalance } = require(path.join(CF_DIR, 'calcIndex.js'))
const PROVINCES = require(path.join(CF_DIR, 'provinces-data.js'))

console.log('省份数据包省份数:', Object.keys(PROVINCES).length)
if (Object.keys(PROVINCES).length !== 31) {
  console.error('❌ 省份数不为31，异常')
  process.exit(1)
}
const jilin = PROVINCES['jilin']
console.log('吉林社平数据点数:', Object.keys(jilin.avg_salary_history).length, '| name=', jilin.name)

// ── 正向：吉林 A 颗粒度（与 test-calcIndex 同源数据）──
const contributionA = [
  { year: 2020, months: 12, baseAvg: 4980.5 },
  { year: 2021, months: 12, baseAvg: 5450.3 },
  { year: 2022, months: 11, baseAvg: 5890.1 }
]
const fwd = calculateIndex({ provinceConfig: jilin, contribution: contributionA, granularity: 'A' })
console.log('\n[正向] 平均指数 =', fwd.avgIndex, '| 余额 =', fwd.accountBalance, '| 月数 =', fwd.totalMonths)
if (typeof fwd.avgIndex !== 'number' || isNaN(fwd.avgIndex)) {
  console.error('❌ 正向计算失败'); process.exit(1)
}

// ── 反推：吉林 C 颗粒度 + 已知余额 ──
// 用正向结果作为"已知余额"，反推应逼近原指数
const contributionC = { startYear: 2020, startMonth: 1, totalMonths: 35 }
const inf = inferIndexFromBalance({
  provinceConfig: jilin,
  contribution: contributionC,
  granularity: 'C',
  knownBalance: fwd.accountBalance
})
console.log('[反推] 推算指数 =', inf.inferredIndex, '| 计算余额 =', inf.calculatedBalance, '| 收敛 =', inf.converged)
// 注意：C 颗粒度无基数，反推会用均值估算，这里仅验证流程不报错

console.log('\n✅ index-mini 云函数逻辑验证通过')
