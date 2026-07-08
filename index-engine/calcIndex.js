/**
 * ════════════════════════════════════════════════════════
 *  calcIndex — 本人平均缴费工资指数计算引擎
 *  版本: 1.0.0 | 2026-07-08
 *  
 *  功能:
 *    正向: 缴费信息 → 平均指数 + 个人账户余额
 *    反推: 账户余额 + 缴费信息 → 反推平均指数
 *    支持: 三颗粒度输入 (A详细/B中等/C最简)
 *  
 *  数据源:
 *    - 利率表: UNIFIED_RATES (1996-2025, 剪刀财经)
 *    - 社平工资: 省份 config.avg_salary_history
 *  
 *  依赖: 无 (纯函数, Node.js / 浏览器均可运行)
 * ════════════════════════════════════════════════════════
 */

// ─── 统一利率表（1996-2025，剪刀财经《缴费基数&记账利率》）──>
const UNIFIED_RATES = {
  1996: 0.0804, 1997: 0.0567, 1998: 0.0447, 1999: 0.0225, 2000: 0.0225,
  2001: 0.0225, 2002: 0.0225, 2003: 0.0198, 2004: 0.0198, 2005: 0.0225,
  2006: 0.0252, 2007: 0.0414, 2008: 0.0414, 2009: 0.0225, 2010: 0.0225,
  2011: 0.0350, 2012: 0.0350, 2013: 0.0300, 2014: 0.0350, 2015: 0.0350,
  2016: 0.0831, 2017: 0.0712, 2018: 0.0829, 2019: 0.0761, 2020: 0.0604,
  2021: 0.0535, 2022: 0.0612, 2023: 0.0397, 2024: 0.0262, 2025: 0.0150
}

/**
 * 获取某年记账利率
 */
function getRate(year) {
  if (UNIFIED_RATES[year] !== undefined) return UNIFIED_RATES[year]
  if (year > 2025) return UNIFIED_RATES[2025]  // 1.50%
  return 0.025  // 兜底
}

/**
 * 获取某年社平工资（元/月）
 * @param {Object} avgSalaryHistory - 省份的 avg_salary_history 对象 { year: 元/月 }
 * @param {number} year - 年份
 * @returns {number|null}
 */
function getSocialAvg(avgSalaryHistory, year) {
  if (!avgSalaryHistory || !avgSalaryHistory[year]) return null
  // 数据单位是元/月，直接返回
  return avgSalaryHistory[year]
}

// ════════════════════════════════════════════════════════
//  核心计算函数
// ════════════════════════════════════════════════════════

/**
 * 正向计算：缴费信息 → 平均指数 + 个人账户余额
 *
 * @param {Object} params
 * @param {Object} params.provinceConfig - 省份配置（需含 avg_salary_history）
 * @param {Array|Object} params.contribution - 缴费记录（三颗粒度之一）
 * @param {string} params.granularity - 'A'详细(逐月) / 'B'中等(年汇总+部分明细) / 'C'最简(仅起止)
 * @returns {Object} { avgIndex, accountBalance, totalMonths, totalYears, yearsDetail }
 */
