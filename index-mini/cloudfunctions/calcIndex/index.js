// 云函数入口：calcIndex
// 统一入口：用户填什么信息就出什么结果，不暴露颗粒度/正反向概念
//   填了"当前月缴费基数" → 以「当前基数÷当前社平」求当下指数，作为平均缴费指数，
//                            反推历年基数并算个人账户余额（正向估算）
//   填了账户余额 → 反推平均指数
//   都填 → 两者都给，互为校验
//   展开逐年明细 → 用真实逐年值（最准，优先级最高）
const cloud = require('wx-server-sdk')
const { calculateIndex, inferIndexFromBalance } = require('./calcIndex')
const PROVINCES = require('./provinces-data')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

/**
 * 求缴费期结束年（最后一个月所在年份）
 */
function endYearOf(startYear, startMonth, totalMonths) {
  let remaining = totalMonths
  let m = startMonth
  let y = startYear
  while (remaining > 0) {
    const monthsThisYear = 13 - m
    const mm = Math.min(remaining, monthsThisYear > 0 ? monthsThisYear : 12)
    remaining -= mm
    if (remaining > 0) { y += 1; m = 1 }
  }
  return y
}

/**
 * 用「当前月缴费基数」换算平均缴费指数，并反推历年基数（A 结构）
 *
 * 逻辑（用户世界认知）：
 *   普通人只知道「现在工资多少钱」，不知道历史每年基数。
 *   1) 用当前基数 ÷ 缴费期最近年的「上年度社平」 = 当下指数 (currentIndex)
 *   2) 把 currentIndex 当作平均缴费指数（假设历年按此比例缴费）
 *   3) 反推历史每年基数 = 该年上年度社平 × currentIndex
 *   4) 由逐年基数算个人账户余额（含息）
 *
 * 例：startYear=1998, startMonth=7, totalMonths=295, currentBase=5000
 *   结束年=2023 → 取 2022 社平 → currentIndex=5000/2022社平
 *   → 逐年 baseAvg = 各年社平 × currentIndex
 */
function buildCurrentBaseContribution(startYear, startMonth, totalMonths, currentBase, salaryHist) {
  const endY = endYearOf(startYear, startMonth, totalMonths)
  // 找结束年的「上年度社平」（往前找有数据的年份）
  let baseYear = endY - 1
  while (baseYear >= 1990 && !(salaryHist[baseYear] > 0)) baseYear--
  const baseSalary = salaryHist[baseYear]
  if (!baseSalary) {
    return { error: `缺少社平数据，无法用当前工资换算（需要 ${baseYear} 年附近的社平工资）` }
  }
  const currentIndex = currentBase / baseSalary

  let remaining = totalMonths
  let y = startYear
  let m = startMonth
  const out = []
  while (remaining > 0) {
    const monthsThisYear = 13 - m
    const mm = Math.min(remaining, monthsThisYear > 0 ? monthsThisYear : 12)
    const prev = salaryHist[y - 1]  // 该年上年度社平
    out.push({ year: y, months: mm, baseAvg: prev ? prev * currentIndex : null })
    remaining -= mm
    y += 1
    m = 1
  }
  return { contribution: out, currentIndex, baseYear, baseSalary }
}

exports.main = async (event, context) => {
  const {
    province,
    startYear,
    startMonth,
    totalMonths,
    monthlyBase,          // 当前月缴费基数（按现在工资填）
    yearlyData,           // 逐年明细数组 [{year,months,baseAvg}]
    knownBalance          // 当前账户余额（反推用）
  } = event

  if (!province || !PROVINCES[province]) {
    return { success: false, error: '未知省份或省份缺失: ' + province }
  }
  const provinceConfig = PROVINCES[province]

  const sy = Number(startYear) || 0
  const sm = Number(startMonth) || 1
  const tm = Number(totalMonths) || 0
  const mb = Number(monthlyBase) || 0
  const kb = Number(knownBalance) || 0
  const hasDetail = Array.isArray(yearlyData) && yearlyData.length > 0

  const result = { mode: null, data: {} }

  // ── 正向：有基数信息（逐年明细 优先；否则用当前基数反推）──
  if (mb > 0 || hasDetail) {
    let contribution
    let source
    let currentIndex = null
    if (hasDetail) {
      contribution = yearlyData
      source = 'yearly'
    } else {
      if (tm <= 0) {
        return { success: false, error: '已填写当前月缴费基数，请同时填写累计缴费月数' }
      }
      const built = buildCurrentBaseContribution(sy, sm, tm, mb, provinceConfig.avg_salary_history)
      if (built.error) return { success: false, error: built.error }
      contribution = built.contribution
      source = 'current'
      currentIndex = built.currentIndex
    }
    const fwd = calculateIndex({ provinceConfig, contribution, granularity: 'A' })
    if (fwd.error) return { success: false, error: fwd.error }
    fwd._source = source
    fwd._currentIndex = currentIndex  // 当下指数（仅 current 模式有）
    result.data.forward = fwd
    result.mode = 'forward'
  }

  // ── 反推：有账户余额 ──
  if (kb > 0) {
    if (tm <= 0) {
      return { success: false, error: '已填写账户余额，请同时填写累计缴费月数' }
    }
    const inf = inferIndexFromBalance({
      provinceConfig,
      contribution: { startYear: sy, startMonth: sm, totalMonths: tm },
      granularity: 'C',
      knownBalance: kb
    })
    if (inf.error) return { success: false, error: inf.error }
    result.data.infer = inf
    result.mode = result.mode === 'forward' ? 'both' : 'infer'
  }

  if (!result.mode) {
    return { success: false, error: '请至少填写「当前月缴费基数」或「账户余额」中的一项' }
  }

  return { success: true, mode: result.mode, data: result.data }
}