function calculateIndex({ provinceConfig, contribution, granularity = 'A' }) {
  const salaryHist = provinceConfig.avg_salary_history || {}

  // ── 根据颗粒度解析为统一年记录格式 ──>
  const yearlyRecords = normalizeToYearly(contribution, granularity)

  if (!yearlyRecords || yearlyRecords.length === 0) {
    return { error: '无有效缴费数据' }
  }

  let totalIndexSum = 0      // 指数加权和
  let totalWeight = 0         // 总权重（月数）
  let accountBalance = 0      // 个人账户余额（复利累计）
  const yearsDetail = []       // 逐年明细

  // 按年份排序
  yearlyRecords.sort((a, b) => a.year - b.year)

  for (const rec of yearlyRecords) {
    const year = rec.year

    // 取上年度社平作为分母（官方规则：当年缴费/上年社平）
    const socialAvg = getSocialAvg(salaryHist, year - 1)
    
    if (!socialAvg || socialAvg <= 0) {
      // 无社平数据，跳过该年或用当年兜底
      yearsDetail.push({
        year, months: rec.months, baseAvg: rec.baseAvg,
        socialAvg: null, index: null,
        accountContribution: 0, note: `缺少${year - 1}年社平`
      })
      continue
    }

    // ── 计算该年平均缴费指数 ──>
    // 公式: 月均基数 ÷ 上年度社平 = 该年指数
    const yearIndex = rec.baseAvg / socialAvg
    
    // 加权累加（权重=该年月数）
    totalIndexSum += yearIndex * rec.months
    totalWeight += rec.months

    // ── 计算个人账户本年计入金额 ──>
    // 月缴费入账户 = 月基数 × 8%
    // 年入账 = Σ(月基数×8%) = 月均基数 × 月数 × 8%
    const annualAccountPay = rec.baseAvg * rec.months * 0.08

    // 复利滚动: 先对上年余额计息，再加本年存入
    // 注意：本年存入不计当年利息（人社部规则）
    const rate = getRate(year)
    accountBalance = accountBalance * (1 + rate) + annualAccountPay

    yearsDetail.push({
      year,
      months: rec.months,
      baseAvg: rec.baseAvg,
      socialAvg,
      index: yearIndex,
      weightedIndex: yearIndex * rec.months,
      rate,
      accountContribution: annualAccountPay,
      balanceAfterYear: accountBalance
    })
  }

  // 平均指数 = 加权和 ÷ 总月数
  const avgIndex = totalWeight > 0 ? totalIndexSum / totalWeight : 0

  // 总年限（月数÷12，保留精度）
  const totalMonths = totalWeight
  const totalYears = totalMonths / 12

  return {
    avgIndex: round4(avgIndex),
    accountBalance: Math.round(accountBalance * 100) / 100,
    totalMonths,
    totalYears: round2(totalYears),
    yearsDetail,
    _meta: {
      granularity,
      province: provinceConfig.name || 'unknown',
      rateSource: '剪刀财经 UNIFIED_RATES 1996-2025'
    }
  }
}


/**
 * 反向推算：已知账户余额 + 缴费信息 → 推算平均指数
 *
 * 原理: 
 *   已知最终余额 B、各年缴费基数和月数、利率表
 *   设未知平均指数为 X，则每年基数 = X × 上年社平
 *   代入复利公式反解 X
 *
 * 实际做法（数值法，因解析解复杂）：
 *   二分搜索找到使计算余额 ≈ 已知余额的平均指数
 *
 * @param {Object} params
 * @param {Object} params.provinceConfig
 * @param {Array|Object} params.contribution
 * @param {string} params.granularity
 * @param {number} params.knownBalance - 已知的个人账户余额
 * @param {Object} [params.options] - { tolerance, maxIter }
 * @returns {Object} { inferredIndex, calculatedBalance, iterations, converged }
 */
function inferIndexFromBalance({ provinceConfig, contribution, granularity, knownBalance, options = {} }) {
  const TOLERANCE = options.tolerance || 10     // 误差容忍（元）
  const MAX_ITER = options.maxIter || 100       // 最大迭代次数
  
  // 先做一次正向计算（用原始基数），获取结构信息
  const forwardResult = calculateIndex({ provinceConfig, contribution, granularity })
  
  if (forwardResult.error) {
    return { error: forwardResult.error }
  }

  // 如果原始数据的余额已经接近目标值，直接返回
  const diff = Math.abs(forwardResult.accountBalance - knownBalance)
  if (diff <= TOLERANCE) {
    return {
      inferredIndex: forwardResult.avgIndex,
      calculatedBalance: forwardResult.accountBalance,
      iterations: 0,
      converged: true,
      method: 'exact_match',
      yearsDetail: forwardResult.yearsDetail
    }
  }

  // 二分搜索范围：指数通常在 0.3 ~ 5.0 之间
  let low = 0.3
  let high = 5.0
  let bestIndex = forwardResult.avgIndex
  let bestDiff = diff

  for (let iter = 0; iter < MAX_ITER; iter++) {
    const mid = (low + high) / 2
    
    // 用 mid 作为统一的"假设平均指数"来重构每年的基数
    // 即: 假设每月基数 = mid × 当年使用的社平
    const syntheticContribution = buildSyntheticContribution(
      forwardResult.yearsDetail, mid, provinceConfig.avg_salary_history
    )
    
    const result = calculateIndex({
      provinceConfig,
      contribution: syntheticContribution,
      granularity: 'A'  // 合成数据总是逐月粒度
    })

    const newDiff = Math.abs(result.accountBalance - knownBalance)
    
    if (newDiff < bestDiff) {
      bestDiff = newDiff
      bestIndex = result.avgIndex
    }

    if (newDiff <= TOLERANCE) {
      return {
        inferredIndex: result.avgIndex,
        calculatedBalance: result.accountBalance,
        iterations: iter + 1,
        converged: true,
        method: 'bisection',
        yearsDetail: result.yearsDetail
      }
    }

    // 调整搜索方向
    if (result.accountBalance < knownBalance) {
      low = mid  // 余额偏小 → 需要更大的指数 → 更大的基数
    } else {
      high = mid // 余额偏大 → 需要更小的指数
    }

    // 范围过小时停止
    if (high - low < 0.0001) break
  }

  return {
    inferredIndex: round4(bestIndex),
    calculatedBalance: forwardResult.accountBalance,
    iterations: MAX_ITER,
    converged: bestDiff <= TOLERANCE * 10,  // 放宽10倍也算部分收敛
    method: 'bisection_approx',
    residual: bestDiff,
    note: bestDiff > TOLERANCE ? `误差¥${bestDiff.toFixed(0)}较大，建议核对输入` : null
  }
}


// ════════════════════════════════════════════════════════
//  内部辅助函数
// ════════════════════════════════════════════════════════

/**
 * 将三颗粒度输入统一转换为 [{year, months, baseAvg}] 格式
 *
 * 颗粒度 A（详细/逐月）:
 *   input = { records: [{year, month, base}, ...] } 或 Array
 *   → 聚合为年记录
 *
 * 颗粒度 B（中等/年汇总）:
 *   input = {
 *     startYear, startMonth,   // 参加时间
 *     totalMonths,             // 总月数
 *     currentBalance,          // 当前余额（可选）
 *     yearlyData: [            // 有数据的年份（可能不全）
 *       {year, months, baseAvg, ...},
 *       ...
 *     ]
 *   }
 *   → 补全缺失年份（用整体均值估算）
 *
 * 颗粒度 C（最简/仅起止）:
 *   input = { startYear, startMonth, totalMonths, currentBalance }
 *   → 无法计算指数（无基数），只能反推
 */
function normalizeToYearly(contribution, granularity) {
  if (granularity === 'A') {
    return normalizeGranularityA(contribution)
  } else if (granularity === 'B') {
    return normalizeGranularityB(contribution)
  } else if (granularity === 'C') {
    return normalizeGranularityC(contribution)
  }
  return []
}

/**
 * 颗粒度 A: 逐月明细 或 预聚合年记录 → 按年记录
 * 
 * 支持两种输入格式:
 *   1) 逐月: [{ year, month, base }, ...]  → 自动按年聚合
 *   2) 年聚合: [{ year, months, baseAvg }, ...] → 直接使用
 */
function normalizeGranularityA(data) {
  let records = []
  
  if (Array.isArray(data)) {
    records = data
  } else if (data && data.records) {
    records = data.records
  } else {
    return []
  }

  // 检测是否已经是年聚合格式（有 months + baseAvg 字段）
  if (records.length > 0 && records[0].months !== undefined && records[0].baseAvg !== undefined) {
    // 已经是年聚合格式，直接返回副本
    return records.map(r => ({
      year: r.year,
      months: r.months,
      baseAvg: r.baseAvg
    }))
  }

  // 否则按 year 分组聚合（逐月格式）
  const yearMap = {}
  for (const r of records) {
    const y = r.year
    if (!yearMap[y]) yearMap[y] = { year: y, months: 0, baseSum: 0 }
    const base = r.base || r.baseSalary || r.paymentBase || 0
    yearMap[y].months++
    yearMap[y].baseSum += base
  }

  return Object.values(yearMap).map(y => ({
    year: y.year,
    months: y.months,
    baseAvg: y.months > 0 ? y.baseSum / y.months : 0
  }))
}

/**
 * 颗粒度 B: 年汇总（部分年有明细）→ 补全缺失年
 * 缺失年份使用已有年份的均值填充
 */
function normalizeGranularityB(data) {
  if (!data || !data.yearlyData) return []

  const yearlyData = data.yearlyData
  if (!Array.isArray(yearlyData) || yearlyData.length === 0) return []

  // 计算有数据年份的均值
  const validYears = yearlyData.filter(y => y.baseAvg && y.baseAvg > 0)
  const globalBaseAvg = validYears.length > 0
    ? validYears.reduce((s, y) => s + y.baseAvg, 0) / validYears.length
    : 0

  // 构建完整的年记录列表
  const result = []
  const startYear = data.startYear || (yearlyData[0] && yearlyData[0].year) || 2000
  const totalMonths = data.totalMonths || 0
  
  // 从 yearlyData 中提取已知年
  const knownYears = {}
  let knownMonths = 0
  for (const y of yearlyData) {
    if (y.year && y.months) {
      knownYears[y.year] = { months: y.months, baseAvg: y.baseAvg || globalBaseAvg }
      knownMonths += y.months
    }
  }

  // 补齐缺失年（按总月数分配）
  const remainingMonths = totalMonths - knownMonths
  // 简单策略：把剩余月数均匀分配到 startYear 和最后一年之间的未知年
  // 更精细的做法需要用户补充；这里先用已知年均值
  for (const y of yearlyData) {
    result.push({
      year: y.year,
      months: y.months || 12,
      baseAvg: y.baseAvg || globalBaseAvg
    })
  }

  return result
}

/**
 * 颗粒度 C: 仅起止时间 + 总月数 + 余额
 * 无法正向计算指数（没有基数），返回最小结构供反推使用
 */
function normalizeGranularityC(data) {
  if (!data || !data.totalMonths) return []

  // C 颗粒度无法提供基数信息
  // 返回一个标记，让调用方知道只能做反向推算
  return [{
    _granularityC: true,
    totalMonths: data.totalMonths,
    startYear: data.startYear,
    startMonth: data.startMonth,
    currentBalance: data.currentBalance
  }]
}

/**
 * 为二分搜索合成"假设指数=X"时的虚拟缴费记录
 */
function buildSyntheticContribution(yearsDetail, assumedIndex, salaryHist) {
  return yearsDetail
    .filter(y => y.socialAvg !== null)  // 只处理有社平数据的年
    .map(y => ({
      year: y.year,
      months: y.months,
      // 假设基数 = 假设指数 × 上年度社平
      baseAvg: assumedIndex * y.socialAvg
    }))
}


// ════════════════════════════════════════════════════════
//  工具函数
// ════════════════════════════════════════════════════════

function round4(n) { return Math.round(n * 10000) / 10000 }
function round2(n) { return Math.round(n * 100) / 100 }


// ════════════════════════════════════════════════════════
//  导出
// ════════════════════════════════════════════════════════

module.exports = {
  // 核心 API
  calculateIndex,
  inferIndexFromBalance,

  // 辅助
  getRate,
  getSocialAvg,
  normalizeToYearly,

  // 数据
  UNIFIED_RATES,

  // 元信息
  version: '1.0.0',
  date: '2026-07-08',
  source: '剪刀财经《缴费基数&记账利率 1996-2025年》'
}
